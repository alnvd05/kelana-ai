# Now use them
def print_trip_summary(
    destination,
    country,
    currency,
    month_of_travel,
    days,
    budget,
    travel_style,
    hotel_cost,
    food_cost,
    transportation_cost,
    miscellaneous_cost
):
    total_estimated_cost = (
        hotel_cost
        + food_cost
        + transportation_cost
        + miscellaneous_cost
    )

    print("==========================")
    print("KelanaAI")
    print("==========================")
    print(f"Destination     : {destination}")
    print(f"Country         : {country}")
    print(f"Currency        : {currency}")
    print(f"Month of Travel : {month_of_travel}")
    print(f"Days            : {days}")
    print(f"Budget          : {budget}")
    print(f"Style           : {travel_style}")
    print(f"Hotel Cost      : {hotel_cost}")
    print(f"Food Cost       : {food_cost}")
    print(f"Transport       : {transportation_cost}")
    print(f"Misc Cost       : {miscellaneous_cost}")
    print(f"Total Cost      : {total_estimated_cost}")

    if total_estimated_cost > budget:
        print("⚠ Budget exceeded.")

    print()

# Call it with any trip
print_trip_summary("Tokyo", "Japan", "USD", 2,  5, 7500, "Family", 900, 300, 250, 100)
print_trip_summary("Bali", "Indonesia", "USD", 1, 3, 5800, "Backpacker", 300, 150, 100, 75)
