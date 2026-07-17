# 📚 Panduan Lengkap Penggunaan (Guide)

Selamat datang di pusat dokumentasi resmi **Blogger Publisher CLI**. Dokumen ini dirancang untuk mengajarkan Anda dari pemula hingga menjadi *Master Autoblogger*.

## 1. Setup Awal (Authentication)
Blogger Publisher menggunakan OAuth2 dari Google Cloud Console. Ini wajib agar script bisa mengontrol blog Anda.

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat *Project* baru dan aktifkan **Blogger API** & **Google Drive API**.
3. Masuk ke *Credentials* (Kredensial) > Buat **OAuth client ID** (Pilih tipe *Desktop app*).
4. Download file JSON-nya, rename menjadi `credentials.json` dan taruh di folder proyek ini.
5. Jalankan `blogger-publisher auth`. Browser akan terbuka untuk meminta izin Anda. Setelah sukses, file `token.json` akan tercipta.

## 2. Struktur Frontmatter (Wajib)
Setiap file `.md` harus memiliki metadata YAML (Frontmatter) di baris pertama:

```yaml
---
title: "Judul Artikel Anda"
slug: "url-kustom-seo-friendly"
description: "Meta deskripsi untuk Google Search."
labels: ["Kategori 1", "Kategori 2"]
blog_id: "Isi jika ingin mempublish ke blog spesifik (opsional)"
date: "2026-12-31T10:00:00Z"
status: "draft" # Ubah ke 'deleted' untuk menghapus
---
```

## 3. Menambahkan Gambar (Multi-CDN)
Anda cukup menuliskan gambar dengan format Markdown standar:
`![Teks Alternatif](../images/foto-kucing.png)`

Saat Anda menjalankan `publish`, sistem akan:
1. Mendeteksi bahwa `foto-kucing.png` adalah gambar lokal.
2. Mengunggahnya ke CDN (Google Drive, ImgBB, atau Cloudinary) sesuai setting `.env` Anda.
3. Mengubah teks markdown tadi menjadi `![Teks Alternatif](https://url-cdn.com/foto-kucing.png)`.
4. Mengamankan URL CDN tersebut di dalam file `.md` lokal Anda (agar tidak di-upload 2 kali).

## 4. Perintah CLI (Command Line)
- **`blogger-publisher auth`**: Melakukan login OAuth ke akun Google.
- **`blogger-publisher publish <folder>`**: Memindai folder, mencocokkan hash, mengunggah gambar, dan mempublish artikel ke Blogger.
- **`blogger-publisher pull [folder]`**: Mengunduh seluruh artikel lama Anda dari Blogger menjadi file `.md` lengkap dengan *Frontmatter* siap diedit. (Default folder: `./articles-pulled`).

## 5. Fitur Hapus (Delete & Revert)
Jika Anda menghapus file `.md` secara manual dari laptop, artikel di Blogger **TIDAK** akan terhapus. 
Cara yang benar:
1. Jangan hapus file `.md`.
2. Ubah isi Frontmatter-nya menjadi `status: "deleted"`.
3. Jalankan `blogger-publisher publish`. Sistem akan menghapus artikel di server Google lalu menghapus file lokal Anda secara otomatis.
