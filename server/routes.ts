import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerOpenAIRoutes } from "./routes/openai";
import { registerMangaRoutes } from "./routes/manga";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register OpenAI routes
  registerOpenAIRoutes(app);
  
  // Register Manga routes
  registerMangaRoutes(app);

  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
