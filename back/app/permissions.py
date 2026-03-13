"""
Role-based access control (RBAC) permission system.

This module defines permissions and maps them to user roles.
Use require_permission() as a FastAPI dependency to protect endpoints.
"""

from enum import Enum
from fastapi import HTTPException, status, Depends
from .models import User, UserRole
from .security import get_current_user


class Permission(str, Enum):
    """All permissions in the system."""
    
    # User management
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    
    # Settings
    SETTINGS_READ = "settings:read"
    SETTINGS_UPDATE = "settings:update"
    SETTINGS_BILLING = "settings:billing"  # Stripe keys - owner only
    
    # Products
    PRODUCT_READ = "product:read"
    PRODUCT_WRITE = "product:write"
    
    # Catalog
    CATALOG_READ = "catalog:read"
    CATALOG_WRITE = "catalog:write"
    
    # Tables
    TABLE_READ = "table:read"
    TABLE_WRITE = "table:write"
    TABLE_ACTIVATE = "table:activate"
    
    # Reservations
    RESERVATION_READ = "reservation:read"
    RESERVATION_WRITE = "reservation:write"
    
    # Floors
    FLOOR_READ = "floor:read"
    FLOOR_WRITE = "floor:write"
    
    # Orders
    ORDER_READ = "order:read"
    ORDER_UPDATE_STATUS = "order:update_status"
    ORDER_ITEM_STATUS = "order:item_status"
    ORDER_MARK_PAID = "order:mark_paid"
    ORDER_CANCEL = "order:cancel"
    ORDER_REMOVE_ITEM = "order:remove_item"
    
    # Inventory
    INVENTORY_READ = "inventory:read"
    INVENTORY_WRITE = "inventory:write"
    
    # Translations
    TRANSLATION_READ = "translation:read"
    TRANSLATION_WRITE = "translation:write"


# Map roles to their permissions
ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.owner: set(Permission),  # Owner has ALL permissions
    
    UserRole.admin: {
        # User management (except delete)
        Permission.USER_CREATE,
        Permission.USER_READ,
        Permission.USER_UPDATE,
        # Settings (except billing/Stripe)
        Permission.SETTINGS_READ,
        Permission.SETTINGS_UPDATE,
        # Products
        Permission.PRODUCT_READ,
        Permission.PRODUCT_WRITE,
        # Catalog
        Permission.CATALOG_READ,
        Permission.CATALOG_WRITE,
        # Tables
        Permission.TABLE_READ,
        Permission.TABLE_WRITE,
        Permission.TABLE_ACTIVATE,
        # Reservations
        Permission.RESERVATION_READ,
        Permission.RESERVATION_WRITE,
        # Floors
        Permission.FLOOR_READ,
        Permission.FLOOR_WRITE,
        # Orders
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE_STATUS,
        Permission.ORDER_ITEM_STATUS,
        Permission.ORDER_MARK_PAID,
        Permission.ORDER_CANCEL,
        Permission.ORDER_REMOVE_ITEM,
        # Inventory
        Permission.INVENTORY_READ,
        Permission.INVENTORY_WRITE,
        # Translations
        Permission.TRANSLATION_READ,
        Permission.TRANSLATION_WRITE,
    },
    
    UserRole.kitchen: {
        # Products (read-only for viewing menu items)
        Permission.PRODUCT_READ,
        Permission.CATALOG_READ,
        # Orders (view and update item status)
        Permission.ORDER_READ,
        Permission.ORDER_ITEM_STATUS,
    },
    
    UserRole.waiter: {
        # Products (read-only)
        Permission.PRODUCT_READ,
        Permission.CATALOG_READ,
        # Tables (view and activate)
        Permission.TABLE_READ,
        Permission.TABLE_ACTIVATE,
        Permission.FLOOR_READ,
        # Reservations
        Permission.RESERVATION_READ,
        Permission.RESERVATION_WRITE,
        # Orders (full order management except cancel)
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE_STATUS,
        Permission.ORDER_ITEM_STATUS,
        Permission.ORDER_MARK_PAID,
        Permission.ORDER_REMOVE_ITEM,
    },
    
    UserRole.receptionist: {
        # Products (read-only)
        Permission.PRODUCT_READ,
        Permission.CATALOG_READ,
        # Tables (view and activate)
        Permission.TABLE_READ,
        Permission.TABLE_ACTIVATE,
        Permission.FLOOR_READ,
        # Reservations
        Permission.RESERVATION_READ,
        Permission.RESERVATION_WRITE,
        # Orders (view only)
        Permission.ORDER_READ,
    },
}


def has_permission(user: User, permission: Permission) -> bool:
    """Check if a user has a specific permission."""
    user_permissions = ROLE_PERMISSIONS.get(user.role, set())
    return permission in user_permissions


def has_any_permission(user: User, *permissions: Permission) -> bool:
    """Check if a user has any of the specified permissions."""
    user_permissions = ROLE_PERMISSIONS.get(user.role, set())
    return any(perm in user_permissions for perm in permissions)


def has_all_permissions(user: User, *permissions: Permission) -> bool:
    """Check if a user has all of the specified permissions."""
    user_permissions = ROLE_PERMISSIONS.get(user.role, set())
    return all(perm in user_permissions for perm in permissions)


def require_permission(*permissions: Permission):
    """
    FastAPI dependency that checks if the current user has required permission(s).
    
    Usage:
        @app.post("/products")
        async def create_product(
            current_user: User = Depends(require_permission(Permission.PRODUCT_WRITE))
        ):
            ...
    """
    async def check_permission(current_user: User = Depends(get_current_user)) -> User:
        user_permissions = ROLE_PERMISSIONS.get(current_user.role, set())
        
        missing_permissions = []
        for perm in permissions:
            if perm not in user_permissions:
                missing_permissions.append(perm.value)
        
        if missing_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {', '.join(missing_permissions)}"
            )
        
        return current_user
    
    return check_permission


def require_role(*roles: UserRole):
    """
    FastAPI dependency that checks if the current user has one of the required roles.
    
    Usage:
        @app.delete("/users/{user_id}")
        async def delete_user(
            current_user: User = Depends(require_role(UserRole.owner))
        ):
            ...
    """
    async def check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            role_names = [r.value for r in roles]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(role_names)}"
            )
        
        return current_user
    
    return check_role


def can_manage_user(manager: User, target_role: UserRole) -> bool:
    """
    Check if a user can create/update users with a specific role.
    
    Rules:
    - Owner can manage all roles
    - Admin can manage all roles except owner
    - Others cannot manage users
    """
    if manager.role == UserRole.owner:
        return True
    if manager.role == UserRole.admin:
        return target_role != UserRole.owner
    return False


def can_modify_user(manager: User, target_user: User) -> bool:
    """
    Check if a manager can modify a target user.
    
    Rules:
    - Owner can modify anyone except other owners (unless it's themselves)
    - Admin can modify anyone except owners
    - Users can only modify themselves (limited fields)
    """
    if manager.role == UserRole.owner:
        # Owner can modify anyone
        return True
    if manager.role == UserRole.admin:
        # Admin cannot modify owners
        return target_user.role != UserRole.owner
    # Others can only modify themselves
    return manager.id == target_user.id
