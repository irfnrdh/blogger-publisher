# 💡 Case Studies

Here's how developers, AI engineers, and content creators use `blogger-publisher` in the real world.

---

## Case 1: Fully Automated AI Autoblog (Hands-Free)

**Goal:** A website that publishes 5 news articles daily without human intervention.

**How it works:**
1. You set up an AI Agent using `AGENT.md` (or any LLM of your choice).
2. Every morning at 7 AM, a cron job commands the AI to fetch the latest news from an RSS feed.
3. The AI writes a 1,000-word Markdown article with proper Frontmatter and saves it to `articles/`.
4. The cron job runs `blogger-publisher publish ./articles`.
5. Any AI-generated images are uploaded automatically to ImgBB/Cloudinary, and the article goes live.

---

## Case 2: WordPress to Blogger Migration

**Goal:** Stop paying for WordPress hosting and move to Blogger (free forever).

**How it works:**
1. Use a WordPress export plugin to get your posts as `.md` files (e.g. using a Gatsby/Hugo exporter).
2. Drop your 500 `.md` files into the `articles/` folder.
3. Run `blogger-publisher publish ./articles`.
4. The system uploads 500 local images to Cloudinary and publishes all 500 articles to Blogger — without hitting API rate limits (thanks to Smart Delay).

---

## Case 3: GitHub as a Free CMS

**Goal:** Write blog posts from your smartphone, and have them publish automatically when you commit.

**How it works:**
1. Upload this project to GitHub and store your credentials in **GitHub Secrets** (using the `blogger-publisher auth` refresh token).
2. Create a GitHub Actions workflow triggered on changes to the `articles/` folder.
3. While you're out, use an app like **Obsidian**, **iA Writer**, or the GitHub mobile app to create a new `.md` file.
4. When you commit, GitHub Actions runs, uploads images to GitHub jsDelivr CDN, and publishes the article to Google Blogger automatically.
5. A 100% free CMS with a world-class writing experience!

---

## Case 4: AI-Powered Blog Management via MCP Server

**Goal:** Let your AI assistant manage your entire Blogger workflow via natural language.

**How it works:**
1. Register `mcp-blogger-server` in your MCP config file (one-time setup).
2. Talk to your AI client (Antigravity, Claude Desktop, Cursor):
   - *"List all my blogs and their stats"*
   - *"Create a new draft post titled 'Top 10 AI Tools in 2026' on my tech blog"*
   - *"Show all pending comments and approve the ones that look genuine"*
   - *"Revert post ID 1234 back to draft"*
3. The AI executes Blogger API calls on your behalf — no terminal needed.
