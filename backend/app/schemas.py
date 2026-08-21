from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    staff = "staff"

class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.staff

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Item schemas
class ItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str = "pcs"
    price: float = 0.0
    min_stock: float = 0.0

class ItemCreate(ItemBase):
    sku: Optional[str] = None  # jika tidak diisi, generate otomatis
    qr_data: Optional[str] = None  # jika tidak, pakai SKU

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    min_stock: Optional[float] = None

class ItemOut(ItemBase):
    id: int
    sku: str
    qr_data: str
    stock: float
    created_at: datetime
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True

# Stock mutation
class StockMutationType(str, Enum):
    restock = "restock"
    sale = "sale"
    opname_adjust = "opname_adjust"
    return_in = "return_in"
    return_out = "return_out"

class StockMutationCreate(BaseModel):
    item_id: int
    quantity: float  # positif = masuk, negatif = keluar
    mutation_type: StockMutationType
    note: Optional[str] = None

class StockMutationOut(BaseModel):
    id: int
    item_id: int
    quantity: float
    previous_stock: float
    new_stock: float
    mutation_type: StockMutationType
    note: Optional[str]
    created_by: Optional[int]
    created_at: datetime
    class Config:
        from_attributes = True

# Opname khusus: scan QR lalu set stock aktual
class OpnameScan(BaseModel):
    qr_data: str
    actual_stock: float
    note: Optional[str] = None