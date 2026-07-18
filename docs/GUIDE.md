# 📚 Panduan Lengkap Penggunaan (Guide)

Selamat datang di pusat dokumentasi resmi **Blogger Publisher CLI** `v1.3.4+` (Pro Foundation). Dokumen ini dirancang untuk mengajarkan Anda dari pemula hingga menjadi *Master Autoblogger* dengan dukungan **Multi-Account** dan **Local API Server**.

---

## 1. Cara Tercepat: Interactive TUI (Rekomendasi)

Cara paling mudah untuk memulai. Cukup buka terminal dan jalankan:

```bash
blogger-publisher
```

Sistem akan memunculkan menu interaktif berwarna layaknya Vercel CLI. 
1. Pilih **🔑 Auth** untuk login ke akun Google.
2. Anda akan diminta memasukkan nama unik untuk akun Anda (contoh: `klien-seo`).
3. Browser akan terbuka. Login, berikan akses, dan token akan tersimpan otomatis dan aman di `~/.blogger-publisher/accounts/klien-seo/`.
4. Anda bisa mengulangi langkah ini berkali-kali untuk 100+ akun Google yang berbeda!

Saat Anda memilih menu **🚀 Publish**, TUI akan menampilkan **dropdown** akun dan blog tujuan Anda. Sangat praktis!

---

## 2. API Server & Background Scheduler (Pro Mode)

Jika Anda ingin membuat Dashboard Web sendiri, atau menggunakan skrip otomatisasi yang kompleks, hidupkan *engine* API lokal:

```bash
blogger-publisher serve --port 1826
```

Saat server berjalan, Anda mendapatkan akses ke REST API dan **Server-Sent Events (SSE)** untuk memantau progress *upload* secara *real-time*. Server ini juga menangani penjadwalan (Cron) artikel di latar belakang.

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
| `blogger-publisher auth <nama-akun>` | Login OAuth ke Google dengan identitas spesifik |
| `blogger-publisher serve --port 1826` | Jalankan API Server & Scheduler di port tertentu |
| `blogger-publisher publish [folder] -a <akun>` | Publish semua artikel menggunakan kredensial akun tertentu |
| `blogger-publisher pull [folder] -a <akun>` | Download artikel dari Blogger jadi file Markdown |

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

---

## 8. Auto Updater

Setiap kali `blogger-publisher` dijalankan secara interaktif, sistem diam-diam mengecek versi terbaru dari NPM. Jika ada versi baru, Anda akan ditanya:

```text
✨ Update Tersedia! v1.3.4 → v1.4.0
? Apakah Anda ingin memperbarui otomatis sekarang? (Y/n)
```

Tekan `Y` dan sistem akan mengunduh dan menginstal versi terbaru secara otomatis.
