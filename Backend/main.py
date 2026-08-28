import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func

from services.trip_service import (
    calculate_daily_budget,
    get_recommended_places,
    get_transportation_recommendation,
    get_travel_season,
    get_trip_category,
)
from services.bedrock_service import get_bedrock_service
from services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    authenticate_user,
    create_access_token,
    register_user,
)
from dependencies.auth import get_current_user

from models.trip import Trip
from models.user import User
from database import SessionLocal, init_db

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

class TripRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination: str
    days: int
    budget: float
    month: str
    travel_style: str


# Schema khusus untuk PUT /api/v1/trips/{trip_id}
# Cuma butuh "budget" karena update ini hanya mengubah budget saja,
# bukan destination/days/month seperti saat create trip
class TripUpdateRequest(BaseModel):
    budget: float


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Name must not be blank")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized_email = value.strip().lower()
        local_part, separator, domain = normalized_email.partition("@")
        if (
            normalized_email.count("@") != 1
            or separator != "@"
            or not local_part
            or "." not in domain
            or domain.startswith(".")
            or domain.endswith(".")
            or " " in normalized_email
        ):
            raise ValueError("Enter a valid email address")
        return normalized_email

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 bytes")
        return value


class RegisterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=72)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must not exceed 72 bytes")
        return value


class LoginResponse(BaseModel):
    access_token: str
    token_type: str


class CurrentUserResponse(BaseModel):
    id: int
    name: str
    email: str
    total_trips: int


@app.get("/")
def home():
    return {"message": "Welcome to KelanaAI"}


@app.post(
    "/api/v1/auth/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(request: RegisterRequest):
    db = SessionLocal()
    try:
        return register_user(
            db=db,
            name=request.name,
            email=request.email,
            password=request.password,
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    finally:
        db.close()


@app.post(
    "/api/v1/auth/login",
    response_model=LoginResponse,
    responses={status.HTTP_401_UNAUTHORIZED: {"description": "Invalid credentials"}},
)
def login(request: LoginRequest):
    db = SessionLocal()
    try:
        user = authenticate_user(
            db=db,
            email=request.email,
            password=request.password,
        )
        return LoginResponse(
            access_token=create_access_token(user.id),
            token_type="bearer",
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    finally:
        db.close()


@app.get("/api/v1/auth/me", response_model=CurrentUserResponse)
def get_current_profile(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        total_trips = (
            db.query(func.count(Trip.id))
            .filter(
                Trip.user_id == current_user.id,
                Trip.is_deleted.is_(False),
            )
            .scalar()
            or 0
        )
        return CurrentUserResponse(
            id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            total_trips=total_trips,
        )
    finally:
        db.close()


@app.post("/api/v1/trips")
def create_trip(
    request: TripRequest,
    current_user: User = Depends(get_current_user),
):
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category = get_trip_category(request.budget)
    season = get_travel_season(request.month)
    transportation = get_transportation_recommendation(category)
    places = get_recommended_places(request.destination)

    # Panggil AI dulu sebelum bikin objek Trip, supaya hasilnya
    # bisa langsung dimasukkan ke field ai_recommendation
    bedrock = get_bedrock_service()
    result = bedrock.get_ai_recommendation(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        travel_style=request.travel_style,
    )

    # Kalau panggilan ke Bedrock gagal, jangan lanjut simpan trip
    # dengan ai_recommendation kosong/None
    if not result["success"]:
        raise HTTPException(
            status_code=502,
            detail=f"AI recommendation failed: {result['error']}",
        )

    ai_recommendation: str = result["recommendation"]

    # create a Trip ORM object
    trip = Trip(
        destination=request.destination,
        days=request.days,
        budget=request.budget,
        category=category,
        daily_budget=daily_budget,
        travel_style=request.travel_style,
        ai_recommendation=ai_recommendation,
        # Ownership and audit identity always come from the verified JWT user.
        # The request schema forbids a frontend-supplied user_id.
        user_id=current_user.id,
        created_by=current_user.id,
        updated_by=current_user.id,
    )

    # save to PostgreSQL
    db = SessionLocal()
    try:
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return trip
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@app.get("/api/v1/trips")
def list_trips(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        # Dashboard reads saved data directly from PostgreSQL. A higher ID is
        # the most recently created trip, so new itineraries appear first.
        return (
            db.query(Trip)
            .filter(
                Trip.user_id == current_user.id,
                Trip.is_deleted.is_(False),
            )
            .order_by(Trip.id.desc())
            .all()
        )
    finally:
        db.close()


@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        trip = (
            db.query(Trip)
            .filter(
                Trip.id == trip_id,
                Trip.user_id == current_user.id,
                Trip.is_deleted.is_(False),
            )
            .first()
        )

        if trip is None:
            raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

        return trip
    finally:
        db.close()


def _get_owned_active_trip(db, trip_id: int, current_user: User, action: str) -> Trip:
    trip = (
        db.query(Trip)
        .filter(Trip.id == trip_id, Trip.is_deleted.is_(False))
        .first()
    )

    if trip is None:
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    if trip.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to {action} this trip",
        )

    return trip


# PUT /api/v1/trips/{trip_id} — update budget sebuah trip yang sudah ada,
# lalu recalculate category & daily_budget berdasarkan budget baru
@app.put("/api/v1/trips/{trip_id}")
def update_trip(
    trip_id: int,
    request: TripUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        trip = _get_owned_active_trip(db, trip_id, current_user, "update")
        trip.budget = request.budget
        trip.category = get_trip_category(request.budget)
        trip.daily_budget = calculate_daily_budget(request.budget, trip.days)
        trip.updated_by = current_user.id

        db.commit()
        db.refresh(trip)
        return trip
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# DELETE /api/v1/trips/{trip_id} — soft delete satu trip berdasarkan ID
@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        trip = _get_owned_active_trip(db, trip_id, current_user, "delete")
        deleted_at = datetime.now(timezone.utc)
        trip.is_deleted = True
        trip.deleted_at = deleted_at
        trip.deleted_by = current_user.id
        trip.updated_at = deleted_at
        trip.updated_by = current_user.id

        db.commit()
        db.refresh(trip)
        return {"message": f"Trip with id {trip_id} soft deleted successfully"}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

@app.post("/api/v1/trips/{trip_id}/generate")
def generate_trip_recommendation(
    trip_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        trip = _get_owned_active_trip(db, trip_id, current_user, "regenerate")
        bedrock = get_bedrock_service()
        result = bedrock.get_ai_recommendation(
            destination=trip.destination,
            days=trip.days,
            budget=trip.budget,
            travel_style=trip.travel_style,
        )

        if not result["success"]:
            raise HTTPException(
                status_code=502,
                detail=f"AI recommendation failed: {result['error']}",
            )

        trip.ai_recommendation = result["recommendation"]
        trip.updated_by = current_user.id
        db.commit()
        db.refresh(trip)

        return {
            "trip_id": trip.id,
            "destination": trip.destination,
            "recommendation": trip.ai_recommendation,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "OK"}


@app.get("/api/v1/recommendations")
def get_recommendations():
    return ["Tokyo Tower", "Mount Fuji", "Shibuya"]


@app.get("/api/v1/transportations")
def get_transportations():
    return ["Bus", "Train", "Flight"]
