from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from . import models, security
from .db import check_db_connection, create_db_and_tables, get_session


app = FastAPI(title="POS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/register")
def register(
    tenant_name: str,
    email: str,
    password: str,
    full_name: str | None = None,
    session: Session = Depends(get_session)
) -> dict:
    # Check if user already exists
    existing_user = session.exec(select(models.User).where(models.User.email == email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create Tenant
    tenant = models.Tenant(name=tenant_name)
    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    # Create User
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
    # Authenticate user
    statement = select(models.User).where(models.User.email == form_data.username)
    user = session.exec(statement).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token
    access_token = security.create_access_token(
        data={"sub": user.email, "tenant_id": user.tenant_id}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/products")
def list_products(
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> list[models.Product]:
    # Only return products for the current tenant
    # Since Product has TenantMixin, we could check Product.tenant_id == current_user.tenant_id
    # But relying on the context var or the user object is safer.
    return session.exec(select(models.Product).where(models.Product.tenant_id == current_user.tenant_id)).all()

@app.post("/products")
def create_product(
    product: models.Product,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session)
) -> models.Product:
    # Force tenant_id to be the current user's tenant
    product.tenant_id = current_user.tenant_id
    session.add(product)
    session.commit()
    session.refresh(product)
    return product