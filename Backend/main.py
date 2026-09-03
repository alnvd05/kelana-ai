import os
from datetime import datetime, timezone
from typing import Literal

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
from services.conversation_service import (
    DEFAULT_CONVERSATION_TITLE,
    build_bedrock_messages,
    derive_conversation_title,
)
from services.kb_service import retrieve_and_generate
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
from models.conversation import Conversation, Message
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


class AskRequest(BaseModel):
    question: str


class ConversationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, max_length=256)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Conversation title must not be blank")
        return normalized


class ConversationRenameRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=256)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Conversation title must not be blank")
        return normalized


class SendMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=8_000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Message must not be blank")
        return normalized


class ConversationCreatedResponse(BaseModel):
    conversation_id: int
    title: str
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime


class MessageExchangeResponse(BaseModel):
    conversation_id: int
    conversation_title: str
    user_message: MessageResponse
    assistant_message: MessageResponse


@app.get("/")
def home():
    return {"message": "Welcome to KelanaAI"}


@app.post("/api/v1/ask")
def ask(request: AskRequest):
    try:
        answer = retrieve_and_generate(request.question)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return {"question": request.question, "answer": answer}


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


def _get_owned_active_conversation(
    db,
    conversation_id: int,
    current_user: User,
) -> Conversation:
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
            Conversation.is_deleted.is_(False),
        )
        .first()
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation with id {conversation_id} not found",
        )
    return conversation


@app.post(
    "/api/v1/conversations",
    response_model=ConversationCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    request: ConversationCreateRequest | None = None,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        title = request.title if request and request.title else DEFAULT_CONVERSATION_TITLE
        conversation = Conversation(
            user_id=current_user.id,
            title=title,
            created_by=current_user.id,
            updated_by=current_user.id,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return ConversationCreatedResponse(
            conversation_id=conversation.id,
            title=conversation.title,
            created_at=conversation.created_at,
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@app.get(
    "/api/v1/conversations",
    response_model=list[ConversationResponse],
)
def list_conversations(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        return (
            db.query(Conversation)
            .filter(
                Conversation.user_id == current_user.id,
                Conversation.is_deleted.is_(False),
            )
            .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
            .all()
        )
    finally:
        db.close()


@app.get(
    "/api/v1/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def list_conversation_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        _get_owned_active_conversation(db, conversation_id, current_user)
        return (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc(), Message.id.asc())
            .all()
        )
    finally:
        db.close()


@app.patch(
    "/api/v1/conversations/{conversation_id}",
    response_model=ConversationResponse,
)
def rename_conversation(
    conversation_id: int,
    request: ConversationRenameRequest,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        conversation = _get_owned_active_conversation(
            db,
            conversation_id,
            current_user,
        )
        conversation.title = request.title
        conversation.updated_at = datetime.now(timezone.utc)
        conversation.updated_by = current_user.id
        db.commit()
        db.refresh(conversation)
        return conversation
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@app.post(
    "/api/v1/conversations/{conversation_id}/messages",
    response_model=MessageExchangeResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_conversation_message(
    conversation_id: int,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()
    try:
        conversation = _get_owned_active_conversation(
            db,
            conversation_id,
            current_user,
        )
        has_messages = (
            db.query(Message.id)
            .filter(Message.conversation_id == conversation_id)
            .first()
            is not None
        )

        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=request.content,
        )
        db.add(user_message)

        if not has_messages and conversation.title == DEFAULT_CONVERSATION_TITLE:
            conversation.title = derive_conversation_title(request.content)

        conversation.updated_at = datetime.now(timezone.utc)
        conversation.updated_by = current_user.id
        db.commit()
        db.refresh(user_message)
        db.refresh(conversation)

        history = (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc(), Message.id.asc())
            .all()
        )
        result = get_bedrock_service().get_conversation_response(
            build_bedrock_messages(history)
        )
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="KelanaAI could not generate a response. Your message was saved.",
            )

        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=result["response"],
        )
        db.add(assistant_message)
        conversation.updated_at = datetime.now(timezone.utc)
        conversation.updated_by = current_user.id
        db.commit()
        db.refresh(assistant_message)
        db.refresh(conversation)

        return MessageExchangeResponse(
            conversation_id=conversation.id,
            conversation_title=conversation.title,
            user_message=MessageResponse.model_validate(user_message),
            assistant_message=MessageResponse.model_validate(assistant_message),
        )
    except Exception:
        db.rollback()
        raise
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
