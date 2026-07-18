# Obsidian Blogger Publisher Plugin

Publish your Obsidian Markdown notes directly to Google Blogger.com seamlessly, right from your vault! This is the official companion plugin for the [`blogger-publisher`](https://github.com/irfnrdh/blogger-publisher) CLI.

## Features

- **One-Click Publish**: Hit the paper plane icon in the ribbon or use the command palette.
- **Smart Sync**: Uploads local images automatically to ImgBB, Cloudinary, Google Drive, or GitHub.
- **Pull Posts**: Download all your existing Blogger posts into Obsidian as Markdown.
- **Status Notifier**: Real-time notifications for success, skip (no changes), or failure.

## Prerequisites

You must have the `blogger-publisher` CLI installed globally on your machine and authenticated with Google.

```bash
npm install -g blogger-publisher
blogger-publisher auth
```

## Manual Installation

To install this plugin in Obsidian:

1. Copy the `obsidian-plugin` folder into your vault's plugins directory:
   `your-vault/.obsidian/plugins/blogger-publisher/`
2. Open Obsidian Settings -> **Community Plugins**.
3. Disable Safe Mode (if it's on).
4. Refresh the plugins list and enable **Blogger Publisher**.

## Settings

In the Obsidian settings for **Blogger Publisher**:

- **CLI Path**: If `blogger-publisher` is in your system PATH, leave it as is. Otherwise, provide the absolute path (e.g. `/usr/local/bin/blogger-publisher` or `C:\Program Files\nodejs\blogger-publisher.cmd`).
- **Pull Directory**: The folder inside your vault where `Pull from Blogger` saves downloaded posts. Default: `articles-pulled`.

## Usage

1. Open a note with Blogger YAML frontmatter (needs at least `title: "..."`).
2. Click the **Paper Plane Icon** in the left ribbon or press `Ctrl+P` -> **Publish current file**.
3. Check the top right corner for the success notification!

*(To save a draft, add `status: "draft"` to the YAML frontmatter before publishing).*
