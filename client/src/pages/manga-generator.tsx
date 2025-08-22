import { useState, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { MangaScript, Panel, GenerationSettings } from "../types/manga";
import {
  generateMangaScript,
  generateIllustratorPrompts,
  generatePanelImage,
  checkAPIStatus,
} from "../lib/manga-api-server";
import {
  saveProject,
  loadProject,
  updateProject,
  listProjects,
  saveImage,
  loadProjectImages,
} from "../lib/manga-storage";
import Sidebar from "../components/manga-generator/sidebar";
import MainContent from "../components/manga-generator/main-content";
import LoadingOverlay from "../components/manga-generator/loading-overlay";
import { useToast } from "../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function MangaGenerator() {
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [inputText, setInputText] = useState("");
  const [settings, setSettings] = useState<GenerationSettings>({
    chatModel: "gpt-4o-mini",
    imageSize: "1024x1024",
    useIllustratorPass: false,
    desiredPages: 20,
  });

  const [script, setScript] = useState<MangaScript | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [illustratorPrompts, setIllustratorPrompts] = useState<Record<string, string>>({});
  
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatingPanels, setGeneratingPanels] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("Ready to begin");
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [savedProjects, setSavedProjects] = useState<any[]>([]);

  const { toast } = useToast();

  // Check if API key is configured on server
  useEffect(() => {
    checkAPIStatus().then(configured => {
      setApiKeyConfigured(configured);
      if (!configured) {
        toast({
          title: "API Key Not Configured",
          description: "OpenAI API key is not configured on the server",
          variant: "destructive",
        });
      }
    });
  }, []);

  const handleGenerateScript = async () => {
    if (!apiKeyConfigured) {
      toast({
        title: "API Key Not Configured",
        description: "OpenAI API key is not configured on the server",
        variant: "destructive",
      });
      return;
    }

    if (!inputText.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter some text to transform into manga",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingScript(true);
    setStatus("Generating manga script...");

    try {
      const generatedScript = await generateMangaScript(
        inputText,
        settings.chatModel,
        settings.desiredPages
      );
      
      setScript(generatedScript);
      setStatus("Script generated successfully");
      
      toast({
        title: "Script Generated",
        description: `Created ${generatedScript.pages.length} pages with ${generatedScript.pages.reduce((sum, page) => sum + page.panels.length, 0)} panels`,
      });
    } catch (error) {
      console.error("Script generation failed:", error);
      setStatus("Script generation failed");
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate manga script",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleBuildIllustratorPrompts = async () => {
    if (!script || !apiKeyConfigured) return;

    setStatus("Building illustrator prompts...");

    try {
      const allPanels = script.pages.flatMap(page => page.panels);
      const prompts = await generateIllustratorPrompts(
        settings.chatModel,
        script.style_bible,
        allPanels
      );
      
      setIllustratorPrompts(prompts);
      setSettings({ ...settings, useIllustratorPass: true });
      setStatus("Illustrator prompts ready");
      
      toast({
        title: "Prompts Generated",
        description: "AI-refined illustrator prompts are now ready",
      });
    } catch (error) {
      console.error("Illustrator prompts failed:", error);
      setStatus("Illustrator pass failed");
      toast({
        title: "Prompt Generation Failed",
        description: "Falling back to built-in prompts",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAllImages = async () => {
    if (!script || !apiKeyConfigured) return;

    setIsGeneratingImages(true);
    setStatus("Generating all panel images...");

    try {
      const allPanels = script.pages.flatMap(page => page.panels);
      const newImages = { ...images };

      for (const panel of allPanels) {
        if (images[panel.id]) continue; // Skip already generated images

        setGeneratingPanels(prev => new Set(prev).add(panel.id));
        
        try {
          const illustratorPrompt = settings.useIllustratorPass 
            ? illustratorPrompts[panel.id] 
            : undefined;

          const imageUrl = await generatePanelImage(
            panel,
            script.style_bible,
            settings.imageSize,
            illustratorPrompt
          );
          
          newImages[panel.id] = imageUrl;
          setImages({ ...newImages });
          
          setStatus(`Generated panel ${panel.id} (${Object.keys(newImages).length}/${allPanels.length})`);
        } catch (error) {
          console.error(`Failed to generate panel ${panel.id}:`, error);
          toast({
            title: "Panel Generation Failed",
            description: `Failed to generate panel ${panel.id}`,
            variant: "destructive",
          });
        } finally {
          setGeneratingPanels(prev => {
            const newSet = new Set(prev);
            newSet.delete(panel.id);
            return newSet;
          });
        }
      }

      setStatus(`Generated ${Object.keys(newImages).length} panel images`);
      
      toast({
        title: "Images Generated",
        description: `Successfully generated ${Object.keys(newImages).length} panel images`,
      });
    } catch (error) {
      console.error("Image generation failed:", error);
      setStatus("Image generation failed");
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleGeneratePanelImage = async (panel: Panel) => {
    if (!script || !apiKeyConfigured) return;

    setGeneratingPanels(prev => new Set(prev).add(panel.id));
    setStatus(`Generating panel ${panel.id}...`);

    try {
      const illustratorPrompt = settings.useIllustratorPass 
        ? illustratorPrompts[panel.id] 
        : undefined;

      const imageUrl = await generatePanelImage(
        panel,
        script.style_bible,
        settings.imageSize,
        illustratorPrompt
      );
      
      setImages(prev => ({ ...prev, [panel.id]: imageUrl }));
      setStatus(`Panel ${panel.id} generated successfully`);
    } catch (error) {
      console.error(`Failed to generate panel ${panel.id}:`, error);
      toast({
        title: "Panel Generation Failed",
        description: `Failed to generate panel ${panel.id}`,
        variant: "destructive",
      });
      setStatus("Panel generation failed");
    } finally {
      setGeneratingPanels(prev => {
        const newSet = new Set(prev);
        newSet.delete(panel.id);
        return newSet;
      });
    }
  };

  const handleRegeneratePanelImage = async (panel: Panel) => {
    // Add some variation to the description for regeneration
    const modifiedPanel = {
      ...panel,
      description: panel.description + " (enhanced drama, dynamic lighting)",
    };
    
    await handleGeneratePanelImage(modifiedPanel);
  };

  const handleEditPanel = (updatedPanel: Panel) => {
    if (!script) return;

    const updatedScript = {
      ...script,
      pages: script.pages.map(page => ({
        ...page,
        panels: page.panels.map(panel => 
          panel.id === updatedPanel.id ? updatedPanel : panel
        ),
      })),
    };

    setScript(updatedScript);
  };

  const handleDownloadZip = async () => {
    if (!script || Object.keys(images).length === 0) return;

    setStatus("Preparing download...");

    try {
      const zip = new JSZip();
      
      // Add script JSON
      zip.file("script.json", JSON.stringify(script, null, 2));

      // Add images
      for (const [panelId, dataUrl] of Object.entries(images)) {
        const base64 = dataUrl.split(",")[1];
        const panel = script.pages
          .flatMap(page => page.panels)
          .find(p => p.id === panelId);
        
        if (panel) {
          const pageNumber = script.pages.find(page => 
            page.panels.some(p => p.id === panelId)
          )?.number || 0;
          
          zip.file(`page-${pageNumber}_panel-${panelId}.png`, base64, { base64: true });
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const filename = `${script.title.replace(/\s+/g, "-")}.cbz`;
      saveAs(content, filename);
      
      setStatus("Download completed");
      toast({
        title: "Export Complete",
        description: `Downloaded ${filename}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to create CBZ file",
        variant: "destructive",
      });
      setStatus("Export failed");
    }
  };

  const handleSaveProject = async () => {
    if (!script) {
      toast({
        title: "No Script",
        description: "Generate a script first before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      const projectData = {
        title: projectTitle || script.title,
        description: projectDescription,
        inputText,
        scriptData: script,
        settings,
        illustratorPrompts: Object.keys(illustratorPrompts).length > 0 ? illustratorPrompts : undefined,
      };

      let project;
      if (currentProjectId) {
        project = await updateProject(currentProjectId, projectData);
        toast({
          title: "Project Updated",
          description: "Your manga project has been updated",
        });
      } else {
        project = await saveProject(projectData);
        setCurrentProjectId(project.id);
        toast({
          title: "Project Saved",
          description: "Your manga project has been saved to the database",
        });
      }

      // Save images if they exist
      for (const [panelId, imageData] of Object.entries(images)) {
        await saveImage({
          projectId: project.id,
          panelId,
          imageData,
        });
      }

      setShowSaveDialog(false);
    } catch (error) {
      console.error("Failed to save project:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save your project",
        variant: "destructive",
      });
    }
  };

  const handleLoadProjects = async () => {
    try {
      const projects = await listProjects();
      setSavedProjects(projects);
      setShowLoadDialog(true);
    } catch (error) {
      console.error("Failed to load projects:", error);
      toast({
        title: "Load Failed",
        description: "Failed to load saved projects",
        variant: "destructive",
      });
    }
  };

  const handleLoadProject = async (projectId: number) => {
    try {
      const { project, images: loadedImages } = await loadProject(projectId);
      
      setCurrentProjectId(project.id);
      setInputText(project.inputText);
      setScript(project.scriptData as MangaScript);
      setSettings(project.settings as GenerationSettings);
      
      if (project.illustratorPrompts) {
        setIllustratorPrompts(project.illustratorPrompts as Record<string, string>);
      }
      
      // Convert loaded images to the correct format
      const imageMap: Record<string, string> = {};
      for (const img of loadedImages) {
        imageMap[img.panelId] = img.imageData;
      }
      setImages(imageMap);
      
      setProjectTitle(project.title);
      setProjectDescription(project.description || "");
      setShowLoadDialog(false);
      
      toast({
        title: "Project Loaded",
        description: `Loaded project: ${project.title}`,
      });
    } catch (error) {
      console.error("Failed to load project:", error);
      toast({
        title: "Load Failed",
        description: "Failed to load the selected project",
        variant: "destructive",
      });
    }
  };

  const showLoadingOverlay = isGeneratingScript || isGeneratingImages;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-inter antialiased">
      <div className="flex">
        <Sidebar
          apiKeyConfigured={apiKeyConfigured}
          inputText={inputText}
          setInputText={setInputText}
          settings={settings}
          setSettings={setSettings}
          onGenerateScript={handleGenerateScript}
          onGenerateAllImages={handleGenerateAllImages}
          onBuildIllustratorPrompts={handleBuildIllustratorPrompts}
          isGeneratingScript={isGeneratingScript}
          isGeneratingImages={isGeneratingImages}
          hasScript={!!script}
          onSaveProject={() => {
            setProjectTitle(script?.title || "");
            setShowSaveDialog(true);
          }}
          onLoadProjects={handleLoadProjects}
        />
        
        <MainContent
          script={script}
          images={images}
          generatingPanels={generatingPanels}
          status={status}
          onGeneratePanelImage={handleGeneratePanelImage}
          onRegeneratePanelImage={handleRegeneratePanelImage}
          onEditPanel={handleEditPanel}
          onDownloadZip={handleDownloadZip}
        />
      </div>

      <LoadingOverlay
        isVisible={showLoadingOverlay}
        status={status}
      />

      {/* Save Project Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100">
          <DialogHeader>
            <DialogTitle>{currentProjectId ? "Update Project" : "Save Project"}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Save your manga project to the database for later editing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Enter project title"
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
                data-testid="input-project-title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Enter project description"
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
                rows={3}
                data-testid="textarea-project-description"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
                className="bg-neutral-800 border-neutral-700 text-neutral-100 hover:bg-neutral-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProject}
                className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white"
                data-testid="button-save-project-confirm"
              >
                {currentProjectId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Projects Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Project</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Select a saved project to continue editing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {savedProjects.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">No saved projects found</p>
            ) : (
              savedProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 cursor-pointer transition-colors"
                  onClick={() => handleLoadProject(project.id)}
                  data-testid={`project-item-${project.id}`}
                >
                  <h3 className="font-semibold mb-1">{project.title}</h3>
                  {project.description && (
                    <p className="text-sm text-neutral-400 mb-2">{project.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-neutral-500">
                    <span>Status: {project.status}</span>
                    <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowLoadDialog(false)}
              className="bg-neutral-800 border-neutral-700 text-neutral-100 hover:bg-neutral-700"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
