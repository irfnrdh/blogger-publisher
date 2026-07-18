---
> 🌐 **[English version below](#english-version)**

---

# blogger-publisher

**CLI + MCP Server lengkap untuk mengelola blog Blogger.com via Markdown & AI.**

[![npm version](https://img.shields.io/npm/v/blogger-publisher)](https://www.npmjs.com/package/blogger-publisher)
[![npm downloads](https://img.shields.io/npm/dm/blogger-publisher)](https://www.npmjs.com/package/blogger-publisher)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Sebuah *developer-first* CLI tool untuk mengelola, mensinkronkan, dan mempublikasikan artikel Markdown ke Google Blogger secara otomatis. Sangat cocok sebagai jembatan antara AI yang menghasilkan konten dengan blog Blogger Anda.

Untuk panduan AI Agent, lihat [AGENT.md](AGENT.md).

---

## 🤖 MCP Server (25 Tools — AI-Native)

`blogger-publisher` kini hadir dengan **MCP Server bawaan**. Daftarkan di AI client Anda dan kelola seluruh blog via percakapan natural — tanpa menyentuh terminal.

**Setelah install, daftarkan di MCP config:**
```json
{
  "mcpServers": {
    "blogger": {
      "command": "mcp-blogger-server"
    }
  }
}
```

**Tools tersedia:**
- 📰 **Blogs (4):** `list_blogs`, `get_blog`, `get_blog_by_url`, `get_blog_info`
- 📝 **Posts (9):** `list_posts`, `get_post`, `search_posts`, `create_post`, `update_post`, `publish_post`, `revert_post`, `delete_post`, `get_post_by_path`
- 📄 **Pages (6):** `list_pages`, `get_page`, `create_page`, `update_page`, `publish_page`, `delete_page`
- 💬 **Comments (6):** `list_comments`, `list_all_comments`, `get_comment`, `approve_comment`, `mark_comment_spam`, `delete_comment`

---

## 🚀 Quick Start (Interactive Mode)

```bash
npm install -g blogger-publisher
mkdir my-blog && cd my-blog
blogger-publisher
```

Menu interaktif akan memandu Anda melalui setup lengkap: kredensial Google, pilihan CDN, dan scaffolding folder.

## 📋 Perintah CLI

| Perintah | Fungsi |
|---|---|
| `blogger-publisher` | Menu interaktif TUI |
| `blogger-publisher auth` | Login OAuth ke Google |
| `blogger-publisher publish [folder]` | Publish semua artikel di folder |
| `blogger-publisher publish -` | Publish dari STDIN (pipe) |
| `blogger-publisher pull [folder]` | Download artikel dari Blogger |

## 📁 Frontmatter Artikel

```yaml
---
title: "Judul Artikel Anda"
slug: "url-kustom-seo"
description: "Meta deskripsi untuk Google."
labels: ["Teknologi", "AI"]
status: "draft"
date: "2026-08-01T08:00:00Z"
---
Konten artikel...
```

## 🖼️ Multi-CDN Images

Tulis gambar dengan format Markdown biasa `![alt](./images/foto.png)` — saat publish, sistem otomatis mengunggahnya ke CDN pilihan Anda dan mengganti URL-nya.

| CDN | Konfigurasi |
|---|---|
| Google Drive | Default, tanpa API key |
| ImgBB | `IMGBB_API_KEY` |
| Cloudinary | `CLOUDINARY_*` keys |
| GitHub + jsDelivr | `GITHUB_TOKEN` + `GITHUB_REPO` |

---

---

<a name="english-version"></a>

# blogger-publisher — English

**Full-featured CLI + MCP Server to manage your Blogger.com blog using Markdown & AI.**

A developer-first CLI tool to manage, sync, and publish Markdown articles to Google Blogger automatically. The perfect bridge between AI-generated content and your Blogger site. For AI Agent instructions, see [AGENT.md](AGENT.md).

---

## 🤖 MCP Server (25 Tools — AI-Native)

`blogger-publisher` ships with a **built-in MCP Server**. Register it in any MCP-compatible AI client (Antigravity, Claude Desktop, Cursor, Windsurf) and manage your entire blog through natural language — no terminal required.

**Register in your MCP config:**
```json
{
  "mcpServers": {
    "blogger": {
      "command": "mcp-blogger-server"
    }
  }
}
```

> ⚡ No extra environment variables needed! The MCP Server automatically reads from the same Global Config as the CLI (`~/.blogger-publisher/config.json`).

**Available Tools (25):**
- 📰 **Blogs (4):** `list_blogs`, `get_blog`, `get_blog_by_url`, `get_blog_info`
- 📝 **Posts (9):** `list_posts`, `get_post`, `search_posts`, `create_post`, `update_post`, `publish_post`, `revert_post`, `delete_post`, `get_post_by_path`
- 📄 **Pages (6):** `list_pages`, `get_page`, `create_page`, `update_page`, `publish_page`, `delete_page`
- 💬 **Comments (6):** `list_comments`, `list_all_comments`, `get_comment`, `approve_comment`, `mark_comment_spam`, `delete_comment`

**Example natural language commands:**
- *"List all my blogs"*
- *"Create a new draft post titled 'Hello World' on my blog"*
- *"Show all pending comments and approve the genuine ones"*
- *"Revert post ID 1234 back to draft"*

---

## 🚀 Quick Start (Interactive Mode)

```bash
npm install -g blogger-publisher
mkdir my-blog && cd my-blog
blogger-publisher
```

The interactive TUI will guide you through the full setup: Google credentials, CDN choice, and folder scaffolding. Credentials are stored globally in `~/.blogger-publisher/config.json` — works from any folder on your machine.

## 📋 CLI Commands

| Command | Description |
|---|---|
| `blogger-publisher` | Open interactive TUI menu |
| `blogger-publisher auth` | Authenticate with Google OAuth |
| `blogger-publisher publish [folder]` | Publish all articles in a folder |
| `blogger-publisher publish -` | Publish from STDIN (pipe mode) |
| `blogger-publisher pull [folder]` | Download Blogger posts as Markdown |

## 📁 Article Frontmatter

```yaml
---
title: "Your Article Title"
slug: "custom-seo-url"
description: "Meta description for Google Search."
labels: ["Technology", "AI"]
status: "draft"        # or 'published' or 'deleted'
date: "2026-08-01T08:00:00Z"
---
Article content here...
```

## 🖼️ Multi-CDN Image Routing

Write images normally: `![alt](./images/photo.png)` — on publish, the system auto-uploads them to your chosen CDN and replaces the URL permanently in the Markdown file.

| CDN | Config Needed |
|---|---|
| Google Drive | Default, no API key |
| ImgBB | `IMGBB_API_KEY` |
| Cloudinary | `CLOUDINARY_*` keys |
| GitHub + jsDelivr | `GITHUB_TOKEN` + `GITHUB_REPO` |

## ✨ Key Features

- 🤖 **MCP Server** — 25 tools for AI-native blog management
- 🏗️ **Interactive TUI** — Zero-config setup with guided menus
- 🌐 **Global Config** — Set up once, use from any directory
- 🔄 **2-Way Sync** — Pull from Blogger, edit locally, push back
- 🛡️ **Zod Validation** — Strict frontmatter validation with clear errors
- 🕵️ **Magic Bytes Detection** — Secure image type detection
- ⚡ **Smart Hashing** — Skip unchanged articles, save API quota
- 🔄 **Auto Updater** — Notified of new versions on every run
- 🚰 **Stdin Pipeline** — `cat article.md | blogger-publisher publish -`

## 📚 Documentation

- [Full Guide](docs/GUIDE.md)
- [Case Studies](docs/CASE_STUDIES.md)
- [AI Agent Instructions](AGENT.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## 📄 License

MIT © [irfnrdh](https://github.com/irfnrdh)
