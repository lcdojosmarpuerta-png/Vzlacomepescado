import React, { useEffect, useState } from 'react';
import { Fish } from 'lucide-react';

interface OfficialLogoProps {
  className?: string;
  alt?: string;
}

let cachedCleanLogoUrl: string | null = null;

/**
 * Loads the uploaded Operación Venezuela Come Pescado logo and removes
 * the baked-in grey/white checkerboard background via border flood-fill
 * so the logo renders with a clean transparent silhouette.
 */
export const OfficialLogo: React.FC<OfficialLogoProps> = ({
  className = 'h-24 w-auto object-contain',
  alt = 'Logo Oficial Operación Venezuela Come Pescado',
}) => {
  const [processedUrl, setProcessedUrl] = useState<string | null>(
    cachedCleanLogoUrl
  );
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (cachedCleanLogoUrl) {
      setProcessedUrl(cachedCleanLogoUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/aistudio/IMG_20261109_154120_addb76cb.jpg';

    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        // Crop out the tiny stray dark mark at the bottom 3.5% of the image
        const effectiveH = Math.floor(h * 0.96);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = effectiveH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setProcessedUrl(img.src);
          return;
        }

        ctx.drawImage(img, 0, 0, w, effectiveH, 0, 0, w, effectiveH);
        const imageData = ctx.getImageData(0, 0, w, effectiveH);
        const data = imageData.data;

        // Checkerboard background pixels are low-saturation light gray / white
        const isBackgroundPixel = (idx: number): boolean => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const diff = max - min;
          // Neutral gray/white checkerboard squares have very low chroma (diff <= 22) and medium-high brightness (min >= 165)
          return diff <= 24 && min >= 160;
        };

        const visited = new Uint8Array(w * effectiveH);
        const queue = new Int32Array(w * effectiveH);
        let head = 0;
        let tail = 0;

        const pushIfBg = (x: number, y: number) => {
          if (x < 0 || x >= w || y < 0 || y >= effectiveH) return;
          const pos = y * w + x;
          if (visited[pos]) return;
          const idx = pos * 4;
          if (isBackgroundPixel(idx)) {
            visited[pos] = 1;
            queue[tail++] = pos;
          }
        };

        // Seed flood-fill from all 4 outer edges
        for (let x = 0; x < w; x++) {
          pushIfBg(x, 0);
          pushIfBg(x, effectiveH - 1);
        }
        for (let y = 0; y < effectiveH; y++) {
          pushIfBg(0, y);
          pushIfBg(w - 1, y);
        }

        // BFS flood-fill exterior checkerboard
        while (head < tail) {
          const pos = queue[head++];
          const idx = pos * 4;
          data[idx + 3] = 0; // Set alpha to 0

          const x = pos % w;
          const y = (pos - x) / w;

          pushIfBg(x + 1, y);
          pushIfBg(x - 1, y);
          pushIfBg(x, y + 1);
          pushIfBg(x, y - 1);
        }

        // Soften 1px anti-aliased edge fringe around transparent pixels
        for (let y = 1; y < effectiveH - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const pos = y * w + x;
            if (visited[pos]) continue;
            const hasTransparentNeighbor =
              visited[pos - 1] ||
              visited[pos + 1] ||
              visited[pos - w] ||
              visited[pos + w];
            if (hasTransparentNeighbor) {
              const idx = pos * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              if (Math.max(r, g, b) - Math.min(r, g, b) < 35 && Math.min(r, g, b) > 150) {
                data[idx + 3] = 60;
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const cleanDataUrl = canvas.toDataURL('image/png');
        cachedCleanLogoUrl = cleanDataUrl;
        setProcessedUrl(cleanDataUrl);
      } catch {
        setProcessedUrl('/assets/aistudio/IMG_20261109_154120_addb76cb.jpg');
      }
    };

    img.onerror = () => {
      setImgError(true);
    };
  }, []);

  if (imgError) {
    return (
      <div className="inline-flex items-center gap-3 px-4 py-2">
        <Fish className="w-9 h-9 text-cyan-500" />
        <div>
          <span className="block text-xs font-extrabold text-amber-400">
            OPERACIÓN VENEZUELA
          </span>
          <span className="block text-lg font-black text-cyan-400">
            COME PESCADO
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={processedUrl || '/assets/aistudio/IMG_20261109_154120_addb76cb.jpg'}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setImgError(true)}
      className={className}
    />
  );
};
