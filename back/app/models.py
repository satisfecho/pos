from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


class Tenant(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    users: list["User"] = Relationship(back_populates="tenant")


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str | None = None
    
    tenant_id: int | None = Field(default=None, foreign_key="tenant.id")
    tenant: Tenant | None = Relationship(back_populates="users")


class TenantMixin(SQLModel):
    tenant_id: int = Field(foreign_key="tenant.id")


class Product(TenantMixin, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    price_cents: int


class UserRegister(SQLModel):
    tenant_name: str
    email: str
    password: str
    full_name: str | None = None