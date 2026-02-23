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

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createMangaProject(project: InsertMangaProject): Promise<MangaProject>;
  getMangaProject(id: number): Promise<MangaProject | undefined>;
  updateMangaProject(id: number, project: Partial<InsertMangaProject>): Promise<MangaProject | undefined>;
  listMangaProjects(userId?: string): Promise<MangaProject[]>;
  savePanelImage(image: InsertPanelImage): Promise<PanelImage>;
  getPanelImages(projectId: number): Promise<PanelImage[]>;
  deletePanelImages(projectId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async createMangaProject(project: InsertMangaProject): Promise<MangaProject> {
    const [mangaProject] = await db.insert(mangaProjects).values(project).returning();
    return mangaProject;
  }
  async getMangaProject(id: number): Promise<MangaProject | undefined> {
    const [project] = await db.select().from(mangaProjects).where(eq(mangaProjects.id, id));
    return project || undefined;
  }
  async updateMangaProject(id: number, project: Partial<InsertMangaProject>): Promise<MangaProject | undefined> {
    const [updated] = await db.update(mangaProjects).set({ ...project, updatedAt: new Date() }).where(eq(mangaProjects.id, id)).returning();
    return updated || undefined;
  }
  async listMangaProjects(userId?: string): Promise<MangaProject[]> {
    if (userId) {
      return await db.select().from(mangaProjects).where(eq(mangaProjects.userId, userId));
    }
    return await db.select().from(mangaProjects).where(eq(mangaProjects.isPublic, true));
  }
  async savePanelImage(image: InsertPanelImage): Promise<PanelImage> {
    const [panelImage] = await db.insert(panelImages).values(image).returning();
    return panelImage;
  }
  async getPanelImages(projectId: number): Promise<PanelImage[]> {
    return await db.select().from(panelImages).where(eq(panelImages.projectId, projectId));
  }
  async deletePanelImages(projectId: number): Promise<void> {
    await db.delete(panelImages).where(eq(panelImages.projectId, projectId));
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<number, MangaProject> = new Map();
  private images: Map<number, PanelImage[]> = new Map();
  private nextProjectId = 1;
  private nextImageId = 1;

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return [...this.users.values()].find(u => u.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }
  async createMangaProject(project: InsertMangaProject): Promise<MangaProject> {
    const id = this.nextProjectId++;
    const mp: MangaProject = {
      id,
      userId: project.userId ?? null,
      title: project.title,
      description: project.description ?? null,
      inputText: project.inputText,
      scriptData: project.scriptData,
      settings: project.settings,
      illustratorPrompts: project.illustratorPrompts ?? null,
      status: project.status ?? 'draft',
      isPublic: project.isPublic ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, mp);
    return mp;
  }
  async getMangaProject(id: number): Promise<MangaProject | undefined> {
    return this.projects.get(id);
  }
  async updateMangaProject(id: number, project: Partial<InsertMangaProject>): Promise<MangaProject | undefined> {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...project, updatedAt: new Date() } as MangaProject;
    this.projects.set(id, updated);
    return updated;
  }
  async listMangaProjects(userId?: string): Promise<MangaProject[]> {
    const all = [...this.projects.values()];
    if (userId) return all.filter(p => p.userId === userId);
    return all.filter(p => p.isPublic);
  }
  async savePanelImage(image: InsertPanelImage): Promise<PanelImage> {
    const id = this.nextImageId++;
    const pi: PanelImage = {
      id,
      projectId: image.projectId,
      panelId: image.panelId,
      imageData: image.imageData,
      prompt: image.prompt ?? null,
      createdAt: new Date(),
    };
    const existing = this.images.get(image.projectId) || [];
    existing.push(pi);
    this.images.set(image.projectId, existing);
    return pi;
  }
  async getPanelImages(projectId: number): Promise<PanelImage[]> {
    return this.images.get(projectId) || [];
  }
  async deletePanelImages(projectId: number): Promise<void> {
    this.images.delete(projectId);
  }
}

// Use DatabaseStorage if PostgreSQL is available, otherwise MemStorage
export const storage: IStorage = db ? new DatabaseStorage() : new MemStorage();
console.log(`[storage] Using ${db ? 'DatabaseStorage (PostgreSQL)' : 'MemStorage (in-memory)'}`);
