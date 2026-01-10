import json
import os
from datetime import timedelta
from pathlib import Path
from typing import Annotated
from uuid import uuid4

import redis
import stripe
from fastapi import Depends, FastAPI, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from . import models, security
from .db import check_db_connection, create_db_and_tables, get_session
from .settings import settings

# Configure Stripe
stripe.api_key = settings.stripe_secret_key


app = FastAPI(title="POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "*"],  # Allow public menu access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory for product images
UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 2 * 1024 * 1024  # 2MB

# Mount static files for serving images
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Redis client for pub/sub
redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis | None:
    global redis_client
    if redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            redis_client = redis.from_url(redis_url)
            redis_client.ping()
        except Exception:
            redis_client = None
    return redis_client


def publish_order_update(tenant_id: int, order_data: dict) -> None:
    """Publish order update to Redis for WebSocket bridge."""
    r = get_redis()
    if r:
        try:
            r.publish(f"orders:{tenant_id}", json.dumps(order_data))
        except Exception:
            pass  # Fail silently if Redis unavailable


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> dict:
    check_db_connection()
    return {"status": "ok"}


# ============ AUTH ============

@app.post("/register")
def register(
    tenant_name: str,
    email: str,
    password: str,
    full_name: str | None = None,
    session: Session = Depends(get_session)
) -> dict:
    existing_user = session.exec(select(models.User).where(models.User.email == email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    tenant = models.Tenant(name=tenant_name)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    hashed_password = security.get_password_hash(password)
    user = models.User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        tenant_id=tenant.id
    )
    session.add(user)
    session.commit()
    
    return {"status": "created", "tenant_id": tenant.id, "email": email}


@app.post("/token")
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
) -> dict:
    statement = select(models.User).where(models.User.email == form_data.username)
    user = session.exec(statement).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(
        data={"sub": user.email, "tenant_id": user.tenant_id},
        expires_delta=security.timedelta(minutes=settings.access_token_expire_minutes)
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ============ PRODUCTS ============

@app.get("/products")
def list_products(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> list[models.Product]:
    return session.exec(select(models.Product).where(models.Product.tenant_id == current_user.tenant_id)).all()


@app.post("/products")
def create_product(
    product: models.Product,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> models.Product:
    product.tenant_id = current_user.tenant_id
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@app.put("/products/{product_id}")
def update_product(
    product_id: int,
    product_update: models.ProductUpdate,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> models.Product:
    product = session.exec(
        select(models.Product).where(
            models.Product.id == product_id,
            models.Product.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product_update.name is not None:
        product.name = product_update.name
    if product_update.price_cents is not None:
        product.price_cents = product_update.price_cents
    if product_update.ingredients is not None:
        product.ingredients = product_update.ingredients
    
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@app.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> dict:
    product = session.exec(
        select(models.Product).where(
            models.Product.id == product_id,
            models.Product.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    session.delete(product)
    session.commit()
    return {"status": "deleted", "id": product_id}


@app.post("/products/{product_id}/image")
async def upload_product_image(
    product_id: int,
    file: Annotated[UploadFile, File()],
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> models.Product:
    """Upload an image for a product. Validates file type and size."""
    product = session.exec(
        select(models.Product).where(
            models.Product.id == product_id,
            models.Product.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Validate content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
        )
    
    # Read file and check size
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_IMAGE_SIZE // (1024*1024)}MB"
        )
    
    # Create tenant upload directory
    tenant_dir = UPLOADS_DIR / str(current_user.tenant_id) / "products"
    tenant_dir.mkdir(parents=True, exist_ok=True)
    
    # Delete old image if exists
    if product.image_filename:
        old_path = tenant_dir / product.image_filename
        if old_path.exists():
            old_path.unlink()
    
    # Generate unique filename
    ext = Path(file.filename or "image.jpg").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"
    new_filename = f"{uuid4()}{ext}"
    
    # Save file
    file_path = tenant_dir / new_filename
    file_path.write_bytes(contents)
    
    # Update product
    product.image_filename = new_filename
    session.add(product)
    session.commit()
    session.refresh(product)
    
    return product


# ============ TABLES ============

@app.get("/tables")
def list_tables(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> list[models.Table]:
    return session.exec(select(models.Table).where(models.Table.tenant_id == current_user.tenant_id)).all()


@app.post("/tables")
def create_table(
    table_data: models.TableCreate,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> models.Table:
    table = models.Table(name=table_data.name, tenant_id=current_user.tenant_id)
    session.add(table)
    session.commit()
    session.refresh(table)
    return table


@app.delete("/tables/{table_id}")
def delete_table(
    table_id: int,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> dict:
    table = session.exec(
        select(models.Table).where(
            models.Table.id == table_id,
            models.Table.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    session.delete(table)
    session.commit()
    return {"status": "deleted", "id": table_id}


# ============ PUBLIC MENU ============

@app.get("/menu/{table_token}")
def get_menu(
    table_token: str,
    session: Session = Depends(get_session)
) -> dict:
    """Public endpoint - get menu for a table by its token."""
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    products = session.exec(
        select(models.Product).where(models.Product.tenant_id == table.tenant_id)
    ).all()
    
    tenant = session.exec(select(models.Tenant).where(models.Tenant.id == table.tenant_id)).first()
    
    return {
        "table_name": table.name,
        "table_id": table.id,
        "tenant_id": table.tenant_id,  # For WebSocket connection
        "tenant_name": tenant.name if tenant else "Unknown",
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "price_cents": p.price_cents,
                "image_filename": p.image_filename,
                "tenant_id": p.tenant_id,
                "ingredients": p.ingredients,
            }
            for p in products
        ],
    }


@app.get("/menu/{table_token}/order")
def get_current_order(
    table_token: str,
    session: Session = Depends(get_session)
) -> dict:
    """Public endpoint - get current active order for a table (if any)."""
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Find active order: not paid AND no [PAID:] in notes
    potential_orders = session.exec(
        select(models.Order).where(
            models.Order.table_id == table.id,
            models.Order.status != "paid"
        ).order_by(models.Order.created_at.desc())
    ).all()
    
    # Filter out orders with payment confirmation in notes
    active_order = None
    for order in potential_orders:
        if "[PAID:" not in (order.notes or ""):
            active_order = order
            break
    
    if not active_order:
        return {"order": None}
    
    # Get order items
    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == active_order.id)
    ).all()
    
    return {
        "order": {
            "id": active_order.id,
            "status": active_order.status.value if hasattr(active_order.status, 'value') else str(active_order.status),
            "notes": active_order.notes,
            "created_at": active_order.created_at.isoformat(),
            "items": [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price_cents": item.price_cents,
                    "notes": item.notes
                }
                for item in items
            ],
            "total_cents": sum(item.price_cents * item.quantity for item in items)
        }
    }


@app.post("/menu/{table_token}/order")
def create_order(
    table_token: str,
    order_data: models.OrderCreate,
    session: Session = Depends(get_session)
) -> dict:
    """Public endpoint - create or add to order for a table."""
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")
    
    # DEBUG: Log all orders for this table
    all_orders = session.exec(
        select(models.Order).where(models.Order.table_id == table.id)
    ).all()
    print(f"\n{'='*60}")
    print(f"[DEBUG] POST /menu/{table_token}/order")
    print(f"[DEBUG] Table: id={table.id}, name={table.name}")
    print(f"[DEBUG] All orders for this table:")
    for o in all_orders:
        has_paid_note = "[PAID:" in (o.notes or "")
        print(f"  - Order #{o.id}: status={o.status!r}, has_paid_note={has_paid_note}")
    
    # Check for existing unpaid order for this table (reuse until paid)
    # Get all non-paid orders, then filter out ones with payment confirmation in notes
    potential_orders = session.exec(
        select(models.Order).where(
            models.Order.table_id == table.id,
            models.Order.status != "paid"
        ).order_by(models.Order.created_at.desc())
    ).all()
    
    # Filter out orders that have payment confirmation in notes (edge case for corrupted data)
    existing_order = None
    for order in potential_orders:
        has_paid_note = "[PAID:" in (order.notes or "")
        if not has_paid_note:
            existing_order = order
            break
        else:
            print(f"[DEBUG] Skipping order #{order.id} - has [PAID:] in notes despite status={order.status!r}")
    
    print(f"[DEBUG] Query result after filtering: {existing_order}")
    if existing_order:
        print(f"[DEBUG] Found existing order #{existing_order.id} with status={existing_order.status!r}")
    else:
        print(f"[DEBUG] No existing unpaid order found - will create new one")
    
    is_new_order = existing_order is None
    
    if is_new_order:
        # Create new order
        order = models.Order(
            tenant_id=table.tenant_id,
            table_id=table.id,
            notes=order_data.notes
        )
        session.add(order)
        session.commit()
        session.refresh(order)
        print(f"[DEBUG] Created NEW order #{order.id}")
    else:
        order = existing_order
        print(f"[DEBUG] REUSING existing order #{order.id}")
        # If the order was completed, reset it to pending since new items were added
        if str(order.status) == "completed" or order.status == models.OrderStatus.completed:
            order.status = models.OrderStatus.pending
            print(f"[DEBUG] Reset order status from completed to pending")
        # Append notes if provided
        if order_data.notes:
            order.notes = f"{order.notes or ''}\n{order_data.notes}".strip()
    
    print(f"[DEBUG] Final order #{order.id}, status={order.status!r}")
    print(f"{'='*60}\n")
    
    # Add order items
    for item in order_data.items:
        product = session.exec(
            select(models.Product).where(
                models.Product.id == item.product_id,
                models.Product.tenant_id == table.tenant_id
            )
        ).first()
        
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
        
        # Check if this product already exists in the order
        existing_item = session.exec(
            select(models.OrderItem).where(
                models.OrderItem.order_id == order.id,
                models.OrderItem.product_id == product.id
            )
        ).first()
        
        if existing_item:
            # Increment quantity
            existing_item.quantity += item.quantity
            if item.notes:
                existing_item.notes = f"{existing_item.notes or ''}, {item.notes}".strip(", ")
            session.add(existing_item)
        else:
            # Create new order item
            order_item = models.OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                quantity=item.quantity,
                price_cents=product.price_cents,
                notes=item.notes
            )
            session.add(order_item)
    
    session.commit()
    session.refresh(order)
    
    # Publish to Redis for real-time updates
    publish_order_update(table.tenant_id, {
        "type": "new_order" if is_new_order else "items_added",
        "order_id": order.id,
        "table_name": table.name,
        "status": order.status.value,
        "created_at": order.created_at.isoformat()
    })
    
    return {"status": "created" if is_new_order else "updated", "order_id": order.id}


# ============ ORDERS (Protected) ============

@app.get("/orders")
def list_orders(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> list[dict]:
    orders = session.exec(
        select(models.Order).where(models.Order.tenant_id == current_user.tenant_id).order_by(models.Order.created_at.desc())
    ).all()
    
    result = []
    for order in orders:
        table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
        items = session.exec(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
        
        result.append({
            "id": order.id,
            "table_name": table.name if table else "Unknown",
            "status": order.status.value,
            "notes": order.notes,
            "created_at": order.created_at.isoformat(),
            "items": [
                {
                    "id": item.id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price_cents": item.price_cents,
                    "notes": item.notes
                }
                for item in items
            ],
            "total_cents": sum(item.price_cents * item.quantity for item in items)
        })
    
    return result


@app.put("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status_update: models.OrderStatusUpdate,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> dict:
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status_update.status
    session.add(order)
    session.commit()
    
    # Publish status update
    table = session.exec(select(models.Table).where(models.Table.id == order.table_id)).first()
    publish_order_update(current_user.tenant_id, {
        "type": "status_update",
        "order_id": order.id,
        "table_name": table.name if table else "Unknown",
        "status": order.status.value
    })
    
    return {"status": "updated", "order_id": order.id, "new_status": order.status.value}


# ============ PAYMENTS (Public - for customer checkout) ============

@app.post("/orders/{order_id}/create-payment-intent")
def create_payment_intent(
    order_id: int,
    table_token: str,
    session: Session = Depends(get_session)
) -> dict:
    """Create a Stripe PaymentIntent for an order."""
    # Verify table token matches the order
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Invalid table")
    
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.table_id == table.id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Calculate total from order items
    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == order_id)
    ).all()
    
    total_cents = sum(item.price_cents * item.quantity for item in items)
    
    if total_cents <= 0:
        raise HTTPException(status_code=400, detail="Order has no items")
    
    # Get tenant for description
    tenant = session.exec(select(models.Tenant).where(models.Tenant.id == order.tenant_id)).first()
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=total_cents,
            currency=settings.stripe_currency,
            metadata={
                "order_id": str(order.id),
                "table_id": str(table.id),
                "tenant_id": str(order.tenant_id)
            },
            description=f"Order #{order.id} at {tenant.name if tenant else 'POS'} - {table.name}"
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": total_cents
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/orders/{order_id}/confirm-payment")
def confirm_payment(
    order_id: int,
    table_token: str,
    payment_intent_id: str,
    session: Session = Depends(get_session)
) -> dict:
    """Mark order as paid after successful Stripe payment."""
    table = session.exec(select(models.Table).where(models.Table.token == table_token)).first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Invalid table")
    
    order = session.exec(
        select(models.Order).where(
            models.Order.id == order_id,
            models.Order.table_id == table.id
        )
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify payment with Stripe
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Payment not completed")
        
        # Mark order as paid
        order.status = models.OrderStatus.paid
        order.notes = f"{order.notes or ''}\n[PAID: {payment_intent_id}]".strip()
        session.add(order)
        session.commit()
        
        # Notify tenant
        publish_order_update(order.tenant_id, {
            "type": "order_paid",
            "order_id": order.id,
            "table_name": table.name,
            "status": order.status.value
        })
        
        return {"status": "paid", "order_id": order.id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))