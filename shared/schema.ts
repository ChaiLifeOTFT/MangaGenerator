import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar,
  timestamp,
  jsonb,
  serial,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - keeping the existing structure
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 255 }).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Manga projects table
export const mangaProjects = pgTable("manga_projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  inputText: text("input_text").notNull(),
  scriptData: jsonb("script_data").notNull(), // Stores the full manga script JSON
  settings: jsonb("settings").notNull(), // Stores generation settings
  illustratorPrompts: jsonb("illustrator_prompts"), // Stores illustrator prompts if generated
  status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, in_progress, completed
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Panel images table - stores generated images
export const panelImages = pgTable("panel_images", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => mangaProjects.id).notNull(),
  panelId: varchar("panel_id", { length: 50 }).notNull(), // e.g., "1-1"
  imageData: text("image_data").notNull(), // Base64 encoded image
  prompt: text("prompt"), // The prompt used to generate the image
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export history table - tracks CBZ exports
export const exportHistory = pgTable("export_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => mangaProjects.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  exportedAt: timestamp("exported_at").defaultNow().notNull(),
  fileSize: integer("file_size"), // in bytes
});

// Schema types for users
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Schema types for manga projects
export const insertMangaProjectSchema = createInsertSchema(mangaProjects).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertMangaProject = z.infer<typeof insertMangaProjectSchema>;
export type MangaProject = typeof mangaProjects.$inferSelect;

// Schema types for panel images
export const insertPanelImageSchema = createInsertSchema(panelImages).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertPanelImage = z.infer<typeof insertPanelImageSchema>;
export type PanelImage = typeof panelImages.$inferSelect;

// Schema types for export history
export const insertExportHistorySchema = createInsertSchema(exportHistory).omit({ 
  id: true, 
  exportedAt: true 
});
export type InsertExportHistory = z.infer<typeof insertExportHistorySchema>;
export type ExportHistory = typeof exportHistory.$inferSelect;
