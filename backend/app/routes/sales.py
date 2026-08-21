from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import uuid
from .. import models, schemas
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/sales", tags=["sales"])


def generate_sale_number():
    now = datetime.now()
    return f"TRX-{now.strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def _sale_to_out(db_sale: models.Sale) -> schemas.SaleOut:
    return schemas.SaleOut(
        id=db_sale.id,
        sale_number=db_sale.sale_number,
        total_amount=db_sale.total_amount,
        discount=db_sale.discount,
        grand_total=db_sale.grand_total,
        payment_amount=db_sale.payment_amount,
        change_amount=db_sale.change_amount,
        note=db_sale.note,
        created_by=db_sale.created_by,
        created_at=db_sale.created_at,
        items=[
            schemas.SaleItemOut(
                id=si.id,
                item_id=si.item_id,
                item_name=si.item.name if si.item else None,
                item_sku=si.item.sku if si.item else None,
                quantity=si.quantity,
                unit_price=si.unit_price,
                subtotal=si.subtotal,
            )
            for si in db_sale.items
        ],
    )


@router.post("", response_model=schemas.SaleOut)
def create_sale(
    sale: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not sale.items:
        raise HTTPException(status_code=400, detail="Transaksi harus punya minimal 1 item")

    total = 0.0
    sale_items_data = []

    for si in sale.items:
        if si.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity harus lebih dari 0")
        item = db.query(models.Item).filter(models.Item.id == si.item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {si.item_id} tidak ditemukan")
        if item.stock < si.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stok tidak cukup untuk {item.name} (tersedia: {item.stock})",
            )
        subtotal = item.price * si.quantity
        total += subtotal
        sale_items_data.append((item, si.quantity, item.price, subtotal))

    if sale.discount < 0 or sale.discount > total:
        raise HTTPException(status_code=400, detail="Diskon tidak valid")

    grand_total = total - sale.discount

    if sale.payment_amount > 0 and sale.payment_amount < grand_total:
        raise HTTPException(
            status_code=400,
            detail=f"Uang kurang: perlu Rp {grand_total:,.0f}, dibayar Rp {sale.payment_amount:,.0f}",
        )

    change = (sale.payment_amount - grand_total) if sale.payment_amount > 0 else 0.0

    db_sale = models.Sale(
        sale_number=generate_sale_number(),
        total_amount=total,
        discount=sale.discount,
        grand_total=grand_total,
        payment_amount=sale.payment_amount if sale.payment_amount > 0 else grand_total,
        change_amount=change,
        note=sale.note,
        created_by=current_user.id,
    )
    db.add(db_sale)
    db.flush()

    for item, qty, price, subtotal in sale_items_data:
        db.add(
            models.SaleItem(
                sale_id=db_sale.id,
                item_id=item.id,
                quantity=qty,
                unit_price=price,
                subtotal=subtotal,
            )
        )
        old_stock = item.stock
        item.stock = old_stock - qty
        db.add(
            models.StockMutation(
                item_id=item.id,
                quantity=-qty,
                previous_stock=old_stock,
                new_stock=item.stock,
                mutation_type=models.StockMutationType.sale,
                note=f"Penjualan {db_sale.sale_number}",
                created_by=current_user.id,
            )
        )

    db.commit()
    db.refresh(db_sale)
    return _sale_to_out(db_sale)


@router.get("", response_model=List[schemas.SaleOut])
def list_sales(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sales = (
        db.query(models.Sale)
        .order_by(models.Sale.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_sale_to_out(s) for s in sales]


@router.get("/{sale_id}", response_model=schemas.SaleOut)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return _sale_to_out(sale)