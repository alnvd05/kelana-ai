# Business Logic Layer
# Berisi seluruh logika perhitungan & aturan bisnis KelanaAI.
# Tidak boleh ada input()/print() di sini — murni fungsi.


def calculate_daily_budget(budget, days):
    # Hitung anggaran harian = total budget dibagi jumlah hari
    return budget / days


def get_trip_category(budget):
    # Tentukan kategori perjalanan berdasarkan anggaran
    if budget < 1000:
        return "Backpacker"
    elif budget <= 3000:
        return "Standard"
    else:
        return "Luxury"


def get_travel_season(month):
    # Tentukan musim perjalanan berdasarkan nama bulan
    if month == "December":
        return "Peak Season"
    elif month == "June":
        return "Holiday Season"
    else:
        return "Regular Season"


def get_transportation_recommendation(category):
    # Rekomendasikan moda transportasi berdasarkan kategori perjalanan
    if category == "Backpacker":
        return "Bus"
    elif category == "Standard":
        return "Train"
    else:
        return "Flight"


def get_recommended_places(destination):
    # Kembalikan list tempat rekomendasi untuk sebuah destinasi
    recommendations = {
        "Japan": ["Tokyo Tower", "Shibuya", "Mount Fuji"],
        "Korea": ["Gyeongbokgung Palace", "Myeongdong", "Namsan Tower"],
        "Bali": ["Ubud", "Kuta Beach", "Tanah Lot"],
        "Singapore": ["Marina Bay", "Gardens by the Bay", "Sentosa"],
    }
    return recommendations.get(destination, ["City Center", "Local Market", "Popular Landmark"])