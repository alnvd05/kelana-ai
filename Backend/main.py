from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from services.trip_service import (
    calculate_daily_budget,
    get_recommended_places,
    get_transportation_recommendation,
    get_travel_season,
    get_trip_category,
)
from services.bedrock_service import get_bedrock_service

from models.trip import Trip
from database import SessionLocal, init_db

app = FastAPI()

init_db()

class TripRequest(BaseModel):
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


@app.get("/")
def home():
    return {"message": "Welcome to KelanaAI"}


@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
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
    )

    # save to PostgreSQL
    db = SessionLocal()
    db.add(trip)
    db.commit()
    db.refresh(trip)
    db.close()

    return trip


@app.get("/api/v1/trips")
def list_trips():
    db = SessionLocal()
    trips = db.query(Trip).all()
    db.close()
    return trips


@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    db.close()

    if trip is None:
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    return trip


# PUT /api/v1/trips/{trip_id} — update budget sebuah trip yang sudah ada,
# lalu recalculate category & daily_budget berdasarkan budget baru
@app.put("/api/v1/trips/{trip_id}")
def update_trip(trip_id: int, request: TripUpdateRequest):
    # buka sesi & cari trip yang mau di-update berdasarkan ID
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    # kalau trip tidak ditemukan, tutup dulu sesinya baru raise error 404
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    # update budget pada objek trip yang sudah ada (bukan bikin objek baru)
    # reuse business logic — recalculate berdasarkan budget baru
    trip.budget = request.budget
    trip.category = get_trip_category(request.budget)
    trip.daily_budget = calculate_daily_budget(request.budget, trip.days)

    # commit perubahan — SQLAlchemy otomatis tahu ini UPDATE karena
    # objek "trip" sudah dikenal sesi ini (hasil dari query di atas),
    # jadi tidak perlu db.add(trip) lagi seperti waktu create_trip
    db.commit()
    db.refresh(trip)
    db.close()

    return trip


# DELETE /api/v1/trips/{trip_id} — hapus satu trip berdasarkan ID
@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(trip_id: int):
    # buka sesi & cari trip yang mau dihapus
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    # kalau trip tidak ditemukan, tutup dulu sesinya baru raise error 404
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    # hapus trip dari database, lalu commit perubahannya
    db.delete(trip)
    db.commit()
    db.close()

    return {"message": f"Trip with id {trip_id} deleted successfully"}

@app.post("/api/v1/trips/{trip_id}/generate")
def generate_trip_recommendation(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

    bedrock = get_bedrock_service()
    result = bedrock.get_ai_recommendation(
        destination=trip.destination,
        days=trip.days,
        budget=trip.budget,
        travel_style=trip.travel_style,  
    )

    if not result["success"]:
        db.close()
        raise HTTPException(status_code=502, detail=f"AI recommendation failed: {result['error']}")

    trip.ai_recommendation = result["recommendation"]
    db.commit()
    db.refresh(trip)
    db.close()

    return {
        "trip_id": trip.id,
        "destination": trip.destination,
        "recommendation": trip.ai_recommendation,
    }


@app.get("/health")
def health_check():
    return {"status": "OK"}


@app.get("/api/v1/recommendations")
def get_recommendations():
    return ["Tokyo Tower", "Mount Fuji", "Shibuya"]


@app.get("/api/v1/transportations")
def get_transportations():
    return ["Bus", "Train", "Flight"]
