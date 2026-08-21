from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import qrcode
import io
import base64
import uuid
from .. import models, schemas
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/items", tags=["items"])

def generate_sku():
    # SKU sederhana: INV-<timestamp unik>
    return f"INV-{uuid.uuid4().hex[:8].upper()}"

@router.post("", response_model=schemas.ItemOut)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Generate SKU jika tidak disediakan
    sku = item.sku or generate_sku()
    # Pastikan SKU unik
    existing = db.query(models.Item).filter(models.Item.sku == sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")
    
    # QR data: gunakan yang diberikan atau SKU
    qr_data = item.qr_data or sku
    existing_qr = db.query(models.Item).filter(models.Item.qr_data == qr_data).first()
    if existing_qr:
        raise HTTPException(status_code=400, detail="QR data already used")
    
    db_item = models.Item(
        sku=sku,
        name=item.name,
        category=item.category,
        unit=item.unit,
        price=item.price,
        min_stock=item.min_stock,
        qr_data=qr_data,
        stock=0.0
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.get("", response_model=List[schemas.ItemOut])
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(models.Item).offset(skip).limit(limit).all()
    return items

@router.get("/{item_id}", response_model=schemas.ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.patch("/{item_id}", response_model=schemas.ItemOut)
def update_item(item_id: int, update: schemas.ItemUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, value in update.dict(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}

@router.get("/qr/{qr_data}")
def get_item_by_qr(qr_data: str, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.qr_data == qr_data).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.get("/qr-image/{item_id}")
def get_qr_image(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    qr = qrcode.make(item.qr_data)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode()
    return {"qr_image": f"data:image/png;base64,{b64}"}