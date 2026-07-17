# Blogger Auto-Publisher (Markdown to Blogger API)

Sebuah *tool automation* open-source berbasis Node.js yang memungkinkan Anda (atau agen AI Anda) untuk melakukan publikasi artikel secara massal (*bulk publish*) dari format Markdown (`.md`) ke Google Blogger, lengkap dengan dukungan penjadwalan dan pembaruan (*sync/update*) otomatis!

Sangat cocok digunakan sebagai penghubung (*bridge*) jika Anda memiliki AI yang dapat men-generate artikel markdown dan ingin secara otomatis mem-posting artikel tersebut ke blog Anda.

## ✨ Fitur Utama
- **Bulk Upload**: Otomatis memindai dan mem-publish seluruh file markdown di dalam folder `articles/`.
- **YAML Frontmatter Support**: Dukungan meta-data (Judul, Tanggal, Label) di dalam file `.md`.
- **Smart Update & Deduplication**: Script otomatis menyisipkan `blogger_id` dan `updated_at` ke file lokal saat berhasil terbit. Jika file yang sama diubah (diedit) dan script dijalankan kembali, artikel di Blogger akan diperbarui (Mode Edit), bukan diduplikat!
- **Scheduling**: Jika Anda mengatur `date` di *Frontmatter* pada tanggal masa depan, Blogger akan menjadwalkan publikasinya secara otomatis.
- **Anti-Spam / Rate Limit Protection**: Terdapat jeda (*delay*) otomatis setiap kali memproses artikel untuk mencegah pemblokiran dari proteksi anti-spam Google API.

## 🚀 Instalasi

1. Clone repository ini:
   ```bash
   git clone https://github.com/username-anda/blogger-publisher.git
   cd blogger-publisher
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

## ⚙️ Persiapan Google Cloud (Kredensial API)
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat Project baru dan aktifkan **Blogger API v3**.
3. Buat Kredensial baru -> **OAuth 2.0 Client IDs**.
4. Pilih Tipe Aplikasi: **Web application**.
5. Tambahkan `http://localhost:3030/oauth2callback` di bagian **Authorized redirect URIs**.
6. Simpan dan copy **Client ID** serta **Client Secret** Anda ke dalam file `.env`.
7. Dapatkan juga **Blog ID** Anda (dari dashboard Blogger Anda) dan masukkan ke `.env`.

## 🔑 Mendapatkan Refresh Token
Untuk membuat otomatisasi berjalan selamanya tanpa perlu otorisasi ulang, jalankan:
```bash
node get-token.js
```
Klik tautan yang muncul, login dengan akun Google Anda, dan *copy* **Refresh Token** yang muncul di layar. Tempel (paste) kode tersebut di file `.env`.

## 📖 Cara Menggunakan

1. Buat atau taruh file Markdown `.md` Anda di dalam folder `articles/`.
2. Pastikan file Anda menggunakan **Frontmatter** seperti ini:
   ```yaml
   ---
   title: "Artikel Buatan AI"
   date: "2026-08-20T08:00:00+07:00" 
   labels: ["AI", "Tech"]
   ---
   Mulai menulis isi artikel Anda di sini...
   ```
3. Jalankan perintah publikasi:
   ```bash
   node publisher.js
   ```
4. Script akan memproses semua artikel dan jika sukses, file Anda akan diperbarui dengan data `blogger_id` dan `updated_at`.

## 📜 Lisensi
Project ini dilisensikan di bawah lisensi MIT - lihat file [LICENSE](LICENSE) untuk detailnya.
