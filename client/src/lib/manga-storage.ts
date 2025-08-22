import { MangaScript } from "../types/manga";

interface SaveProjectData {
  title: string;
  description?: string;
  inputText: string;
  scriptData: MangaScript;
  settings: any;
  illustratorPrompts?: Record<string, string>;
  userId?: string;
  isPublic?: boolean;
}

interface SaveImageData {
  projectId: number;
  panelId: string;
  imageData: string;
  prompt?: string;
}

export async function saveProject(data: SaveProjectData) {
  const response = await fetch("/api/manga/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: data.title,
      description: data.description,
      inputText: data.inputText,
      scriptData: data.scriptData,
      settings: data.settings,
      illustratorPrompts: data.illustratorPrompts,
      userId: data.userId,
      isPublic: data.isPublic || false,
      status: "draft",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save project");
  }

  return response.json();
}

export async function loadProject(projectId: number) {
  const response = await fetch(`/api/manga/projects/${projectId}`);
  
  if (!response.ok) {
    throw new Error("Failed to load project");
  }

  return response.json();
}

export async function updateProject(projectId: number, data: Partial<SaveProjectData>) {
  const response = await fetch(`/api/manga/projects/${projectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update project");
  }

  return response.json();
}

export async function listProjects(userId?: string) {
  const url = userId 
    ? `/api/manga/projects?userId=${userId}`
    : "/api/manga/projects";
    
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error("Failed to list projects");
  }

  return response.json();
}

export async function saveImage(data: SaveImageData) {
  const response = await fetch("/api/manga/images", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId: data.projectId,
      panelId: data.panelId,
      imageData: data.imageData,
      prompt: data.prompt,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save image");
  }

  return response.json();
}

export async function loadProjectImages(projectId: number) {
  const response = await fetch(`/api/manga/projects/${projectId}/images`);
  
  if (!response.ok) {
    throw new Error("Failed to load images");
  }

  return response.json();
}