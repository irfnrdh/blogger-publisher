# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-07-17

### Added
- **NPM CLI Support**: Perintah `node publisher.js` sekarang digantikan oleh perintah global `blogger-publisher publish` via paket `commander`.
- **Auto Image Upload**: Otomatis mendeteksi markdown link untuk gambar lokal, meng-upload-nya ke Google Drive via API (`/thumbnail` endpoint), dan mengganti link markdown sebelum tayang.
- **Custom URL Slug**: Kemampuan memanipulasi Blogger API untuk menerapkan permalink kustom yang ramah SEO.
- **Search Description**: Menyisipkan meta deskripsi SEO (`customMetaData`) secara programatik.
- **Smart Hashing (`content_hash`)**: Script menggunakan Hash MD5 untuk membandingkan konten lokal dan cloud. Artikel yang tidak berubah (Hash sama) tidak akan diproses (Menghemat kuota API Google dan mempercepat performa *batching*).
- **AI Agent Support**: Menambahkan `AGENT.md` dan `.agents/skills/autoblogging/SKILL.md` untuk mengajari AI Agent bagaimana cara memproduksi dan mem-publish tulisan secara *autopilot*.

### Changed
- Refaktor folder dan struktur dari skrip kotor (root) menjadi struktur *library* standar NPM (`/bin`, `/lib`).
- Pembersihan file script `publish.js` dan `get-token.js` yang lama.

## [1.0.0] - 2026-07-17
### Added
- Rilis inisial! Fitur inti mem-publish dan me-*replace* (Update) artikel markdown menggunakan YAML Frontmatter ke Blogger API v3.
