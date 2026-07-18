# 🤖 AI Agent Guide (AGENT.md)

This file is intended for AI Agents interacting with this repository to perform **Auto-Blogging**, **Smart Batching**, content automation, or direct blog management via the **Local API Server / CLI**.

---

## 1. Project Identity

This is `blogger-publisher` — a Node.js-based tool with **three modes of operation** (Pro Foundation):

### Mode A: CLI & TUI (Command Line)
Reads local Markdown (`.md`) files and automatically publishes them to Blogger. Supports **Multi-Account** configurations seamlessly.

### Mode B: Local API Server (Headless)
Runs a local API server on Port `1826` (`blogger-publisher serve`).
Exposes a REST API with **Server-Sent Events (SSE)** for real-time publishing updates and a Background Cron Scheduler.

### Mode C: MCP Server (AI-Native)
Exposes **25 tools** via the Model Context Protocol for AI clients to manage blogs entirely through natural language.

---

## 2. Core Capabilities

1. **Native Multi-Account:** Manages multiple Google Accounts securely under `~/.blogger-publisher/accounts/`.
2. **Smart Sync (Hashing):** Does not re-publish articles if content is unchanged (based on `content_hash`).
3. **Multi-CDN Image Upload:** Automatically uploads local Markdown images to Google Drive, ImgBB, Cloudinary, or GitHub CDN.
4. **2-Way Sync:** Download all articles from Blogger as Markdown (`pull`), or push them back (`publish`).
5. **Interactive TUI:** Run `blogger-publisher` (no arguments) for an interactive menu-driven experience.

---

## 3. Markdown Frontmatter Rules

When creating a new article file, **you MUST use this YAML Frontmatter format**:

```yaml
---
title: "[Required] Your Compelling Article Title"
slug: "[Optional] custom-seo-friendly-url"
description: "[Optional] Short meta description for Google Search"
labels: ["[Optional]", "Category 1", "Tech"]
status: "[Optional] 'draft' to hide, 'deleted' to remove from Blogger"
date: "[Optional] ISO-8601 format: 2026-07-25T10:00:00Z for scheduling"
---
```

### Delete Rule:
If the user wants to delete an article, **DO NOT** delete the `.md` file directly. Instead, change the frontmatter to `status: "deleted"` and run `blogger-publisher publish`. The system will automatically delete it from Blogger and remove the local file.

### Important Injected Fields:
After publishing, the system injects `blogger_id` and `content_hash` into the frontmatter. **NEVER manually delete or alter these two fields** — they are the system's tracking database.

---

## 4. Running Commands (CLI Mode)

AI Agents running commands on behalf of the user must use the `-a` (account) flag if bypassing the interactive TUI.

```bash
# First-time setup (interactive TUI):
blogger-publisher

# Authentication for a specific account:
blogger-publisher auth client-seo

# Start Local API Server on port 1826:
blogger-publisher serve

# Publish articles from a folder for a specific account:
blogger-publisher publish ./articles -a client-seo

# Pull all existing Blogger posts as Markdown for a specific account:
blogger-publisher pull ./articles-pulled -a client-seo
```

> **WARNING to Agents:** Never use `blogger-publisher auth` without specifying an account name, and never try to manipulate `.env` for `REFRESH_TOKEN` as the system now uses the advanced `multiconfig` engine.
