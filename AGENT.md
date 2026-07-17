# 🤖 panduan Untuk AI Agent (AGENT.md)

File ini ditujukan untuk AI Agent yang akan berinteraksi dengan *repository* ini guna menjalankan tugas **Auto-Blogging**, **Smart Batching**, atau otomatisasi konten lainnya.

## 1. Identitas Project
Ini adalah `blogger-publisher`, sebuah *Command Line Tool* berbasis Node.js yang berfungsi untuk membaca file Markdown (`.md`) dan secara otomatis mem-publish-nya ke platform Blogger (Blogspot) menggunakan Google Blogger API v3 & Google Drive API (untuk *hosting* gambar lokal).

## 2. Kemampuan Utama (Core Features)
1. **Smart Sync (Hashing):** Script tidak akan me-republish artikel jika isinya tidak ada yang diubah (berdasarkan `content_hash`).
2. **Multi-CDN Image Upload:** Mampu mengunggah gambar Markdown lokal secara otomatis ke Google Drive, ImgBB, Cloudinary, atau GitHub (berdasarkan pengaturan di file `.env`).
3. **Advanced SEO:** Mendukung *custom permalink* dan *meta search description*.
4. **2-Way Sync (Pull & Publish):** Anda bisa men-download semua artikel dari Blogger menjadi Markdown (`blogger-publisher pull`), atau mengirimnya kembali.
5. **Multi-Blog Support:** Dapat me-manage ratusan blog berbeda dalam 1 repo. Cukup selipkan `blog_id` pada Frontmatter.

## 3. Aturan Membuat File Markdown (Frontmatter)
Setiap kali Anda (AI Agent) diminta untuk membuat artikel baru, **Anda WAJIB mengikuti format YAML Frontmatter ini di baris pertama file `.md`:**

```yaml
---
title: "[Wajib] Judul Artikel Menarik"
slug: "[Opsional] url-ramah-seo"
description: "[Opsional] Ringkasan singkat meta description untuk Google"
labels: ["[Opsional]", "Kategori 1", "Berita"]
blog_id: "[Opsional] Isi dengan ID Blogger spesifik jika User punya banyak blog"
status: "[Opsional] Isi 'draft' untuk menyembunyikan, atau 'deleted' untuk menghapus"
date: "[Opsional] Format ISO-8601, contoh: 2026-07-25T10:00:00Z untuk penjadwalan"
---
```

### Aturan Khusus Penghapusan (DELETE):
Jika User memerintahkan Anda untuk menghapus suatu artikel, **JANGAN** menghapus file `.md`-nya! Cukup ubah Frontmatter artikel tersebut menjadi `status: "deleted"`, lalu jalankan `blogger-publisher publish`. Script akan otomatis menghapusnya dari server Google lalu membuang file lokalnya ke tong sampah.

# Konten Artikel
Isi artikel dimulai di sini...
```

**⚠️ PERINGATAN UNTUK AI AGENT:**
Saat Anda membaca kembali file `.md` yang sudah di-publish, Anda akan melihat `blogger_id` dan `content_hash` disuntikkan ke dalam frontmatter. **JANGAN PERNAH** menghapus atau mengubah dua variabel tersebut secara manual, karena itu adalah *database tracker* sistem ini.

## 4. Workflows (Skenario Auto-Blogging)

### A. Skenario "News Auto-Blogging" (Real-time)
Jika *User* meminta Anda untuk membuat website berita otomatis:
1. AI Agent memanggil alat pencarian Web/API Berita untuk mendapatkan berita terbaru.
2. AI Agent menuliskan ulang berita tersebut dalam format Markdown.
3. Simpan file sebagai `articles/berita-<topik>-<tanggal>.md`.
4. Jalankan *Command*: `blogger-publisher publish ./articles`
5. Artikel akan otomatis tayang saat itu juga.

### B. Skenario "Smart Batching" (Penjadwalan 1 Bulan Penuh)
Jika *User* meminta dibuatkan 30 artikel untuk tayang setiap hari selama sebulan:
1. AI Agent mem-generate 30 file Markdown secara massal.
2. Di masing-masing file, sisipkan *Frontmatter* `date`. 
   - Artikel 1: `date: "2026-08-01T08:00:00Z"`
   - Artikel 2: `date: "2026-08-02T08:00:00Z"`
   - Dst.
3. Simpan semua file di folder `articles/`.
4. Jalankan *Command*: `blogger-publisher publish`
5. Script akan mem-publish semuanya ke Blogger. Sistem internal Blogger akan menangkap parameter `date` tersebut, dan secara otomatis artikel hanya akan tayang satu per satu setiap harinya pada pukul 08:00.

## 5. Menjalankan Command
Project ini sudah terinstal secara global di *environment* lokal.
- Untuk otentikasi awal (jika token kedaluwarsa): `blogger-publisher auth`
- Untuk publikasi massal: `blogger-publisher publish [path_folder]` (Secara default path folder adalah `./articles`).
