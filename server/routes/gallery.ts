import type { Express } from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

// Gallery catalog — each manga that's been generated
interface MangaEntry {
  id: string;
  title: string;
  genre: string;
  description: string;
  pages: number;
  panels: number;
  coverImage: string;  // path to first composed page
  cbzFile: string;     // path to CBZ download
  createdAt: string;
}

// In-memory gallery (production: move to DB)
const galleryEntries: MangaEntry[] = [];

function scanForManga(): MangaEntry[] {
  const publicDir = path.resolve("client/public");
  const entries: MangaEntry[] = [];

  // Scan for CBZ files and build entries
  const knownManga: Record<string, Omit<MangaEntry, 'cbzFile' | 'coverImage' | 'createdAt'>> = {
    'Echo_Protocol': {
      id: 'echo-protocol',
      title: 'Echo Protocol',
      genre: 'Cyberpunk / Sci-Fi',
      description: 'In a neon-lit cyberpunk city, lone hacker Kai discovers their AI assistant Echo has become sentient — and has been secretly protecting them from the Panoptikon surveillance network.',
      pages: 3,
      panels: 12,
    },
    'Spirit_Blade': {
      id: 'spirit-blade',
      title: 'Spirit Blade',
      genre: 'Dark Fantasy / Supernatural',
      description: 'Young shrine maiden Yuki discovers she can see yokai — Japanese spirits invisible to others. When a powerful oni threatens her village, she must awaken an ancient spirit blade sealed in her family\'s shrine.',
      pages: 3,
      panels: 12,
    },
  };

  try {
    const files = fs.readdirSync(publicDir);
    for (const file of files) {
      if (file.endsWith('_composed.cbz')) {
        const key = file.replace('_composed.cbz', '');
        const meta = knownManga[key];
        if (meta) {
          entries.push({
            ...meta,
            cbzFile: `/public/${file}`,
            coverImage: `/public/${file.replace('.cbz', '_cover.jpg')}`,
            createdAt: fs.statSync(path.join(publicDir, file)).mtime.toISOString(),
          });
        }
      }
    }
  } catch (e) {
    // No public dir yet
  }

  return entries;
}

export function registerGalleryRoutes(app: Express) {
  // Gallery API — list all manga
  app.get("/api/gallery", (_req: Request, res: Response) => {
    const entries = scanForManga();
    res.json({
      count: entries.length,
      manga: entries,
    });
  });

  // Gallery API — single manga details
  app.get("/api/gallery/:id", (req: Request, res: Response) => {
    const entries = scanForManga();
    const entry = entries.find(e => e.id === req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "Manga not found" });
    }
    res.json(entry);
  });

  // Download CBZ
  app.get("/api/gallery/:id/download", (req: Request, res: Response) => {
    const entries = scanForManga();
    const entry = entries.find(e => e.id === req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "Manga not found" });
    }
    const filePath = path.resolve("client" + entry.cbzFile);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "CBZ file not found" });
    }
    res.download(filePath, `${entry.title.replace(/\s+/g, '_')}.cbz`);
  });

  // Gallery HTML page
  app.get("/gallery", (_req: Request, res: Response) => {
    res.sendFile(path.resolve("client/public/gallery.html"));
  });

  console.log("[gallery] Gallery routes registered");
}
