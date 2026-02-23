import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { registerCompleteAIRoutes } from "./routes/complete-ai-system";
import { registerMangaRoutes } from "./routes/manga";
import { registerUploadRoutes } from "./routes/upload";
import { registerPaymentRoutes } from "./routes/payments";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health endpoint (DigiUs compatible)
  app.get("/health", (_req, res) => {
    res.json({
      status: "alive",
      service: "MangaForge",
      port: parseInt(process.env.PORT || '5020'),
      uptime: process.uptime(),
      timestamp: Date.now() / 1000,
    });
  });

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

  const httpServer = createServer(app);
  return httpServer;
}
