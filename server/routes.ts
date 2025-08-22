import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerCompleteAIRoutes } from "./routes/complete-ai-system";
import { registerMangaRoutes } from "./routes/manga";
import { registerUploadRoutes } from "./routes/upload";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register Complete AI System (Text, Image, Voice, Code, Payments)
  registerCompleteAIRoutes(app);
  
  // Register Manga routes
  registerMangaRoutes(app);
  
  // Register Upload routes
  registerUploadRoutes(app);

  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
