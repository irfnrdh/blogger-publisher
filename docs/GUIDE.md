# 📚 Panduan Lengkap Penggunaan (Guide)

Selamat datang di pusat dokumentasi resmi **Blogger Publisher CLI** `v1.3.2`. Dokumen ini dirancang untuk mengajarkan Anda dari pemula hingga menjadi *Master Autoblogger*.

---

## 1. Cara Tercepat: Interactive TUI (Rekomendasi)

Cara paling mudah untuk memulai. Cukup buat folder kosong dan jalankan:

```bash
mkdir my-blog && cd my-blog
blogger-publisher
```

Sistem akan memunculkan menu interaktif berwarna. Pilih **🏗️ Init Workspace** dan ikuti panduan langkah demi langkah untuk:
1. Mengisi kredensial Google (CLIENT_ID, CLIENT_SECRET, BLOG_ID)
2. Memilih Image CDN (Drive, ImgBB, Cloudinary, GitHub)
3. Membuat kerangka folder (`articles/`, `images/`) otomatis
4. Menyiapkan contoh artikel Markdown perdana

Kredensial tersimpan secara aman di **Global Config** (`~/.blogger-publisher/config.json`) — berlaku di semua folder di komputer Anda.

---

## 2. Setup Manual (Lanjutan)

Jika ingin mengatur kredensial secara manual:

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat *Project* baru dan aktifkan **Blogger API** & **Google Drive API**
3. Masuk ke *Credentials* > Buat **OAuth client ID** (tipe *Desktop app*)
4. Catat `CLIENT_ID` dan `CLIENT_SECRET` Anda
5. Jalankan `blogger-publisher` → pilih **Init Workspace** → masukkan kredensial
6. Pilih menu **🔑 Auth** → browser akan terbuka → login Google → Refresh Token tersimpan otomatis

---

## 3. Struktur Frontmatter (Wajib)

Setiap file `.md` harus memiliki metadata YAML (Frontmatter) di baris pertama:

```yaml
---
title: "Judul Artikel Anda"
slug: "url-kustom-seo-friendly"
description: "Meta deskripsi untuk Google Search."
labels: ["Kategori 1", "Kategori 2"]
blog_id: "Isi jika ingin publish ke blog spesifik (opsional)"
date: "2026-12-31T10:00:00Z"
status: "draft"   # Ubah ke 'published' untuk publish, 'deleted' untuk hapus
---
```

> ⚠️ Jika ada error Frontmatter (misal typo di `status`), sistem akan menampilkan pesan ramah dan melewati file tersebut tanpa crash.

---

## 4. Menambahkan Gambar (Multi-CDN)

Tulis gambar dengan format Markdown standar:
```md
![Teks Alternatif](../images/foto-kucing.png)
```

Saat `publish` dijalankan, sistem akan:
1. Mendeteksi `foto-kucing.png` sebagai gambar lokal (via **Magic Bytes** detection)
2. Mengunggahnya ke CDN sesuai konfigurasi (Drive, ImgBB, Cloudinary, atau GitHub)
3. Mengubah Markdown menjadi URL publik permanen
4. Menyimpan URL baru di file `.md` lokal (agar tidak diupload 2x)

---

## 5. Perintah CLI (Mode Lanjutan / CI/CD)

Jika sudah dikonfigurasi, Anda bisa melewati menu interaktif:

| Perintah | Fungsi |
|---|---|
| `blogger-publisher` | Buka menu TUI interaktif |
| `blogger-publisher auth` | Login OAuth ke Google |
| `blogger-publisher publish [folder]` | Publish semua artikel di folder |
| `blogger-publisher publish -` | Publish dari STDIN (piping) |
| `blogger-publisher pull [folder]` | Download artikel dari Blogger ke Markdown |

**Contoh STDIN Pipeline:**
```bash
echo "---\ntitle: 'Halo'\nstatus: 'draft'\n---\nIsi artikel" | blogger-publisher publish -
```

---

## 6. Fitur Hapus (Delete)

Jangan hapus file `.md` langsung dari file manager!

Cara yang benar:
1. Buka file `.md` yang ingin dihapus
2. Ubah frontmatter: `status: "deleted"`
3. Jalankan `blogger-publisher publish`
4. Sistem menghapus artikel di Blogger dan menghapus file lokal secara otomatis

---

## 7. MCP Server (Kelola Blog via AI)

`blogger-publisher` dilengkapi **MCP Server** dengan 25 tools. Setelah install, daftarkan di MCP config AI Anda:

**`~/.gemini/antigravity/mcp_config.json`** (Antigravity):
```json
{
  "mcpServers": {
    "blogger": {
      "command": "mcp-blogger-server"
    }
  }
}
```

Restart AI client, lalu cukup ucapkan:
- *"List semua blogku"*
- *"Buat post baru berjudul 'AI di Era Modern' sebagai draft"*
- *"Publish post ID 12345 di blog ID 67890"*
- *"Tampilkan semua komentar pending dan setujui yang sopan"*

**Tools yang tersedia:**
- 📰 **Blogs (4)**: `list_blogs`, `get_blog`, `get_blog_by_url`, `get_blog_info`
- 📝 **Posts (9)**: `list_posts`, `get_post`, `search_posts`, `create_post`, `update_post`, `publish_post`, `revert_post`, `delete_post`, `get_post_by_path`
- 📄 **Pages (6)**: `list_pages`, `get_page`, `create_page`, `update_page`, `publish_page`, `delete_page`
- 💬 **Comments (6)**: `list_comments`, `list_all_comments`, `get_comment`, `approve_comment`, `mark_comment_spam`, `delete_comment`

---

## 8. Auto Updater

Setiap kali `blogger-publisher` dijalankan, sistem diam-diam mengecek versi terbaru dari NPM. Jika ada versi baru, Anda akan ditanya:

```text
✨ Update Tersedia! v1.3.2 → v1.4.0
? Apakah Anda ingin memperbarui otomatis sekarang? (Y/n)
```

Tekan `Y` dan sistem akan mengunduh dan menginstal versi terbaru secara otomatis.
