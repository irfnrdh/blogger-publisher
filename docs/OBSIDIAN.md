# 🗒️ Obsidian Integration Guide

Complete guide to integrate `blogger-publisher` with Obsidian for a seamless writing-to-publishing workflow.

---

## Method 1: Shell Commands Plugin (Quick Setup — 5 Minutes)

No coding needed. Uses the **Shell Commands** community plugin to add a "Publish to Blogger" button/hotkey inside Obsidian.

### Step 1: Install Shell Commands Plugin

1. Open Obsidian → **Settings** → **Community Plugins**
2. Click **Browse** → search **"Shell commands"** (by Jarkko Linnanvirta)
3. **Install** → **Enable**

### Step 2: Configure Commands

Go to **Settings → Shell commands** → Click **New command** and add these:

#### Command 1: Publish Current Note
```bash
blogger-publisher publish "{{file_path}}"
```
- **Name**: `Publish to Blogger`
- **Shell environment**: Select your shell (`bash` / `zsh`)

#### Command 2: Publish as Draft
```bash
blogger-publisher publish "{{file_path}}"
```
> Set `status: "draft"` in your frontmatter to save as draft

#### Command 3: Pull Posts from Blogger
```bash
cd "{{vault_path}}" && blogger-publisher pull ./articles-pulled
```
- **Name**: `Pull from Blogger`

### Step 3: Assign Hotkeys

In Shell commands settings, click **⌨️ Hotkeys** for each command:
- **Publish to Blogger** → `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac)
- **Pull from Blogger** → `Ctrl+Shift+L`

### Step 4: Add to Ribbon (Optional)

Enable **Show in ribbon** for quick access via left sidebar icon.

### Variables Available in Shell Commands

| Variable | Value |
|---|---|
| `{{file_path}}` | Absolute path to current note |
| `{{file_name}}` | Filename without extension |
| `{{vault_path}}` | Root path of your Obsidian vault |
| `{{yaml_value:title}}` | Value of `title` from frontmatter |
| `{{yaml_value:status}}` | Value of `status` from frontmatter |

---

## Method 2: Native Obsidian Plugin (Advanced)

Install the **Blogger Publisher Plugin** directly from Obsidian Community Plugins (or manually from the `obsidian-plugin/` folder in this repo).

**Features:**
- 🎯 Ribbon icon — one-click publish
- ⌨️ Command Palette integration
- ⚙️ Visual Settings tab (no config file editing)
- 📊 Status bar — shows last publish time
- 🔔 Toast notifications on success/failure
- 📋 Auto-inject Blogger frontmatter into new notes

### Manual Installation

1. Build the plugin (see `obsidian-plugin/README.md`)
2. Copy `obsidian-plugin/dist/` contents to your vault:
   ```
   your-vault/.obsidian/plugins/blogger-publisher/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```
3. Reload Obsidian → **Settings → Community Plugins** → Enable **Blogger Publisher**
4. Go to **Settings → Blogger Publisher** → fill in your Blog ID

---

## Recommended Obsidian Vault Structure

```
my-blog-vault/
├── 📁 articles/           ← Draft & published posts (tracked by blogger-publisher)
│   ├── hello-world.md
│   └── my-second-post.md
├── 📁 _templates/         ← Obsidian templates
│   └── blogger-post.md    ← Template with pre-filled frontmatter
├── 📁 images/             ← Local images (auto-uploaded on publish)
├── 📁 _archive/           ← Archived/deleted posts (optional)
└── .obsidian/
    └── plugins/
        └── blogger-publisher/  ← Native plugin (if installed)
```

---

## Frontmatter Template

Create a new template in Obsidian (via **Templater** or **Templates** core plugin):

**File:** `_templates/blogger-post.md`

```yaml
---
title: "{{title}}"
slug: ""
description: ""
labels: []
status: "draft"
date: "{{date:YYYY-MM-DDTHH:mm:ss}}Z"
---

<!-- Write your post content here -->

```

> **Tip:** With the **Templater** plugin, use `Ctrl+P` → `Templater: Insert Template` to auto-fill `{{title}}` with the note name and `{{date}}` with today's date.

---

## Workflow Example

```
1. Ctrl+N            → Create new note in Obsidian
2. Insert Template   → Auto-fills frontmatter
3. Write content     → With images (drag & drop)
4. Ctrl+Shift+B      → "Publish to Blogger" (Shell Command)
5. ✅ Published!     → URL appears in terminal output
```

---

## Troubleshooting

**Error: `blogger-publisher: command not found`**
```bash
# Make sure it's installed globally:
npm install -g blogger-publisher

# Verify:
which blogger-publisher
```

**Shell Commands can't find the command**

Add the full path to the command:
```bash
/usr/local/bin/blogger-publisher publish "{{file_path}}"
```
Or set the PATH in Shell commands settings:
```
PATH=/usr/local/bin:$PATH blogger-publisher publish "{{file_path}}"
```

**Images not uploading**

Make sure your images are in a path relative to the note:
```md
![Alt text](./images/photo.png)   ✅
![Alt text](images/photo.png)     ✅
![Alt text](/absolute/path.png)   ❌ (won't work)
```
