from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import engine, Base, get_db
from models import User
from schemas import UserCreate, UserRead, Token

from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "60"))


@app.post("/auth/register", response_model=UserRead)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=pwd_context.hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=Token)
def login(payload: UserCreate, db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()
    
    if not user or not pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    exp = datetime.utcnow() + timedelta(minutes=JWT_EXPIRES_MIN)
    token = jwt.encode(
        {"sub": str(user.user_id), "email": user.email, "exp": exp},
        JWT_SECRET,
        algorithm=JWT_ALG
    )
    return {"access_token": token, "token_type": "bearer"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
