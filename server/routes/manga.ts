import type { Express } from "express";
import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertMangaProjectSchema, insertPanelImageSchema } from "@shared/schema";

export function registerMangaRoutes(app: Express) {
  // Create a new manga project
  app.post("/api/manga/projects", async (req: Request, res: Response) => {
    try {
      const projectData = insertMangaProjectSchema.parse(req.body);
      const project = await storage.createMangaProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Error creating manga project:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to create project" 
      });
    }
  });

  // Get a manga project
  app.get("/api/manga/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getMangaProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Get associated images
      const images = await storage.getPanelImages(projectId);
      res.json({ project, images });
    } catch (error) {
      console.error("Error fetching manga project:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch project" 
      });
    }
  });

  // Update a manga project
  app.patch("/api/manga/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.updateMangaProject(projectId, req.body);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error updating manga project:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to update project" 
      });
    }
  });

  // List manga projects
  app.get("/api/manga/projects", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const projects = await storage.listMangaProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error listing manga projects:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to list projects" 
      });
    }
  });

  // Save panel image
  app.post("/api/manga/images", async (req: Request, res: Response) => {
    try {
      const imageData = insertPanelImageSchema.parse(req.body);
      const image = await storage.savePanelImage(imageData);
      res.json(image);
    } catch (error) {
      console.error("Error saving panel image:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to save image" 
      });
    }
  });

  // Get panel images for a project
  app.get("/api/manga/projects/:id/images", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      const images = await storage.getPanelImages(projectId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching panel images:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch images" 
      });
    }
  });

  // Delete panel images for a project
  app.delete("/api/manga/projects/:id/images", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      await storage.deletePanelImages(projectId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting panel images:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to delete images" 
      });
    }
  });
}