import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Fish } from 'lucide-react';
import { OfficialLogo } from './OfficialLogo';

interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  metric: string;
  image: string;
}

const BANNER_SLIDES: BannerSlide[] = [
  {
    id: 'slide-1',
    title: 'Plan Venezuela Come Pescado · Región Barinas',
    subtitle:
      'Despliegue de ferias y operativos comunitarios garantizando el acceso directo a proteína hidrobiológica fresca a precios solidarios.',
    location: 'Operativo Regional · Estado Barinas',
    metric: 'Jornadas de Distribución Directa',
    image: '/assets/aistudio/Plan-Venezuela-Come-Pescado-3-t_a9347f64.webp',
  },
  {
    id: 'slide-2',
    title: 'Feria del Cardumen y Atención Soberana',
    subtitle:
      'Articulación directa entre pescadores artesanales, acuicultores y comunidades organizadas en los 12 municipios barineses.',
    location: 'Barinas · Pedraza · Sosa · Rojas',
    metric: 'Abastecimiento Comunitario',
    image: '/assets/aistudio/images_b85154ad.jpeg',
  },
  {
    id: 'slide-3',
    title: 'Variedad de Especies Fluviales y Marinas',
    subtitle:
      'Oferta proteica diversa con control y seguimiento estadístico por parte de la Coordinación del Observatorio de Pesca y Acuicultura.',
    location: 'Red de Distribución Regional',
    metric: 'Control y Observatorio Pesquero',
    image: '/assets/aistudio/jornada-come-pescado-2_aa3f3d47.jpg',
  },
  {
    id: 'slide-4',
    title: 'Operación Venezuela Come Pescado en Territorio',
    subtitle:
      'Consolidación de reportes técnicos, volumen distribuido y familias atendidas en cada jornada municipal y parroquial.',
    location: 'Cobertura Integral Barinas',
    metric: 'Monitoreo en Tiempo Real',
    image: '/assets/aistudio/1001588238-696x522_654285ab.jpg',
  },
];

export const DashboardBanner: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const current = BANNER_SLIDES[activeIndex];

  const handlePrev = () => {
    setActiveIndex(
      (prev) => (prev - 1 + BANNER_SLIDES.length) % BANNER_SLIDES.length
    );
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
  };

  return (
    <section
      aria-label="Galería fotográfica de jornadas Venezuela Come Pescado en Barinas"
      className="w-full mb-6"
    >
      <div className="relative w-full rounded-2xl overflow-hidden border-none shadow-md bg-slate-900 min-h-[240px] sm:min-h-[270px] flex items-stretch">
        {/* Background Media Layer */}
        <div className="absolute inset-0 z-0">
          {!imgErrors[current.id] ? (
            <>
              <img
                src={current.image}
                alt={current.title}
                referrerPolicy="no-referrer"
                onError={() =>
                  setImgErrors((prev) => ({ ...prev, [current.id]: true }))
                }
                className="w-full h-full object-cover object-center transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/75 to-slate-950/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/30" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-950 via-cyan-950 to-sky-900" />
          )}
        </div>

        {/* Content Foreground */}
        <div className="relative z-10 w-full px-6 sm:px-8 py-6 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-cyan-300 mb-2">
              <span className="inline-flex items-center gap-1.5">
                <Fish className="w-3.5 h-3.5" />
                {current.metric}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300">{current.location}</span>
            </div>

            <h2
              className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2"
              style={{ textWrap: 'balance' }}
            >
              {current.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-xl">
              {current.subtitle}
            </p>
          </div>

          {/* Right: Thumbnail Gallery Strip of Attached Photos + Controls */}
          <div className="flex flex-col items-start lg:items-end justify-between w-full lg:w-auto gap-4 shrink-0">
            <div className="hidden sm:flex items-center drop-shadow-lg">
              <OfficialLogo className="h-16 w-auto object-contain" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
              {/* Interactive Photo Thumbnails */}
              <div className="flex items-center gap-2">
                {BANNER_SLIDES.map((slide, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      aria-label={`Ver fotografía ${idx + 1}: ${slide.title}`}
                      className={`relative h-12 w-16 sm:h-14 sm:w-20 rounded-lg overflow-hidden transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'ring-2 ring-cyan-400 scale-105 shadow-lg'
                          : 'opacity-70 hover:opacity-100 ring-1 ring-white/25'
                      }`}
                    >
                      {!imgErrors[slide.id] ? (
                        <img
                          src={slide.image}
                          alt={slide.title}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setImgErrors((prev) => ({
                              ...prev,
                              [slide.id]: true,
                            }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-sky-900" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Fotografía anterior"
                  className="p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950/85 border border-white/15 text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Siguiente fotografía"
                  className="p-2 rounded-lg bg-slate-950/60 hover:bg-slate-950/85 border border-white/15 text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
