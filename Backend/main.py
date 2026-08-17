
from fastapi import FastAPI
from pydantic import BaseModel

from services.trip_service import (
    calculate_daily_budget,
    get_recommended_places,
    get_transportation_recommendation,
    get_travel_season,
    get_trip_category,
)

app = FastAPI()

class TripRequest(BaseModel):
    destination: str
    days: int
    budget: float
    month: str

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

    return {
        "destination": request.destination,
        "days": request.days,
        "budget": request.budget,
        "daily_budget": daily_budget,
        "category": category,
        "season": season,
        "recommended_transport": transportation,
        "recommended_places": places,
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