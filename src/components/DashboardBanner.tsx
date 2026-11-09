import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Waves, Fish, Compass } from 'lucide-react';
import { OfficialLogo } from './OfficialLogo';

interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  metric: string;
  image?: string;
  theme: 'photo' | 'aquaculture' | 'fluvial';
}

const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'slide-1',
    title: 'Jornadas Soberanas Venezuela Come + Pescado',
    subtitle:
      'Distribución directa de proteína pesquera e hidrobiológica a las familias barinesas en articulación con los CONPPA y productores locales.',
    location: 'Barinas · Pedraza · Bolívar · Obispos',
    metric: 'Atención Directa Comunitaria',
    image: '/assets/aistudio/1001588238-696x522_654285ab.jpg',
    theme: 'photo',
  },
  {
    id: 'slide-2',
    title: 'Acuicultura Continental y Piscicultura Llanera',
    subtitle:
      'Monitoreo de espejos de agua, lagunas de engorde y cultivo intensivo de Cachama Negra, Coporo y Morocoto en el piedemonte y llano alto.',
    location: 'Pedraza · Alberto Arvelo Torrealba · Sucre',
    metric: 'Producción Acuícola Sostenible',
    theme: 'aquaculture',
  },
  {
    id: 'slide-3',
    title: 'Cuencas Fluviales: Ríos Apure, Masparro y Santo Domingo',
    subtitle:
      'Registro técnico de captura artesanal responsable de Bagre Rayado, Palometa, Pavón y Curito en los ejes fluviales del estado Barinas.',
    location: 'Sosa · Arismendi · Rojas · Ezequiel Zamora',
    metric: 'Observatorio Hidrobiológico Regional',
    theme: 'fluvial',
  },
];

export const DashboardBanner: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const current = BANNER_SLIDES[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
  };

  return (
    <section
      aria-label="Galería regional de pesca y acuicultura en Barinas"
      className="w-full mb-6"
    >
      <div className="relative w-full rounded-2xl overflow-hidden border-none shadow-md bg-slate-900 min-h-[210px] sm:min-h-[230px] flex items-stretch">
        {/* Background Media Layer */}
        <div className="absolute inset-0 z-0">
          {current.theme === 'photo' && current.image && !imgErrors[current.id] ? (
            <>
              <img
                src={current.image}
                alt={current.title}
                referrerPolicy="no-referrer"
                onError={() =>
                  setImgErrors((prev) => ({ ...prev, [current.id]: true }))
                }
                className="w-full h-full object-cover object-center transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-sky-950/45" />
            </>
          ) : current.theme === 'aquaculture' ? (
            <div className="w-full h-full bg-gradient-to-r from-slate-950 via-cyan-950 to-sky-900 relative overflow-hidden">
              {/* Custom SVG Aquaculture Water Pond Contour Illustration */}
              <svg
                className="absolute right-0 top-0 h-full w-2/3 opacity-25 text-cyan-300"
                viewBox="0 0 600 260"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="440" cy="130" r="110" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" />
                <circle cx="440" cy="130" r="75" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="440" cy="130" r="40" stroke="currentColor" strokeWidth="1" />
                <path
                  d="M40 200 C140 160, 240 220, 340 180 C440 140, 520 190, 600 160"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M80 230 C180 190, 280 250, 380 210 C480 170, 540 220, 600 195"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-950 via-sky-950 to-teal-950 relative overflow-hidden">
              {/* Custom SVG River Basin Hydrography Illustration */}
              <svg
                className="absolute right-0 top-0 h-full w-2/3 opacity-25 text-sky-300"
                viewBox="0 0 600 260"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 20 C220 80, 180 150, 320 170 C440 185, 490 110, 600 140"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M220 0 C250 60, 290 130, 320 170"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <path
                  d="M410 260 C420 210, 440 185, 470 155"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content Foreground */}
        <div className="relative z-10 w-full px-6 sm:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-300 mb-2">
              <span className="inline-flex items-center gap-1">
                {current.theme === 'photo' ? (
                  <Fish className="w-3.5 h-3.5" />
                ) : current.theme === 'aquaculture' ? (
                  <Waves className="w-3.5 h-3.5" />
                ) : (
                  <Compass className="w-3.5 h-3.5" />
                )}
                {current.metric}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">{current.location}</span>
            </div>

            <h2
              className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2"
              style={{ textWrap: 'balance' }}
            >
              {current.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-xl">
              {current.subtitle}
            </p>
          </div>

          {/* Right Brand & Slide Controls */}
          <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 shrink-0">
            <div className="hidden sm:flex items-center drop-shadow-md">
              <OfficialLogo className="h-16 w-auto object-contain" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                {BANNER_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setActiveIndex(idx)}
                    aria-label={`Ver lámina ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === activeIndex
                        ? 'w-6 bg-cyan-400'
                        : 'w-2 bg-white/35 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handlePrev}
                aria-label="Lámina anterior"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Siguiente lámina"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
