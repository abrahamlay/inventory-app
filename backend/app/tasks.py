from celery import Celery
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

celery_app = Celery(
    "tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task
def check_low_stock():
    from .database import SessionLocal
    from .models import Item
    db = SessionLocal()
    items = db.query(Item).filter(Item.stock <= Item.min_stock).all()
    db.close()
    # Kirim notifikasi (bisa ke Discord/Telegram nanti)
    return [{"sku": i.sku, "name": i.name, "stock": i.stock, "min": i.min_stock} for i in items]