import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BarChart3, Fish } from 'lucide-react';

interface HeroLandingProps {
  onEnterDashboard: () => void;
  totalToneladas?: number;
  totalSpecies?: number;
  totalMunicipios?: number;
  totalFiles?: number;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({
  onEnterDashboard,
}) => {
  const [bgError, setBgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-950 text-white pb-14">
      {/* High-Definition Full-Screen Background with Resilient Fallback */}
      <div className="absolute inset-0 z-0">
        {!bgError ? (
          <img
            src="/assets/aistudio/1001588238-696x522_654285ab.jpg"
            alt="Jornada de Venezuela Come Pescado en la Región Barinas"
            referrerPolicy="no-referrer"
            onError={() => setBgError(true)}
            className="w-full h-full object-cover object-center scale-105 filter saturate-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900" />
        )}
        {/* Multi-layered Ocean/Slate Contrast Overlay (WCAG AA+ compliance) */}
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-sky-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
      </div>

      {/* Subtle Top Institutional Bar - Only Action Button "Abrir Panel" */}
      <header className="relative z-10 w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 pt-6 flex items-center justify-end">
        <button
          onClick={onEnterDashboard}
          className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Abrir Panel
        </button>
      </header>

      {/* Main Content Aligned Left-Center */}
      <main className="relative z-10 flex-1 flex items-center w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-12">
        <div className="max-w-3xl flex flex-col items-start text-left">
          {/* Official Site Logo with Smooth Entrance Animation */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mb-7"
          >
            <div className="inline-flex items-center p-3 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl shadow-cyan-950/50">
              {!logoError ? (
                <img
                  src="/assets/aistudio/venezuela_come_49c2d0ef.png"
                  alt="Logo Oficial Venezuela Come Pescado"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="h-20 sm:h-28 md:h-32 w-auto object-contain"
                />
              ) : (
                <div className="flex items-center gap-3 px-4 py-2">
                  <Fish className="w-10 h-10 text-cyan-600" />
                  <div>
                    <span className="block text-xs font-extrabold text-amber-500">
                      VENEZUELA
                    </span>
                    <span className="block text-xl font-black text-cyan-600">
                      COME + PESCADO
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Kicker metadata */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-cyan-300 mb-3"
          >
            <span>Sistema Regional de Monitoreo</span>
            <span aria-hidden="true">·</span>
            <span>Estado Barinas</span>
            <span aria-hidden="true">·</span>
            <span>Datos Acumulativos en Tiempo Real</span>
          </motion.div>

          {/* Main H1 Title */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-4"
            style={{ textWrap: 'balance' }}
          >
            Venezuela Come + Pescado (Región Barinas)
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg sm:text-xl lg:text-2xl font-normal text-slate-200 max-w-2xl mb-4 leading-relaxed"
          >
            Coordinación de Observatorio de Pesca y Acuicultura
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-base text-slate-300 max-w-xl mb-8 leading-relaxed"
          >
            Plataforma integral para la consolidación de jornadas de distribución proteica,
            producción piscícola y captura fluvial en los 12 municipios del estado Barinas
            mediante integración acumulativa de hojas de cálculo Excel.
          </motion.p>

          {/* Primary CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-4"
          >
            <button
              onClick={onEnterDashboard}
              className="group inline-flex items-center gap-3 px-7 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-base shadow-xl shadow-cyan-950/60 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Ingresar</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-150 group-hover:translate-x-1" />
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};
