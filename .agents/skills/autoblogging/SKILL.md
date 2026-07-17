---
name: autoblogging
description: Buat artikel SEO dan langsung publish ke Blogger secara otomatis (Smart Batching / Auto Blogging)
---

# Skill: Autoblogging
Skill ini mengubah Agent menjadi mesin pencetak konten blog otomatis. 

## Aturan Eksekusi (Standard Operating Procedure):
Ketika pengguna meminta Anda untuk menjalankan `autoblogging` atau meminta Anda "buatkan artikel tentang X dan tayangkan", ikuti langkah-langkah ini HANYA dengan 1 kali jalan tanpa banyak tanya:

1. **Riset & Tulis (Internal):** Buat sebuah artikel dalam format Markdown yang panjang, berbobot, dan ramah SEO sesuai dengan topik yang diminta.
2. **Format Frontmatter Wajib:** Letakkan blok YAML di baris paling atas artikel dengan format ini:
   ```yaml
   ---
   title: "[Judul Clickbait & Menarik]"
   slug: "[judul-ramah-seo]"
   description: "[Meta deskripsi SEO, maksimal 150 karakter]"
   labels: ["[Kategori Utama]", "[Sub-kategori]"]
   ---
   ```
   *(Catatan: Jika User meminta penjadwalan, tambahkan `date: "YYYY-MM-DDThh:mm:ssZ"`. Jika diminta untuk blog tertentu, tambahkan `blog_id: "ID"`. Jika diminta draft atau hapus, tambahkan `status: "draft"` atau `"deleted"`)*.
3. **Simpan File:** Gunakan tool `write_to_file` untuk menyimpan artikel tersebut ke dalam folder `./articles/` dengan nama file yang representatif (contoh: `./articles/topik-anda.md`).
4. **Eksekusi:** Gunakan tool `run_command` untuk menjalankan perintah:
   ```bash
   blogger-publisher publish
   ```
5. **Laporkan:** Berikan respon kepada pengguna bahwa artikel telah sukses ditulis dan dipublish (atau dijadwalkan) lengkap dengan URL hasilnya (jika sukses publish) yang tertera di log terminal.
