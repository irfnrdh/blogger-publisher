# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-07-18

### Added
- **Interactive TUI**: Developer Experience (DX) kelas atas menggunakan `@clack/prompts` dan `picocolors`.
- **Project Scaffolding**: Menjalankan `blogger-publisher` (tanpa argumen) sekarang meluncurkan menu interaktif. Menu "Init Workspace" akan memandu pengguna membuat `.env`, `.gitignore`, kerangka folder `articles/` dan `images/`, membuat artikel Markdown sampel perdana, serta menginjeksi `AGENT.md` secara otomatis ke dalam ruang kerja.

### Changed
- **CLI Default Action**: Menjalankan `blogger-publisher` tanpa perintah spesifik kini meluncurkan TUI alih-alih menampilkan menu *help* bawaan.

## [1.2.0] - 2026-07-18

### Added
- **Multi-CDN Image Uploads**: Arsitektur modular di `lib/uploaders` yang mendukung `drive`, `imgbb`, `cloudinary`, dan `github`. Kini bebas limit *bandwidth*!
- **Fitur Pull (2-Way Sync)**: Command baru `blogger-publisher pull` untuk menyedot (download) artikel lama dari Blogger dan mengonversinya menjadi Markdown menggunakan `turndown`.
- **Multi-Blog / Multi-Niche Support**: Tambahan flag `--blog <id>` dan meta `blog_id` pada Frontmatter untuk mem-publish ke blog yang berbeda dari satu script yang sama.
- **Fitur Delete & Revert**: Penggunaan meta `status: "deleted"` untuk menghapus postingan secara permanen dari server Google, dan `status: "draft"` untuk me-revert postingan yang sudah tayang kembali ke draft.

### Changed
- Pemisahan logika upload gambar ke modul terpisah (`lib/uploader.js`).
- Migrasi *dependencies* dengan penambahan `turndown`, `axios`, dan `cloudinary`.

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
