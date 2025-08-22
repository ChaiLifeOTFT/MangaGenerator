import { MangaScript, Panel } from "../../types/manga";
import PanelCard from "./panel-card";

interface MainContentProps {
  script: MangaScript | null;
  images: Record<string, string>;
  generatingPanels: Set<string>;
  status: string;
  onGeneratePanelImage: (panel: Panel) => void;
  onRegeneratePanelImage: (panel: Panel) => void;
  onEditPanel: (panel: Panel) => void;
  onDownloadZip: () => void;
}

export default function MainContent({
  script,
  images,
  generatingPanels,
  status,
  onGeneratePanelImage,
  onRegeneratePanelImage,
  onEditPanel,
  onDownloadZip,
}: MainContentProps) {
  if (!script) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-center">
          <p className="text-neutral-400">Generate a script to start creating your manga</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-neutral-500">
            <i className="fas fa-book-open text-4xl mb-4 block"></i>
            <p>Your manga pages will appear here once generated</p>
          </div>
        </div>
      </div>
    );
  }

  const totalPanels = script.pages.reduce((sum, page) => sum + page.panels.length, 0);
  const generatedImages = Object.keys(images).length;

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold" data-testid="text-script-title">{script.title}</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900 text-emerald-300">
            <i className="fas fa-check-circle mr-1"></i>
            Script Generated
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <i className="fas fa-clock"></i>
            <span data-testid="text-status">{status}</span>
          </div>

          {/* Export Button */}
          <button
            onClick={onDownloadZip}
            disabled={generatedImages === 0}
            className="bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 text-neutral-200 font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2"
            data-testid="button-export-cbz"
          >
            <i className="fas fa-download"></i>
            Export CBZ
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Script Overview */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-900/50">
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
                <h3 className="font-semibold text-neutral-200 mb-2 flex items-center gap-2">
                  <i className="fas fa-book text-fuchsia-400"></i>
                  Story Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Pages:</span>
                    <span data-testid="text-page-count">{script.pages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Total Panels:</span>
                    <span data-testid="text-panel-count">{totalPanels}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Setting:</span>
                    <span className="text-right text-xs" data-testid="text-setting">{script.style_bible.setting}</span>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
                <h3 className="font-semibold text-neutral-200 mb-2 flex items-center gap-2">
                  <i className="fas fa-users text-fuchsia-400"></i>
                  Characters
                </h3>
                <div className="space-y-2 text-sm">
                  {script.style_bible.characters.map((character, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-fuchsia-400 rounded-full mt-1.5 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-neutral-200" data-testid={`text-character-name-${index}`}>{character.name}</div>
                        <div className="text-xs text-neutral-400" data-testid={`text-character-role-${index}`}>{character.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
                <h3 className="font-semibold text-neutral-200 mb-2 flex items-center gap-2">
                  <i className="fas fa-palette text-fuchsia-400"></i>
                  Visual Style
                </h3>
                <div className="space-y-2 text-sm">
                  {script.style_bible.themes.map((theme, index) => (
                    <div
                      key={index}
                      className="inline-block bg-neutral-700 text-neutral-300 px-2 py-1 rounded text-xs mr-1 mb-1"
                      data-testid={`text-theme-${index}`}
                    >
                      {theme}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pages Section */}
        <div className="p-6">
          <div className="max-w-6xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Pages & Panels</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-400">
                  {generatedImages} of {totalPanels} panels generated
                </span>
              </div>
            </div>

            {script.pages.map((page) => (
              <div key={page.number} className="mb-8">
                {/* Page Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-fuchsia-500 text-white rounded-lg font-semibold text-sm">
                    {page.number}
                  </div>
                  <h3 className="text-xl font-semibold">Page {page.number}</h3>
                  <span className="text-sm text-neutral-400">{page.panels.length} panels</span>
                </div>

                {/* Panel Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {page.panels.map((panel) => (
                    <PanelCard
                      key={panel.id}
                      panel={panel}
                      pageNumber={page.number}
                      imageUrl={images[panel.id]}
                      isGenerating={generatingPanels.has(panel.id)}
                      onGenerateImage={() => onGeneratePanelImage(panel)}
                      onRegenerateImage={() => onRegeneratePanelImage(panel)}
                      onEditPanel={onEditPanel}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
