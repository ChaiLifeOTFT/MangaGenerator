import { 
  type User, 
  type InsertUser, 
  type MangaProject, 
  type InsertMangaProject,
  type PanelImage,
  type InsertPanelImage,
  users, 
  mangaProjects,
  panelImages
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Manga project operations
  createMangaProject(project: InsertMangaProject): Promise<MangaProject>;
  getMangaProject(id: number): Promise<MangaProject | undefined>;
  updateMangaProject(id: number, project: Partial<InsertMangaProject>): Promise<MangaProject | undefined>;
  listMangaProjects(userId?: string): Promise<MangaProject[]>;
  
  // Panel image operations
  savePanelImage(image: InsertPanelImage): Promise<PanelImage>;
  getPanelImages(projectId: number): Promise<PanelImage[]>;
  deletePanelImages(projectId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Manga project operations
  async createMangaProject(project: InsertMangaProject): Promise<MangaProject> {
    const [mangaProject] = await db
      .insert(mangaProjects)
      .values(project)
      .returning();
    return mangaProject;
  }
  
  async getMangaProject(id: number): Promise<MangaProject | undefined> {
    const [project] = await db.select().from(mangaProjects).where(eq(mangaProjects.id, id));
    return project || undefined;
  }
  
  async updateMangaProject(id: number, project: Partial<InsertMangaProject>): Promise<MangaProject | undefined> {
    const [updated] = await db
      .update(mangaProjects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(mangaProjects.id, id))
      .returning();
    return updated || undefined;
  }
  
  async listMangaProjects(userId?: string): Promise<MangaProject[]> {
    if (userId) {
      return await db.select().from(mangaProjects).where(eq(mangaProjects.userId, userId));
    }
    return await db.select().from(mangaProjects).where(eq(mangaProjects.isPublic, true));
  }
  
  // Panel image operations
  async savePanelImage(image: InsertPanelImage): Promise<PanelImage> {
    const [panelImage] = await db
      .insert(panelImages)
      .values(image)
      .returning();
    return panelImage;
  }
  
  async getPanelImages(projectId: number): Promise<PanelImage[]> {
    return await db.select().from(panelImages).where(eq(panelImages.projectId, projectId));
  }
  
  async deletePanelImages(projectId: number): Promise<void> {
    await db.delete(panelImages).where(eq(panelImages.projectId, projectId));
  }
}

export const storage = new DatabaseStorage();
