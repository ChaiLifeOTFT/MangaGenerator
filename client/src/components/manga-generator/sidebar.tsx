import { GenerationSettings } from "../../types/manga";

interface SidebarProps {
  apiKeyConfigured: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  settings: GenerationSettings;
  setSettings: (settings: GenerationSettings) => void;
  onGenerateScript: () => void;
  onGenerateAllImages: () => void;
  onBuildIllustratorPrompts: () => void;
  isGeneratingScript: boolean;
  isGeneratingImages: boolean;
  hasScript: boolean;
  onSaveProject?: () => void;
  onLoadProjects?: () => void;
}

export default function Sidebar({
  apiKeyConfigured,
  inputText,
  setInputText,
  settings,
  setSettings,
  onGenerateScript,
  onGenerateAllImages,
  onBuildIllustratorPrompts,
  isGeneratingScript,
  isGeneratingImages,
  hasScript,
  onSaveProject,
  onLoadProjects,
}: SidebarProps) {
  return (
    <div className="w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl flex items-center justify-center">
            <i className="fas fa-magic text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">MangaForge</h1>
            <p className="text-sm text-neutral-400">AI Manga Generator</p>
          </div>
        </div>

        {/* API Key Status */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-300">API Status</label>
          <div className="relative">
            <div className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              {apiKeyConfigured ? (
                <>
                  <i className="fas fa-check-circle text-emerald-400"></i>
                  <span className="text-emerald-400">OpenAI API Key Configured</span>
                </>
              ) : (
                <>
                  <i className="fas fa-exclamation-circle text-yellow-400"></i>
                  <span className="text-yellow-400">API Key Not Configured</span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-neutral-500">{apiKeyConfigured ? "Ready to generate manga" : "Contact admin to configure API key"}</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-6 border-b border-neutral-800 flex-1">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-pen-fancy text-fuchsia-400"></i>
          Source Material
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Input Text</label>
            <textarea
              rows={8}
              placeholder="Enter your story, synopsis, or any text to transform into manga..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all resize-none"
              data-testid="textarea-input-text"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Or Upload File</label>
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx,.md,.html,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                  const response = await fetch('/api/upload/file', {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    setInputText(data.text);
                  } else {
                    const error = await response.json();
                    alert(error.error || 'Failed to upload file');
                  }
                } catch (error) {
                  alert('Failed to upload file');
                }
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-fuchsia-500 file:text-white hover:file:bg-fuchsia-600"
              data-testid="input-file-upload"
            />
            <p className="text-xs text-neutral-500 mt-1">Supports PDF, TXT, DOC, DOCX, MD, HTML, JSON</p>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Pages</label>
              <input
                type="number"
                min="8"
                max="40"
                value={settings.desiredPages}
                onChange={(e) => setSettings({ ...settings, desiredPages: parseInt(e.target.value) || 20 })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                data-testid="input-desired-pages"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Model</label>
              <select
                value={settings.chatModel}
                onChange={(e) => setSettings({ ...settings, chatModel: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                data-testid="select-chat-model"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4">GPT-4</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={onGenerateScript}
            disabled={isGeneratingScript || !apiKeyConfigured || !inputText}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 disabled:from-neutral-600 disabled:to-neutral-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 flex items-center justify-center gap-2 shadow-lg"
            data-testid="button-generate-script"
          >
            {isGeneratingScript ? (
              <i className="fas fa-spinner animate-spin"></i>
            ) : (
              <i className="fas fa-play"></i>
            )}
            Generate Script
          </button>
        </div>
      </div>

      {/* Image Settings */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-image text-fuchsia-400"></i>
          Image Generation
        </h3>

        {/* Perplexity API Notice */}
        <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-300">
            <i className="fas fa-info-circle mr-1"></i>
            Note: Using Perplexity API - Image generation shows placeholders only
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Image Size</label>
            <select
              value={settings.imageSize}
              onChange={(e) => setSettings({ ...settings, imageSize: e.target.value })}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              data-testid="select-image-size"
            >
              <option value="1024x1024">1024x1024 (Square)</option>
              <option value="1024x1792">1024x1792 (Portrait)</option>
              <option value="1792x1024">1792x1024 (Landscape)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg">
            <input
              type="checkbox"
              id="illustratorPass"
              checked={settings.useIllustratorPass}
              onChange={(e) => setSettings({ ...settings, useIllustratorPass: e.target.checked })}
              className="w-4 h-4 text-fuchsia-500 bg-neutral-700 border-neutral-600 rounded focus:ring-fuchsia-500"
              data-testid="checkbox-illustrator-pass"
            />
            <div>
              <label htmlFor="illustratorPass" className="text-sm font-medium">Use Illustrator Pass</label>
              <p className="text-xs text-neutral-400">AI-refined prompts for better consistency</p>
            </div>
          </div>

          <button
            onClick={onBuildIllustratorPrompts}
            disabled={!hasScript}
            className="w-full bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-200 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mb-2"
            data-testid="button-build-illustrator-prompts"
          >
            <i className="fas fa-wand-magic-sparkles"></i>
            Build Illustrator Prompts
          </button>

          <button
            onClick={onGenerateAllImages}
            disabled={isGeneratingImages || !hasScript}
            className="w-full bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-200 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            data-testid="button-generate-all-images"
          >
            {isGeneratingImages ? (
              <i className="fas fa-spinner animate-spin"></i>
            ) : (
              <i className="fas fa-images"></i>
            )}
            Generate All Images (Placeholders)
          </button>
        </div>
      </div>

      {/* Project Management */}
      <div className="p-6 border-t border-neutral-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <i className="fas fa-folder text-fuchsia-400"></i>
          Project Management
        </h3>
        <div className="space-y-2">
          <button
            onClick={onSaveProject}
            disabled={!hasScript}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            data-testid="button-save-project"
          >
            <i className="fas fa-save"></i>
            Save Project
          </button>
          <button
            onClick={onLoadProjects}
            className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-neutral-200 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            data-testid="button-load-projects"
          >
            <i className="fas fa-folder-open"></i>
            Load Project
          </button>
        </div>
      </div>
    </div>
  );
}
