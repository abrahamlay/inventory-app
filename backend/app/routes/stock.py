from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/stock", tags=["stock"])

@router.post("/mutation", response_model=schemas.StockMutationOut)
def create_mutation(mutation: schemas.StockMutationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.Item).filter(models.Item.id == mutation.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Hitung stok baru
    new_stock = item.stock + mutation.quantity
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Stock would become negative")
    
    old_stock = item.stock
    # Update item stock
    item.stock = new_stock
    
    # Catat mutasi
    db_mutation = models.StockMutation(
        item_id=item.id,
        quantity=mutation.quantity,
        previous_stock=old_stock,
        new_stock=new_stock,
        mutation_type=mutation.mutation_type,
        note=mutation.note,
        created_by=current_user.id
    )
    db.add(db_mutation)
    db.commit()
    db.refresh(db_mutation)
    return db_mutation

@router.post("/opname")
def opname_scan(data: schemas.OpnameScan, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Cari item berdasarkan qr_data
    item = db.query(models.Item).filter(models.Item.qr_data == data.qr_data).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    old_stock = item.stock
    difference = data.actual_stock - old_stock
    item.stock = data.actual_stock
    
    mutation = models.StockMutation(
        item_id=item.id,
        quantity=difference,
        previous_stock=old_stock,
        new_stock=data.actual_stock,
        mutation_type=schemas.StockMutationType.opname_adjust,
        note=data.note or f"Opname: adjusted from {old_stock} to {data.actual_stock}",
        created_by=current_user.id
    )
    db.add(mutation)
    db.commit()
    return {
        "item_id": item.id,
        "sku": item.sku,
        "name": item.name,
        "old_stock": old_stock,
        "new_stock": data.actual_stock,
        "difference": difference
    }

@router.get("/mutations/{item_id}", response_model=List[schemas.StockMutationOut])
def get_mutations(item_id: int, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    mutations = db.query(models.StockMutation).filter(models.StockMutation.item_id == item_id).order_by(models.StockMutation.created_at.desc()).offset(skip).limit(limit).all()
    return mutations

@router.get("/low-stock")
def low_stock(db: Session = Depends(get_db)):
    items = db.query(models.Item).filter(models.Item.stock <= models.Item.min_stock).all()
    return items