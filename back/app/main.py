from fastapi import Depends, FastAPI
from sqlmodel import Session, select

from . import models  # noqa: F401  (ensures SQLModel models are registered)
from .db import check_db_connection, create_db_and_tables, get_session


app = FastAPI(title="POS API")


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


@app.get("/products")
def list_products(session: Session = Depends(get_session)) -> list[models.Product]:
    return session.exec(select(models.Product)).all()

