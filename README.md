<div align="right">🌐 <a href="#english-version">English version below</a></div>

# blogger-publisher (v1.3.4+)

**Mesin Publikasi Multi-Akun & API Server Lokal untuk Blogger.com (Markdown & AI Native).**

[![npm version](https://img.shields.io/npm/v/blogger-publisher)](https://www.npmjs.com/package/blogger-publisher)
[![npm downloads](https://img.shields.io/npm/dm/blogger-publisher)](https://www.npmjs.com/package/blogger-publisher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Sebuah *developer-first* ekosistem (CLI + API Server + MCP) untuk mengelola, mensinkronkan, dan mempublikasikan artikel Markdown ke Google Blogger secara otomatis. Dirancang dengan kapabilitas Multi-Akun (Pro) yang sangat cocok untuk *agency*, SaaS, maupun integrasi AI (seperti Obsidian Vault).

---

## 🌟 Fitur Unggulan Baru (Pro Foundation)

- 👥 **Multi-Account Native:** Kelola 100+ akun Google dan Blog berbeda dari satu terminal. Tidak ada lagi konflik `REFRESH_TOKEN` di `.env`.
- 🔌 **Local API Server (Port 1826):** *Headless mode* dengan REST API dan *Server-Sent Events* (SSE) untuk *real-time publish streaming*. Sangat mudah diintegrasikan dengan Next.js / React Dashboard Anda sendiri!
- ⏰ **Built-in Background Scheduler:** Jadwalkan publikasi artikel (Cron-style) yang akan dijalankan di latar belakang oleh mesin server.
- 🛡️ **Enterprise Security:** Mencegah celah *Path Traversal*, *Timing Attacks*, dan mengamankan XSS secara *out-of-the-box*.
- 🤖 **MCP Server (25 Tools):** Kontrol penuh blog Anda menggunakan prompt AI (Natural Language).

---

## 🚀 Quick Start (Interactive TUI)

Tinggalkan cara lama. Gunakan Terminal UI (TUI) interaktif kami yang sudah secanggih Vercel CLI.

```bash
npm install -g blogger-publisher
blogger-publisher
```
- TUI akan memandu Anda untuk **Setup Workspace**.
- TUI akan meminta Anda **Login Akun Google (Multi-Account)** secara elegan.
- Saat Anda memilih menu **Publish**, Anda tinggal memilih Akun & Blog dari sebuah dropdown interaktif!

---

## 💻 CLI Commands (Power User)

Bagi Anda yang menyukai skrip otomatis (*cron/bash*), CLI ini mendukung kontrol mutlak:

| Perintah | Deskripsi |
|---|---|
| `blogger-publisher` | Buka TUI Interaktif (Smart Mode) |
| `blogger-publisher auth <nama-akun>` | Login OAuth untuk akun tertentu (misal: `auth client-a`) |
| `blogger-publisher serve` | Menjalankan **Local API Server** di Port `1826` |
| `blogger-publisher publish [folder] -a <akun>` | Publish artikel ke akun tertentu |
| `blogger-publisher pull [folder] -a <akun>` | Tarik (Sync) artikel dari Blogger jadi Markdown |

---

## 🔌 API Server Lokal

Menyiapkan Dashboard SaaS atau UI Web kustom? Hidupkan *engine* API lokal:

```bash
blogger-publisher serve
```
**API Endpoints (Membutuhkan `X-API-Key` yang tersimpan di `~/.blogger-publisher/api.key`):**
- `GET /api/accounts` — Menampilkan semua akun yang terotorisasi.
- `GET /api/accounts/:id/blogs` — Menarik daftar Blog dari sebuah akun.
- `POST /api/publish` — Publikasi file/folder dengan streaming SSE (Real-Time UI).
- `POST /api/schedules` — Daftarkan jadwal Cron.

---

## 📁 Frontmatter Artikel & Multi-CDN

Simpan artikel di folder mana saja. Setiap file Markdown dilengkapi metadata untuk routing:

```yaml
---
title: "Judul Artikel Pro Anda"
slug: "url-kustom-seo"
description: "Meta deskripsi untuk Google."
labels: ["Teknologi", "AI"]
status: "draft"
date: "2026-08-01T08:00:00Z"
---
```

Tulis gambar secara lokal `![foto](./images/foto.png)`. Sistem akan mengunggah gambar tersebut secara otomatis ke salah satu CDN berikut dan mereplace URL-nya:
- **Google Drive** (Default)
- **ImgBB**
- **Cloudinary**
- **GitHub + jsDelivr**

---

<a name="english-version"></a>

# blogger-publisher — English

**Multi-Account Publishing Engine & Local API Server for Blogger.com (Markdown & AI Native).**

A developer-first ecosystem (CLI + API Server + MCP) to manage, sync, and publish Markdown articles to Google Blogger automatically. Designed with robust Multi-Account capabilities (Pro Foundation) suitable for agencies, custom SaaS dashboards, or AI vaults (like Obsidian).

---

## 🌟 New Key Features (Pro Foundation)

- 👥 **Native Multi-Account:** Manage 100+ Google Accounts and Blogs from a single machine. No more `.env` file token conflicts!
- 🔌 **Local API Server (Port 1826):** Run in headless mode! Exposes a REST API with Server-Sent Events (SSE) for real-time progress. Perfect for connecting your own Next.js / React Dashboards.
- ⏰ **Built-in Scheduler:** Schedule your posts in the background seamlessly.
- 🛡️ **Enterprise Security:** Hardened against Path Traversal, Timing Attacks, and Symlink bypasses.
- 🤖 **MCP Server (25 Tools):** Manage your entire blog through natural language in any AI client (Antigravity, Cursor, etc.).

---

## 🚀 Quick Start (Interactive TUI)

Say goodbye to manual configs. Use our smart interactive Terminal UI (TUI) that feels like Vercel CLI.

```bash
npm install -g blogger-publisher
blogger-publisher
```
- It will guide you to **Setup Workspace**.
- It provides a seamless **OAuth Login** for any named account.
- When you click **Publish**, you select the Target Account and Blog from a sleek dropdown menu!

---

## 💻 CLI Commands (Power User)

For those who love writing bash scripts or cron jobs:

| Command | Description |
|---|---|
| `blogger-publisher` | Open interactive TUI (Smart Mode) |
| `blogger-publisher auth <account-name>` | OAuth Login for a specific account identity |
| `blogger-publisher serve` | Spin up the **Local API Server** & Scheduler on Port `1826` |
| `blogger-publisher publish [folder] -a <account>` | Publish articles using a specific account |
| `blogger-publisher pull [folder] -a <account>` | Sync Blogger posts down as Markdown |

---

## 🔌 Local API Server

Building a SaaS Dashboard or Custom UI? Spin up the API engine:

```bash
blogger-publisher serve
```
**API Endpoints (Requires `X-API-Key` stored at `~/.blogger-publisher/api.key`):**
- `GET /api/accounts` — List all authorized accounts.
- `GET /api/accounts/:id/blogs` — Fetch all Blogger properties for an account.
- `POST /api/publish` — Publish a file/folder with SSE Streaming (perfect for real-time UI bars).
- `POST /api/schedules` — Register a Cron schedule.

---

## 📚 Documentation

- [Full Guide](docs/GUIDE.md)
- [AI Agent Instructions](AGENT.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## 📄 License

MIT © [irfnrdh](https://github.com/irfnrdh)
