import { Panel } from "../../types/manga";

interface PanelCardProps {
  panel: Panel;
  pageNumber: number;
  imageUrl?: string;
  isGenerating?: boolean;
  onGenerateImage: () => void;
  onRegenerateImage: () => void;
  onEditPanel: (updatedPanel: Panel) => void;
}

export default function PanelCard({
  panel,
  pageNumber,
  imageUrl,
  isGenerating,
  onGenerateImage,
  onRegenerateImage,
  onEditPanel,
}: PanelCardProps) {
  const handleDescriptionChange = (description: string) => {
    onEditPanel({ ...panel, description });
  };

  const handleDialogueChange = (dialogue: string) => {
    const lines = dialogue.split(/\n+/).filter(Boolean);
    onEditPanel({ ...panel, dialogue: lines });
  };

  const handleSfxChange = (sfx: string) => {
    const effects = sfx.split(",").map(s => s.trim()).filter(Boolean);
    onEditPanel({ ...panel, sfx: effects });
  };

  return (
    <div className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden hover:border-neutral-600 transition-all duration-200 group">
      {/* Panel Image */}
      <div className="relative aspect-square bg-neutral-900 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Manga panel ${panel.id}`}
            className="w-full h-full object-cover grayscale filter contrast-125"
          />
        ) : isGenerating ? (
          <div className="text-center">
            <div className="animate-spin text-fuchsia-400 text-2xl mb-2">
              <i className="fas fa-sync-alt"></i>
            </div>
            <div className="text-sm text-neutral-400">Generating...</div>
          </div>
        ) : (
          <div className="text-neutral-500 text-center p-4">
            <i className="fas fa-image text-2xl mb-2 block"></i>
            <div className="text-sm">Panel {panel.id}</div>
            <div className="text-xs text-neutral-600 mt-1">Click to generate</div>
          </div>
        )}

        {/* Panel Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="flex gap-2">
            <button
              onClick={imageUrl ? onRegenerateImage : onGenerateImage}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white p-2 rounded-lg transition-colors"
              data-testid={`button-${imageUrl ? 'regenerate' : 'generate'}-${panel.id}`}
            >
              <i className={`fas ${imageUrl ? 'fa-redo' : 'fa-image'} text-sm`}></i>
            </button>
            <button className="bg-neutral-700 hover:bg-neutral-600 text-white p-2 rounded-lg transition-colors">
              <i className="fas fa-edit text-sm"></i>
            </button>
            <button className="bg-neutral-700 hover:bg-neutral-600 text-white p-2 rounded-lg transition-colors">
              <i className="fas fa-expand text-sm"></i>
            </button>
          </div>
        </div>

        {/* Panel ID */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {panel.id}
        </div>
      </div>

      {/* Panel Details */}
      <div className="p-4">
        <textarea
          value={panel.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-2 text-sm mb-2 resize-none"
          rows={3}
          data-testid={`textarea-description-${panel.id}`}
        />

        {/* Dialogue Section */}
        <div className="space-y-2">
          <div className="text-xs text-neutral-400 font-medium">Dialogue:</div>
          <textarea
            value={panel.dialogue.join("\n")}
            onChange={(e) => handleDialogueChange(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-2 text-xs"
            rows={2}
            placeholder="Enter dialogue lines..."
            data-testid={`textarea-dialogue-${panel.id}`}
          />

          <div className="text-xs text-neutral-400 font-medium mt-3">SFX:</div>
          <input
            value={panel.sfx.join(", ")}
            onChange={(e) => handleSfxChange(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-2 text-xs"
            placeholder="Enter sound effects..."
            data-testid={`input-sfx-${panel.id}`}
          />
        </div>
      </div>
    </div>
  );
}
