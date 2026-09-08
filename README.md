# KelanaAI

Perencana perjalanan dengan Next.js, FastAPI, PostgreSQL, dan Amazon Bedrock.
Fitur: registrasi/login JWT, itinerary AI, dashboard trip, percakapan dengan
riwayat, serta jurnal perjalanan dan foto privat di S3.

## Menjalankan lokal

Backend (Python 3.13):

```sh
cd Backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
# Isi konfigurasi .env dengan nilai lokal Anda.
.venv/bin/uvicorn main:app --reload --port 8000
```

Frontend (Node.js dengan npm):

```sh
cd Frontend
npm ci
cp .env.example .env.local
npm run dev
```

Frontend berjalan di http://localhost:3000, Swagger di http://localhost:8000/docs.

## Konfigurasi production

Gunakan environment variables dashboard hosting. Jangan unggah file .env atau
memasukkan rahasia ke variabel berawalan NEXT_PUBLIC_. Contoh nilai bukan
kredensial yang siap digunakan.

| Layanan | Variabel | Isi |
| --- | --- | --- |
| Backend | DATABASE_URL | Connection string Neon, pertahankan parameter TLS seperti sslmode=require |
| Backend | FRONTEND_URL | Origin HTTPS Vercel yang sebenarnya, tanpa path |
| Backend | JWT_SECRET_KEY | Secret acak minimal 32 karakter |
| Backend | JWT_ACCESS_TOKEN_EXPIRE_MINUTES | 30, atau durasi sesi yang dipilih |
| Backend | AWS_REGION | Region layanan AWS Anda |
| Backend | AWS_BEARER_TOKEN_BEDROCK | Token Bedrock valid; diperlukan oleh implementasi saat ini |
| Backend | MODEL_ID | Model yang dapat diakses di region tersebut; default kode amazon.nova-lite-v1:0 |
| Backend | AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY | Kredensial IAM untuk S3 dan Knowledge Base; gunakan AWS_SESSION_TOKEN juga bila sementara |
| Backend | JOURNAL_S3_BUCKET | Bucket privat untuk foto jurnal |
| Backend | KNOWLEDGE_BASE_ID | ID Knowledge Base untuk retrieval |
| Frontend | NEXT_PUBLIC_API_URL | https://BACKEND_HOST/api/v1 |
| Frontend | NEXT_PUBLIC_SITE_URL | https://FRONTEND_HOST |

Backend proyek ini menggunakan **FastAPI Cloud**, frontend Vercel, dan database
Neon. Kode memakai MODEL_ID, bukan BEDROCK_MODEL_ID.
Token Bedrock tidak menggantikan kredensial S3/Knowledge Base.

## Database Neon

1. Buat project/database Neon dan ambil connection string dari dialog Connect.
2. Pasang DATABASE_URL di backend; pertahankan opsi TLS dari Neon.
3. Untuk database baru yang kosong, startup backend menjalankan init_db() untuk
   membuat seluruh tabel dari model saat ini. Jangan jalankan migrasi legacy
   secara otomatis pada database kosong.
4. Untuk database lama, buat backup dan periksa schema lebih dahulu. Jalankan
   `python migrate.py` dari Backend setelah konfigurasi benar. Migrasi 003
   membutuhkan LEGACY_OWNER_EMAIL yang cocok dengan akun users yang sudah ada;
   migrasi tersebut akan menetapkan pemilik untuk trip tanpa user_id.
5. Validasi trip, conversation, message, dan journal dari aplikasi serta SQL
   editor. create_all tidak menambahkan kolom baru pada tabel yang sudah ada.

## Backend: FastAPI Cloud

Repository berisi dua aplikasi. Root directory backend adalah **Backend**
(huruf besar sesuai nama direktori).

Jalankan CLI dari direktori Backend agar hanya kode backend yang diunggah.
FastAPI Cloud membaca requirements.txt dan .python-version (Python 3.13), lalu
mendeteksi main.py:app. Tidak perlu memasukkan start command ala Render.
Dockerfile hanya opsi untuk penggunaan container di luar alur ini.

```sh
cd Backend
.venv/bin/pip install -r requirements.txt
.venv/bin/fastapi login
# Untuk aplikasi yang sudah dibuat di dashboard:
.venv/bin/fastapi cloud link
# Konfigurasikan environment di dashboard sebelum deploy.
.venv/bin/fastapi deploy
```

Untuk aplikasi baru, buat aplikasi di dashboard terlebih dahulu lalu link,
atau ikuti wizard CLI. Isi seluruh environment backend pada aplikasi yang
tepat sebelum menjalankan deployment yang membutuhkan database. Simpan
DATABASE_URL, JWT_SECRET_KEY, token Bedrock dan kredensial AWS sebagai secrets.
.fastapicloudignore mengecualikan .env, virtual environment, cache dan tes.

Catat URL yang benar-benar diberikan oleh FastAPI Cloud (domain default
*.fastapicloud.dev). Health check: /health; Swagger: /docs. /health hanya
memeriksa proses aplikasi; Bedrock/database harus diuji melalui fitur aplikasi.

Jangan menjalankan migrasi lama sebagai build command: build frontend/backend
seharusnya tidak mengubah data production.

## Frontend: Vercel

1. Import repository GitHub dan pilih root directory **Frontend**.
2. Gunakan preset Next.js, install `npm ci`, build `npm run build`.
3. Isi NEXT_PUBLIC_API_URL dengan URL backend **ditambah /api/v1**.
4. Isi NEXT_PUBLIC_SITE_URL dengan URL frontend final.
5. Deploy, lalu pasang origin frontend itu pada FRONTEND_URL backend dan restart
   backend. Variabel NEXT_PUBLIC_* dimasukkan saat build; rebuild frontend jika
   berubah. Preview Vercel memiliki origin berbeda dari domain production.

## Pengujian dan checklist sesi 11

```sh
cd Backend
.venv/bin/python -m unittest discover -s tests -v
```

```sh
cd Frontend
npm run lint
npm run build
```

Jika Turbopack gagal karena lingkungan membatasi pembukaan port, verifikasi
build alternatif dengan `npm run build -- --webpack`.

- [ ] Backend publik: /health 200 dan /docs dapat dibuka melalui HTTPS.
- [ ] Frontend publik: login dan /about dapat dibuka melalui HTTPS.
- [ ] Register akun uji, login, logout, lalu login kembali.
- [ ] Generate itinerary, buka detail trip dan dashboard, lalu reload.
- [ ] Chat dua giliran, reload, lanjutkan percakapan yang sama.
- [ ] Pastikan akun kedua tidak melihat trip/percakapan/jurnal akun pertama.
- [ ] Buat catatan jurnal dan upload foto; cek persistensi setelah reload.
- [ ] Periksa data tersimpan di Neon dan tidak ada error CORS/500 di log.
- [ ] Buka URL tak dikenal untuk memeriksa halaman 404 dan favicon baru.
- [ ] Periksa loading/error recovery di React DevTools atau lingkungan uji.
- [ ] Uji dari ponsel dan minta teman mencoba alur lengkap; catat bug.
- [ ] Setelah review diff, commit file terkait sesi 11 dan push untuk deployment.
      Jangan memakai git add . tanpa meninjau perubahan lokal lain.
- [ ] Opsional: tag session-11 pada commit yang benar-benar sudah diverifikasi.

Template catatan beta test: perangkat/browser, langkah reproduksi, hasil yang
diharapkan, hasil aktual, screenshot bila perlu, dan status perbaikan.

## Troubleshooting

- CORS: FRONTEND_URL harus sama persis dengan origin browser.
- 404 API: pastikan NEXT_PUBLIC_API_URL berakhiran /api/v1 dan rebuild frontend.
- Koneksi database: periksa connection string/TLS dan log backend tanpa
  membagikan password.
- Bedrock gagal: periksa token, region, akses model dan kuota layanan.
- Foto gagal: periksa izin bucket S3 serta kredensial IAM backend.

Referensi platform: [FastAPI Cloud: existing project](https://fastapicloud.com/docs/getting-started/existing-project/),
[Vercel monorepos](https://vercel.com/docs/monorepos),
[Vercel environment variables](https://vercel.com/docs/environment-variables),
[Neon connection errors](https://neon.com/docs/connect/connection-errors).
