from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    staff = "staff"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.staff)
    full_name = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, index=True, nullable=False)  # bisa dari input atau generate
    name = Column(String(200), nullable=False)
    category = Column(String(100))
    unit = Column(String(20), default="pcs")
    price = Column(Float, default=0.0)
    stock = Column(Float, default=0.0)
    min_stock = Column(Float, default=0.0)  # alert jika di bawah ini
    qr_data = Column(String(255), unique=True)  # data yang diencode ke QR (bisa SKU atau UUID)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    mutations = relationship("StockMutation", back_populates="item")

class StockMutationType(str, enum.Enum):
    restock = "restock"
    sale = "sale"
    opname_adjust = "opname_adjust"
    return_in = "return_in"
    return_out = "return_out"

class StockMutation(Base):
    __tablename__ = "stock_mutations"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Float, nullable=False)  # positif untuk masuk, negatif untuk keluar
    previous_stock = Column(Float, nullable=False)
    new_stock = Column(Float, nullable=False)
    mutation_type = Column(Enum(StockMutationType), nullable=False)
    note = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    item = relationship("Item", back_populates="mutations")
    user = relationship("User")


class Sale(Base):
    __tablename__ = "sales"
    id = Column(Integer, primary_key=True, index=True)
    sale_number = Column(String(30), unique=True, index=True, nullable=False)
    total_amount = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, default=0.0)
    grand_total = Column(Float, nullable=False, default=0.0)
    payment_amount = Column(Float, default=0.0)
    change_amount = Column(Float, default=0.0)
    note = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("SaleItem", back_populates="sale")
    user = relationship("User")


class SaleItem(Base):
    __tablename__ = "sale_items"
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    sale = relationship("Sale", back_populates="items")
    item = relationship("Item")