# Changelog

All notable changes to this project will be documented in this file.

## [1.3.4] - 2026-07-18

### Fixed
- **SECURITY (Secrets Leak)**: Corrected `.npmignore` to properly exclude `.env` and `*.json` credentials from being packaged into NPM tarballs. (Version `1.3.3` was deprecated due to this issue).

## [1.3.3] - 2026-07-18

### Added
- **Official Obsidian Plugin (`obsidian-blogger-publisher`)**: Native Obsidian integration for 1-click publishing directly from your vault! Includes Ribbon Icon, Command Palette support, Settings Tab, and `child_process` execution.
- **Obsidian Setup Guide**: Added `docs/OBSIDIAN.md` with instructions for Shell Commands integration and a ready-to-use Frontmatter template.

### Fixed
- **SECURITY (Path Traversal)**: Fixed a medium-risk vulnerability in `lib/publisher.js` where malicious markdown files could exfiltrate sensitive files outside the current working directory during image uploads.
- **SECURITY (Supply Chain Risk)**: Removed automatic `execSync('npm install...')` from the auto-updater to mitigate potential supply chain attacks. The updater now only notifies users via console logs.
- **Command Injection**: Fixed a command injection vulnerability in the Obsidian plugin by replacing `child_process.exec` with the safer `child_process.execFile`.
- **Bulk Publisher Reliability**: Wrapped `fs.unlinkSync` and `fs.readFileSync` with `try...catch` in the core publisher logic to prevent the entire batch process from crashing when encountering locked or unreadable files.
- **MCP Server Stability**: Fixed Unhandled Promise Rejections in the MCP Server (`read_resource` and `get_prompt`) by properly wrapping them in `try...catch`.
- **Image URL Parsing**: `decodeURIComponent()` is now applied to local image paths, correctly handling files with spaces (e.g. `image%20name.png`). Uploads for Base64 Data URIs (`data:image/...`) are correctly bypassed.
- **Frontmatter Regex**: Improved regex patterns (using multiline start anchors) to safely update `updated_at` and `content_hash` without corrupting other markdown elements.
- **CLI Error Handling**: Improved error parsing with Optional Chaining (`?.`) to prevent crashes during unknown Axios error responses.

## [1.3.2] - 2026-07-18

### Added
- **MCP Server (25 Tools!)**: `blogger-publisher` kini juga menjadi **MCP Server** lengkap. Setelah install, binary `mcp-blogger-server` tersedia secara otomatis. Daftarkan di `mcp_config.json` Anda dan AI agent apa pun bisa mengelola blog Anda via percakapan natural.
  - **Blogs**: `list_blogs`, `get_blog`, `get_blog_by_url`, `get_blog_info`
  - **Posts**: `list_posts`, `get_post`, `get_post_by_path`, `search_posts`, `create_post`, `update_post`, `publish_post`, `revert_post`, `delete_post`
  - **Pages**: `list_pages`, `get_page`, `create_page`, `update_page`, `publish_page`, `delete_page`
  - **Comments**: `list_comments`, `list_all_comments`, `get_comment`, `approve_comment`, `mark_comment_spam`, `delete_comment`
- **MCP Resources**: `blogger://blogs`, `blogger://config`
- **MCP Prompts**: `create_seo_post`, `moderate_comments`, `blog_audit`

### Added
- **Global Configuration**: Pengguna kini menyimpan kredensial di `~/.blogger-publisher/config.json`. Anda cukup melakukan otentikasi sekali seumur hidup dan bisa nge-blog dari *folder* mana saja tanpa memikirkan `.env`.
- **Frontmatter Zod Validation**: Menambahkan sistem keamanan ekstra untuk mencegah `blogger-publisher` *crash* saat ada salah ketik (*typo*) pada metadata artikel.
- **Auto Updater**: Menambahkan sistem pemeriksa pembaruan versi NPM secara *real-time*.
- **Magic Bytes Image Detection**: Meningkatkan keandalan pengunggah gambar (*uploader*) dengan langsung membaca *binary header* ketimbang hanya mengandalkan ekstensi `.jpg` atau `.png`.
- **Stdin Pipeline Support**: Penambahan fitur `publish -` untuk mempublikasikan artikel secara langsung dari *pipeline* terminal (cocok untuk integrasi dengan CLI/bot AI lain).

### Changed
- Perbaikan struktur logika penanganan error (*Unified Error Handling*) sehingga terminal kini lebih rapi tanpa tumpukan pesan *stack trace* panjang.

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
