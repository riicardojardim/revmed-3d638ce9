import { useEffect, useState } from "react";

type ZoomImage = { src: string; alt: string } | null;

export function useImageZoom() {
  const [zoomImage, setZoomImage] = useState<ZoomImage>(null);
  return { zoomImage, setZoomImage };
}

export function ImageZoomOverlay({
  zoomImage,
  onClose,
}: {
  zoomImage: ZoomImage;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!zoomImage) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomImage, onClose]);

  if (!zoomImage) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out animate-in fade-in"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 text-white h-10 w-10 flex items-center justify-center text-xl"
      >
        ×
      </button>
      <img
        src={zoomImage.src}
        alt={zoomImage.alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full object-contain rounded-md shadow-2xl cursor-zoom-in"
        style={{ touchAction: "pan-x pan-y pinch-zoom" }}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
        Clique fora ou pressione Esc para fechar
      </div>
    </div>
  );
}

export function ZoomableImage({
  src,
  alt,
  className,
  onZoom,
}: {
  src: string;
  alt: string;
  className?: string;
  onZoom: (img: { src: string; alt: string }) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onZoom({ src, alt })}
      className="block w-full group relative"
      title="Clique para ampliar"
    >
      <img src={src} alt={alt} className={className} />
      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
        🔍 ampliar
      </span>
    </button>
  );
}
