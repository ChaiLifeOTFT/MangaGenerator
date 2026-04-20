# MangaForge — AI Manga Generator

**Turn text into manga panels automatically.** MangaForge is a full-stack AI pipeline that converts story descriptions into structured manga scripts and generates panel images using OpenAI's APIs.

## What it does

- **Text → Manga Script**: GPT converts your story idea into structured panel-by-panel scripts
- **Script → Images**: DALL-E generates black-and-white manga panel art for each scene
- **Export**: Download complete chapters as CBZ files
- **Two-pass generation**: Optional illustrator pass for refined panel prompts

## Stack

- React 18 + TypeScript + Vite (frontend)
- Express.js (backend)
- shadcn/ui + Tailwind CSS
- OpenAI (GPT-4 + DALL-E 3)
- Drizzle ORM + PostgreSQL

## Demo builds included

- `Spirit Blade` manga (action) — full chapter
- `Echo Protocol Chapter 1` — 12 panels, DALL-E 3 generated
- SolPunk design system + PWA support

## Want the packaged app?

If you want a **ready-to-use manga creation tool** without setting up the full stack, Drake Studio is the desktop app version of this pipeline:

**[Drake Studio on Gumroad — $29](https://sweepsy.gumroad.com/l/umsdf)**

---

## Part of Drake Enterprise

This repo is one piece of the Drake Enterprise LLC / OhananahO mesh ecosystem. For the full fiction + protocol catalog — SolPunk novels, Decision Council, dreamwork kits — see:

- [Drake Enterprise Catalog (HTML)](https://chailifeotft.github.io/PUSH-Protocol/catalog.html)
- [P.U.S.H. Protocol repo](https://github.com/ChaiLifeOTFT/PUSH-Protocol)
- [drakeent.gumroad.com](https://drakeent.gumroad.com)

Includes: character generation, panel composition, story flow, and ADHD-friendly workflow design. No server setup required.

## Setup (dev)

```bash
npm install
npm run dev
```

Requires `OPENAI_API_KEY` in environment. Optional: `DATABASE_URL` for PostgreSQL persistence (falls back to in-memory).

---

Built by [Drake Enterprise](https://drakeent.gumroad.com) — tools for neurodivergent creators.
