from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import auth, items, stock

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory App API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(items.router)
app.include_router(stock.router)

@app.get("/")
def root():
    return {"message": "Inventory API is running"}