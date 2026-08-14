
# Presentation Layer
# Menangani interaksi dengan user (input & output) untuk aplikasi KelanaAI
# Semua logika bisnis/perhitungan didelegasikan ke services.trip_service

from services.trip_service import (
    calculate_daily_budget,
    get_recommended_places,
    get_transportation_recommendation,
    get_travel_season,
    get_trip_category,
)


def input_destinations():
    # Minta user memasukkan destinasi satu per satu sampai input kosong
    destinations = []
    print("Masukkan destinasi (ketik kosong lalu Enter jika sudah selesai):")
    while True:
        place = input(f"Destinasi #{len(destinations) + 1}: ").strip()
        if place == "":
            break
        destinations.append(place)
    return destinations


def print_destinations(destinations):
    print("Your Destination")
    for index, destination in enumerate(destinations):
        print(f"{index + 1}. {destination}")


def print_recommended_places(destinations):
    print("Recommended Place")
    print()

    for destination in destinations:
        print(destination)
        for place in get_recommended_places(destination):
            print(f"- {place}")

    print()


def print_trip_summary(destinations, days, budget, month):
    daily_budget = calculate_daily_budget(budget, days)
    category = get_trip_category(budget)
    season = get_travel_season(month)
    transportation = get_transportation_recommendation(category)

    print("======================")
    print("KelanaAI")
    print()
    print_destinations(destinations)
    print()
    print(f"Days                = {days}")
    print(f"Budget              = {budget}")
    print(f"Month               = {month}")
    print(f"Category            = \"{category}\"")
    print(f"Season              = \"{season}\"")
    print(f"Daily Budget        = {daily_budget:.0f} USD/Day")
    print(f"Recommended Transportation: {transportation}")
    print()
    print_recommended_places(destinations)


def input_positive_int(prompt):
    # Minta input angka bulat positif, ulang terus sampai valid
    while True:
        value = input(prompt).strip()
        if value.isdigit() and int(value) > 0:
            return int(value)
        print("Input tidak valid. Masukkan angka bulat lebih dari 0.")


def input_positive_float(prompt):
    # Minta input angka (boleh desimal) positif, ulang terus sampai valid
    while True:
        value = input(prompt).strip()
        try:
            number = float(value)
            if number > 0:
                return number
        except ValueError:
            pass
        print("Input tidak valid. Masukkan angka lebih dari 0.")


def main():
    destinations = input_destinations()
    if not destinations:
        print("Tidak ada destinasi yang dimasukkan. Program berhenti.")
        return

    days = input_positive_int("Jumlah hari perjalanan: ")
    budget = input_positive_float("Total budget (USD): ")
    month = input("Bulan keberangkatan (contoh: December): ").strip()

    print_trip_summary(destinations, days, budget, month)


if __name__ == "__main__":
    main()