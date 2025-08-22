import { useState, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { MangaScript, Panel, GenerationSettings } from "../types/manga";
import {
  generateMangaScript,
  generateIllustratorPrompts,
  generatePanelImage,
} from "../lib/manga-api";
import Sidebar from "../components/manga-generator/sidebar";
import MainContent from "../components/manga-generator/main-content";
import LoadingOverlay from "../components/manga-generator/loading-overlay";
import { useToast } from "../hooks/use-toast";

export default function MangaGenerator() {
  const [apiKey, setApiKey] = useState("");
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

  const { toast } = useToast();

  // Persist API key locally
  useEffect(() => {
    const savedKey = localStorage.getItem("OPENAI_API_KEY");
    if (savedKey) setApiKey(savedKey);
  }, []);

  useEffect(() => {
    if (apiKey) localStorage.setItem("OPENAI_API_KEY", apiKey);
  }, [apiKey]);

  const handleGenerateScript = async () => {
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key",
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
        apiKey,
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
    if (!script || !apiKey) return;

    setStatus("Building illustrator prompts...");

    try {
      const allPanels = script.pages.flatMap(page => page.panels);
      const prompts = await generateIllustratorPrompts(
        apiKey,
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
    if (!script || !apiKey) return;

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
            apiKey,
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
    if (!script || !apiKey) return;

    setGeneratingPanels(prev => new Set(prev).add(panel.id));
    setStatus(`Generating panel ${panel.id}...`);

    try {
      const illustratorPrompt = settings.useIllustratorPass 
        ? illustratorPrompts[panel.id] 
        : undefined;

      const imageUrl = await generatePanelImage(
        apiKey,
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

  const showLoadingOverlay = isGeneratingScript || isGeneratingImages;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-inter antialiased">
      <div className="flex">
        <Sidebar
          apiKey={apiKey}
          setApiKey={setApiKey}
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
    </div>
  );
}
