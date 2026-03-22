import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { registerHealthRoutes } from "./routes/health";
import { registerCompleteAIRoutes } from "./routes/complete-ai-system";
import { registerMangaRoutes } from "./routes/manga";
import { registerUploadRoutes } from "./routes/upload";
import { registerPaymentRoutes } from "./routes/payments";
import { registerGalleryRoutes } from "./routes/gallery";

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Health checks (DigiUs + k8s/Docker compatible) ──────────────────────────
  // /health          — full deep report
  // /health/live     — liveness probe
  // /health/ready    — readiness probe
  // /health/startup  — startup probe
  registerHealthRoutes(app);

  // Landing page
  app.get("/landing", (_req, res) => {
    res.sendFile(path.resolve("client/public/landing.html"));
  });

  // Register Complete AI System (Text, Image, Voice, Code)
  registerCompleteAIRoutes(app);

  // Register Payment routes (credits + Stripe)
  registerPaymentRoutes(app);

  // Register Manga routes
  registerMangaRoutes(app);

  // Register Upload routes
  registerUploadRoutes(app);

  // Register Gallery routes (browse + download manga)
  registerGalleryRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
