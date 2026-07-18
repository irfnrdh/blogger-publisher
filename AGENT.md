# 🤖 AI Agent Guide (AGENT.md)

This file is intended for AI Agents interacting with this repository to perform **Auto-Blogging**, **Smart Batching**, content automation, or direct blog management via the **MCP Server**.

---

## 1. Project Identity

This is `blogger-publisher` — a Node.js-based tool with **two modes of operation**:

### Mode A: CLI (Command Line)
Reads local Markdown (`.md`) files and automatically publishes them to Blogger using the Google Blogger API v3.

### Mode B: MCP Server (AI-Native)
Exposes **25 tools** via the Model Context Protocol. Any MCP-compatible AI client (Antigravity, Claude Desktop, Cursor, Windsurf) can manage blogs, posts, pages, and comments entirely through natural language.

**To use MCP Server mode**, register in your MCP config:
```json
{
  "mcpServers": {
    "blogger": {
      "command": "mcp-blogger-server"
    }
  }
}
```

---

## 2. Core Capabilities

1. **Smart Sync (Hashing):** Does not re-publish articles if content is unchanged (based on `content_hash`).
2. **Multi-CDN Image Upload:** Automatically uploads local Markdown images to Google Drive, ImgBB, Cloudinary, or GitHub CDN.
3. **Advanced SEO:** Supports custom permalinks and meta search descriptions.
4. **2-Way Sync:** Download all articles from Blogger as Markdown (`pull`), or push them back (`publish`).
5. **Multi-Blog Support:** Manage hundreds of different blogs in one installation. Just set `blog_id` in the Frontmatter.
6. **Global Config:** Credentials are stored once in `~/.blogger-publisher/config.json` — works from any folder.
7. **Interactive TUI:** Run `blogger-publisher` (no arguments) for an interactive menu-driven experience.

---

## 3. Markdown Frontmatter Rules (CLI Mode)

When creating a new article file, **you MUST use this YAML Frontmatter format**:

```yaml
---
title: "[Required] Your Compelling Article Title"
slug: "[Optional] custom-seo-friendly-url"
description: "[Optional] Short meta description for Google Search"
labels: ["[Optional]", "Category 1", "Tech"]
blog_id: "[Optional] Set if user has multiple blogs"
status: "[Optional] 'draft' to hide, 'deleted' to remove from Blogger"
date: "[Optional] ISO-8601 format: 2026-07-25T10:00:00Z for scheduling"
---
```

### Delete Rule:
If the user wants to delete an article, **DO NOT** delete the `.md` file directly. Instead, change the frontmatter to `status: "deleted"` and run `blogger-publisher publish`. The system will automatically delete it from Blogger and remove the local file.

### Important Injected Fields:
After publishing, the system injects `blogger_id` and `content_hash` into the frontmatter. **NEVER manually delete or alter these two fields** — they are the system's tracking database.

---

## 4. MCP Tools Available (25 Total)

### 📰 Blogs (4 tools)
`list_blogs` · `get_blog` · `get_blog_by_url` · `get_blog_info`

### 📝 Posts (9 tools)
`list_posts` · `get_post` · `get_post_by_path` · `search_posts` · `create_post` · `update_post` · `publish_post` · `revert_post` · `delete_post`

### 📄 Pages (6 tools)
`list_pages` · `get_page` · `create_page` · `update_page` · `publish_page` · `delete_page`

### 💬 Comments (6 tools)
`list_comments` · `list_all_comments` · `get_comment` · `approve_comment` · `mark_comment_spam` · `delete_comment`

---

## 5. Workflows (Auto-Blogging Scenarios)

### A. "News Auto-Blogging" Scenario (Real-time)
If the user asks for an automated news website:
1. AI Agent fetches latest news from a web search or RSS API.
2. AI Agent rewrites the news in Markdown format.
3. Save as `articles/news-<topic>-<date>.md`.
4. Run: `blogger-publisher publish ./articles`
5. Article goes live immediately.

### B. "Smart Batching" Scenario (30-day scheduling)
If the user wants 30 articles published one per day for a month:
1. AI Agent generates 30 Markdown files in bulk.
2. Each file gets a `date` frontmatter:
   - Article 1: `date: "2026-08-01T08:00:00Z"`
   - Article 2: `date: "2026-08-02T08:00:00Z"`
   - etc.
3. Save all files to `articles/`.
4. Run: `blogger-publisher publish`
5. Blogger's internal scheduler handles the timed publishing automatically.

### C. "Natural Language Blog Management" via MCP
If the user says *"publish my latest draft post"*, *"list all comments pending approval"*, or *"create a new About page"*:
1. Use the appropriate MCP tool directly.
2. No need to create Markdown files — the MCP tools interface directly with the Blogger API.

---

## 6. Running Commands (CLI Mode)
```bash
# First-time setup (interactive):
blogger-publisher

# Authentication only:
blogger-publisher auth

# Publish articles from a folder:
blogger-publisher publish ./articles

# Publish from STDIN (pipe mode):
cat article.md | blogger-publisher publish -

# Pull all existing Blogger posts as Markdown:
blogger-publisher pull ./articles-pulled
```
