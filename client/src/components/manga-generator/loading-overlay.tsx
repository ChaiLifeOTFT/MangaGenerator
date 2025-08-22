interface LoadingOverlayProps {
  isVisible: boolean;
  status: string;
}

export default function LoadingOverlay({ isVisible, status }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-neutral-800 rounded-2xl p-8 border border-neutral-700 shadow-2xl max-w-md w-full mx-4">
        <div className="text-center">
          <div className="animate-spin text-fuchsia-400 text-4xl mb-4 mx-auto w-fit">
            <i className="fas fa-magic"></i>
          </div>
          <h3 className="text-xl font-semibold mb-2">Generating Manga</h3>
          <p className="text-neutral-400 mb-4">{status}</p>
          <div className="w-full bg-neutral-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 h-2 rounded-full transition-all duration-300 w-2/3"></div>
          </div>
          <p className="text-sm text-neutral-500 mt-2">This may take several minutes</p>
        </div>
      </div>
    </div>
  );
}
