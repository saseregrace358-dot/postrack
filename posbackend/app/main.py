from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


from app.database import engine, Base
from app.routes import product_routes, sales_routes

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="POS Backend")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.236.8.25:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# Routes
app.include_router(product_routes.router)
app.include_router(sales_routes.router)


@app.get("/")
def home():
    return {"message": "POS Backend Running"}