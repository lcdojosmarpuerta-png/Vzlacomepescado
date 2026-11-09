import React, { useState } from 'react';
import { Phone } from 'lucide-react';

export const StickyFooter: React.FC = () => {
  const [imgError, setImgError] = useState(false);

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-cyan-500/20 text-slate-200 px-4 py-2 shadow-lg"
      aria-label="Créditos del desarrollador"
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          <div className="h-7 px-2 py-0.5 rounded bg-white flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            {!imgError ? (
              <img
                src="/assets/aistudio/IMG-20261013-WA0042_ee5e03ef.jpg"
                alt="Logo S&S Web Studio"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-6 w-auto object-contain"
              />
            ) : (
              <span className="text-[11px] font-extrabold tracking-tight text-slate-900">
                S&amp;S <span className="text-cyan-600">WEB STUDIO</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-100 tracking-tight truncate">
            Diseñado y creado por S&amp;S Web Studio | 0424-5104245
          </p>
        </div>

        <a
          href="tel:04245104245"
          className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono tabular-nums text-cyan-300 hover:text-cyan-200 transition-colors whitespace-nowrap shrink-0"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Contacto Directo: 0424-5104245</span>
        </a>
      </div>
    </footer>
  );
};
