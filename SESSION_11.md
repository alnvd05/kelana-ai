# Sesi 11 - Launching KelanaAI to the World

Dokumen kerja untuk Part 1-8, hands-on lab, challenge, dan homework.
Status hanya ditandai selesai setelah ada bukti; resource yang baru dibuat
belum berarti aplikasi sudah live.

## Part 1 - Arsitektur production

Browser memuat Next.js dari Vercel. Next.js mengirim request ber-JWT ke FastAPI
Cloud. FastAPI membaca/menulis PostgreSQL Neon dan meminta respons AI ke Amazon
Bedrock. Foto jurnal memakai S3 privat. Neon dan Bedrock dipanggil oleh backend,
bukan saling memanggil secara berantai.

## Part 2 - Environment variables

Daftar lengkap ada di README.md. Konfigurasi lokal dan cloud dipisahkan. Nilai
rahasia hanya berada di .env lokal atau secret environment hosting. Frontend
hanya menerima URL publik. Aturan Git, Docker, dan FastAPI Cloud mengecualikan
file rahasia dari upload.

## Part 3 - Database

Project Neon: kelana-ai (dawn-waterfall-89155132), branch production,
PostgreSQL 18, AWS Ohio, paket Free. Database cloud baru kosong: tidak ada data
lokal yang dipindahkan. Integrasi DATABASE_URL sudah tersambung. Register,
trip, empat pesan percakapan, dan catatan jurnal berhasil disimpan dan dibaca
kembali melalui API publik pada 8 September 2026.

## Part 4 - Backend

App FastAPI Cloud: kelana-ai-api (2c8129d1-e8d5-4366-9256-2b2325e0962f).
Folder Backend sudah di-link melalui CLI. Python 3.13 ditentukan melalui
.python-version, dependensi deployment tersedia di requirements.txt, dan
.fastapicloudignore membatasi file upload. Deployment
ef1c57a0-ab57-4f18-98ea-300dc1b92d00 berhasil dan live pada
https://kelana-ai-api-b5b1b0cc.fastapicloud.dev.

## Part 5 - Frontend

Target Vercel dengan root Frontend. NEXT_PUBLIC_API_URL harus berakhiran
/api/v1; NEXT_PUBLIC_SITE_URL mengikuti domain frontend final. Build Webpack
dan lint telah lulus. Turbopack terblokir pembukaan port pada sandbox lokal.

## Part 6 - End-to-end testing / hands-on lab

57 unit test backend lulus. Selain itu, smoke test API publik berhasil memakai
Neon dan Bedrock nyata. Tes ini belum menggantikan pengujian browser frontend.

Jalankan alur publik berikut setelah deploy, dengan akun uji khusus:

| Langkah | Hasil yang harus diamati | Status |
| --- | --- | --- |
| /health dan /docs | HTTPS, status 200 | Lulus API publik |
| Register dan login | JWT valid, profil tampil | Lulus API publik, browser belum |
| Generate itinerary | Respons Bedrock, detail trip tampil | Lulus API publik, browser belum |
| Dashboard + reload | Trip tetap tersedia dari Neon | Lulus pembacaan ulang API |
| Chat 2 giliran + reload | Pesan dan konteks tetap tersedia | 4 pesan tersimpan, pembacaan ulang lulus |
| Akun kedua | Data akun pertama tidak terlihat | Lulus API publik; akses langsung percakapan akun pertama ditolak 404 |
| Logout | Halaman terlindungi kembali meminta login | Belum diuji publik |
| Jurnal/foto | Catatan tersimpan, foto dapat dibuka pemilik | Catatan lulus API; bucket foto belum diisi |
| Browser console | Tidak ada CORS/JS error | Belum diuji publik |
| Ponsel | Alur utama dapat digunakan | Belum diuji |

## Part 7 - Troubleshooting

| Gejala | Pemeriksaan pertama |
| --- | --- |
| Request diblokir CORS | Cocokkan origin Vercel dengan FRONTEND_URL |
| API 404 | Pastikan prefix /api/v1 dan rebuild Next.js setelah env berubah |
| Backend gagal start | DATABASE_URL, parameter TLS, dan schema database |
| AI gagal | Token Bedrock, MODEL_ID, region, izin dan log backend |
| Foto jurnal gagal | JOURNAL_S3_BUCKET dan izin IAM S3 |
| Halaman gagal render | Error boundary dengan tombol retry; periksa log |

## Part 8 - Release checklist

Gunakan checklist README.md. Gate rilis: backend dan frontend publik, auth dan
AI berfungsi, data persisten, secret terlindungi, serta HTTPS. Commit/push/tag
sesi 11 dilakukan setelah peninjauan perubahan dan verifikasi rilis; perubahan
pengguna yang sudah ada tidak boleh hilang.

## Challenge - Classmate beta test

Belum dilakukan oleh peserta nyata. Isi URL setelah aplikasi live, lalu
pengguna dapat mengirim teks berikut kepada teman yang dipilih:

> Boleh bantu mencoba KelanaAI? Buka [URL aplikasi], daftar akun uji, login,
> buat itinerary, tanyakan dua hal melalui chat, lalu reload dan lanjutkan
> percakapan yang sama. Coba juga dari ponsel. Catat langkah yang gagal,
> hasil yang diharapkan, dan hasil yang muncul. Jangan kirim password.

Tidak ada undangan yang dikirim otomatis.

| ID | Perangkat/browser | Langkah reproduksi | Harapan | Hasil aktual | Status |
| --- | --- | --- | --- | --- | --- |
| - | Menunggu peserta | - | - | - | Belum diuji |

Bonus branding: logo bintang pada header telah ada, ikon kompas baru tersedia
di app/icon.svg, dan metadata OG menggunakan public/og.png yang sudah ada.

## Homework

- Ikon aplikasi: icon.svg ditambahkan.
- Error 404 + unexpected error: not-found.tsx, error.tsx, global-error.tsx.
- Loading screen: app/loading.tsx ditambahkan; loading dashboard yang ada tetap dipakai.
- About: /about ditambahkan dan dihubungkan dari footer planner.
- README deployment: langkah FastAPI Cloud, Neon, Vercel, environment, migrasi,
  checklist, dan troubleshooting tersedia.
- Commit/push: belum dilakukan.

## Pekerjaan yang masih menunggu

- Login Vercel, deploy frontend, pasang FRONTEND_URL, dan uji CORS/browser.
- Konfigurasi bucket S3 sebelum mengklaim fitur foto jurnal selesai.
- Beta test teman dan pengujian perangkat ponsel nyata.
- Review perubahan lokal, commit/push, dan checkpoint sesi setelah rilis diverifikasi.

Pengujian cloud membuat dua akun uji berlabel Kelana Release Test dan Kelana
Isolation Test; akun pertama memiliki satu trip, satu percakapan, dan satu
catatan jurnal. Data uji masih tersimpan di database baru.

## Mini quiz

1. AWS credentials tidak boleh masuk Git karena akses repository/history dapat
   memberikan pihak lain akses ke akun AWS; menghapus file tidak menghapus history.
2. Environment variables memisahkan konfigurasi dari kode dan membedakan lokal/production.
3. Hosting terpisah memungkinkan frontend dan backend dibangun dan dijalankan
   sesuai runtime masing-masing.
4. Git push baru memicu deployment jika integrasi Git/CI provider dikonfigurasi.
   Deployment CLI FastAPI Cloud sendiri memerlukan fastapi deploy.
