# 💡 Studi Kasus Penggunaan (Case Studies)

Blogger Publisher bukan sekadar alat sederhana. Berikut adalah bagaimana para *Hacker* dan *Content Creator* memanfaatkan repositori ini di dunia nyata:

## Kasus 1: Autoblog AI Sepenuhnya (Hands-Free)
**Tujuan:** Membuat website yang mempublikasikan 5 berita harian tanpa campur tangan manusia.

**Cara Kerja:**
1. Anda membuat script AI (atau menggunakan AI Agent dari repo ini via `AGENT.md`).
2. Setiap jam 7 pagi, cron job (atau GitHub Actions) memerintahkan AI untuk membaca RSS berita terbaru.
3. AI menulis artikel 1000 kata berformat Markdown lengkap dengan Frontmatter dan menyimpannya di folder `articles/`.
4. Cron job mengeksekusi `blogger-publisher publish ./articles`.
5. Gambar yang dibuat AI dari *local path* akan di-upload ke ImgBB, dan artikel tayang secara otomatis.

## Kasus 2: Migrasi dari WordPress ke Blogger
**Tujuan:** Anda tidak ingin lagi membayar *hosting* bulanan WordPress dan ingin pindah ke Blogger yang gratis seumur hidup.

**Cara Kerja:**
1. Anda menggunakan *plugin* ekspor di WordPress untuk mendapatkan file `.md` (misalnya menggunakan *Gatsby/Hugo exporter*).
2. Anda memindahkan 500 file `.md` tersebut ke folder `articles/` di project ini.
3. Anda jalankan `blogger-publisher publish ./articles`.
4. Sistem akan dengan pintar meng-upload 500 gambar lokal Anda ke Cloudinary, dan mem-publish ke 500 artikel Blogger tanpa terkena *rate-limit* (berkat fitur *Smart Delay*).

## Kasus 3: Master Branch sebagai CMS
**Tujuan:** Menulis blog dari *smartphone* menggunakan aplikasi Markdown, lalu artikel otomatis tayang.

**Cara Kerja:**
1. Repo ini Anda unggah ke GitHub dan Anda pasang rahasia rahasia (`.env` dan kredensial) di **GitHub Secrets**.
2. Anda membuat GitHub Actions yang terpicu setiap kali ada perubahan pada folder `articles/`.
3. Saat Anda jalan-jalan, Anda menggunakan aplikasi seperti *Obsidian* atau *GitHub App* di HP untuk membuat file `.md` baru.
4. Saat Anda menekan *commit*, GitHub Actions berjalan, mengunggah gambar ke GitHub jsDelivr CDN, lalu melempar teksnya ke Google Blogger. 
5. CMS 100% gratis dengan pengalaman kelas dunia!
