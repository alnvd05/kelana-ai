def print_trip_summary(destination, days, budget, travel_styles):
    print("================")
    print("Kelana AI")
    print("================")
    print(f"Destination : {destination}")     
    print(f"Days        : {days}")             
    print(f"Budget      : {budget}")
    print(f"Style       : {travel_styles}")

# Call it with any trip
print_trip_summary("Japan", 5, 1500, "Family")
print_trip_summary("Bali", 3, 800, "Backpacker")
