import { GenerationSettings } from "../../types/manga";

interface SidebarProps {
  apiKey: string;
  setApiKey: (key: string) => void;
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
}

export default function Sidebar({
  apiKey,
  setApiKey,
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

        {/* API Key Input */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-neutral-300">OpenAI API Key</label>
          <div className="relative">
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
              data-testid="input-api-key"
            />
            <i className="fas fa-key absolute right-3 top-2.5 text-neutral-500 text-sm"></i>
          </div>
          <p className="text-xs text-neutral-500">Stored locally for convenience</p>
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
            disabled={isGeneratingScript || !apiKey || !inputText}
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
            Generate All Images
          </button>
        </div>
      </div>
    </div>
  );
}
