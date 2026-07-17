# Changelog

Semua perubahan penting pada project ini akan didokumentasikan di file ini.

## [1.0.0] - 2026-07-17

### Ditambahkan
- **Bulk Publish Support**: Fitur untuk mencari dan membaca seluruh file Markdown (`.md`) secara rekursif di dalam direktori `articles/`.
- **YAML Frontmatter Parsing**: Menggunakan `gray-matter` untuk membaca metadata spesifik dari artikel seperti:
  - `title`: Judul artikel.
  - `date`: Penjadwalan tanggal terbit (*scheduled publish*).
  - `labels`: Tag/kategori artikel.
  - `status`: Dukungan untuk status "draft".
- **Smart Update & Deduplication**:
  - Script secara otomatis mendapatkan `blogger_id` dari API setelah berhasil mengunggah.
  - Menyuntikkan (write-back) parameter `blogger_id` dan `updated_at` ke dalam file `.md` asli menggunakan RegEx untuk mempertahankan struktur format AI.
  - Saat file diproses ulang, script otomatis beralih ke Mode *Patch* (Update) bukan Insert (Buat Baru) berdasarkan eksistensi `blogger_id`.
- **OAuth2 Flow Automator**: Script pembantu `get-token.js` dengan server lokal sementara (menggunakan *Express*) untuk memudahkan perolehan `REFRESH_TOKEN` dari browser dengan mudah.
- **Rate Limit Protection**: Penambahan mekanisme *delay* 3 detik antar *request* API untuk meminimalisasi risiko terkena blokir sistem antispam Blogger (429 Too Many Requests).
- **Konfigurasi Lingkungan (Environment)**: Menggunakan `dotenv` untuk pengelolaan rahasia kunci API (`.env`).
- **Open Source Ready**: Penambahan `README.md`, `LICENSE` (MIT), dan `.gitignore`.
