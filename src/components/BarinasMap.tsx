import React, { useMemo, useState } from 'react';
import { MapPin, RotateCcw } from 'lucide-react';
import { FisheryRecord } from '../types/fishery';
import { normalizeMunicipioBarinas } from '../data/demoData';

interface BarinasMapProps {
  records: FisheryRecord[];
  selectedMunicipio: string;
  onSelectMunicipio: (municipio: string) => void;
}

interface MunicipioShape {
  name: string;
  shortLabel: string;
  capital: string;
  path: string;
  labelX: number;
  labelY: number;
}

/**
 * Cartographic SVG representation of the 12 municipalities of Barinas State
 * arranged from the Andean Piedmont (West/Northwest) to the Llanos Bajos along the Apure River (East/Southeast).
 */
const BARINAS_MUNICIPIOS: MunicipioShape[] = [
  {
    name: 'Andrés Eloy Blanco',
    shortLabel: 'A. E. Blanco',
    capital: 'El Cantón',
    path: 'M 25,195 L 88,175 L 105,215 L 82,250 L 30,242 Z',
    labelX: 64,
    labelY: 215,
  },
  {
    name: 'Ezequiel Zamora',
    shortLabel: 'E. Zamora',
    capital: 'Santa Bárbara',
    path: 'M 42,125 L 118,108 L 135,168 L 88,175 L 25,195 Z',
    labelX: 85,
    labelY: 150,
  },
  {
    name: 'Antonio José de Sucre',
    shortLabel: 'Sucre',
    capital: 'Socopó',
    path: 'M 118,108 L 175,82 L 195,142 L 135,168 Z',
    labelX: 156,
    labelY: 128,
  },
  {
    name: 'Pedraza',
    shortLabel: 'Pedraza',
    capital: 'Ciudad Bolivia',
    path: 'M 175,82 L 245,58 L 278,155 L 195,142 Z',
    labelX: 226,
    labelY: 112,
  },
  {
    name: 'Bolívar',
    shortLabel: 'Bolívar',
    capital: 'Barinitas',
    path: 'M 232,26 L 285,20 L 292,56 L 245,58 Z',
    labelX: 264,
    labelY: 42,
  },
  {
    name: 'Cruz Paredes',
    shortLabel: 'Cruz Paredes',
    capital: 'Barrancas',
    path: 'M 285,20 L 336,28 L 332,64 L 292,56 Z',
    labelX: 312,
    labelY: 44,
  },
  {
    name: 'Barinas',
    shortLabel: 'Barinas',
    capital: 'Barinas',
    path: 'M 245,58 L 292,56 L 332,64 L 368,125 L 278,155 Z',
    labelX: 306,
    labelY: 104,
  },
  {
    name: 'Obispos',
    shortLabel: 'Obispos',
    capital: 'Obispos',
    path: 'M 278,155 L 368,125 L 385,182 L 295,195 Z',
    labelX: 334,
    labelY: 164,
  },
  {
    name: 'Alberto Arvelo Torrealba',
    shortLabel: 'Sabaneta',
    capital: 'Sabaneta',
    path: 'M 332,64 L 392,52 L 408,108 L 368,125 Z',
    labelX: 374,
    labelY: 88,
  },
  {
    name: 'Rojas',
    shortLabel: 'Rojas',
    capital: 'Libertad',
    path: 'M 368,125 L 408,108 L 448,118 L 436,174 L 385,182 Z',
    labelX: 412,
    labelY: 146,
  },
  {
    name: 'Sosa',
    shortLabel: 'Sosa',
    capital: 'Ciudad de Nutrias',
    path: 'M 385,182 L 436,174 L 492,165 L 486,225 L 378,228 Z',
    labelX: 438,
    labelY: 202,
  },
  {
    name: 'Arismendi',
    shortLabel: 'Arismendi',
    capital: 'Arismendi',
    path: 'M 448,118 L 575,95 L 582,195 L 492,165 L 436,174 Z',
    labelX: 518,
    labelY: 145,
  },
];

export const BarinasMap: React.FC<BarinasMapProps> = ({
  records,
  selectedMunicipio,
  onSelectMunicipio,
}) => {
  const [hoveredMun, setHoveredMun] = useState<string | null>(null);

  const statsByMunicipio = useMemo(() => {
    const map = new Map<
      string,
      { toneladas: number; kilogramos: number; familias: number; jornadas: number }
    >();
    BARINAS_MUNICIPIOS.forEach((m) => {
      map.set(m.name, { toneladas: 0, kilogramos: 0, familias: 0, jornadas: 0 });
    });

    records.forEach((r) => {
      const canonical = normalizeMunicipioBarinas(r.municipio);
      const prev = map.get(canonical) || {
        toneladas: 0,
        kilogramos: 0,
        familias: 0,
        jornadas: 0,
      };
      map.set(canonical, {
        toneladas: prev.toneladas + r.toneladas,
        kilogramos: prev.kilogramos + (r.kilogramos ?? r.toneladas * 1000),
        familias: prev.familias + r.familiasBeneficiadas,
        jornadas: prev.jornadas + 1,
      });
    });

    return map;
  }, [records]);

  const maxJornadas = useMemo(() => {
    let max = 0;
    statsByMunicipio.forEach((v) => {
      if (v.jornadas > max) max = v.jornadas;
    });
    return max > 0 ? max : 1;
  }, [statsByMunicipio]);

  const getFillColor = (munName: string, isSelected: boolean, isHovered: boolean) => {
    const data = statsByMunicipio.get(munName);
    const jornadas = data?.jornadas || 0;
    if (isSelected) return '#0f172a';
    if (isHovered) return '#0891b2';
    if (jornadas <= 0) return '#f1f5f9';
    const ratio = jornadas / maxJornadas;
    if (ratio >= 0.75) return '#0284c7';
    if (ratio >= 0.45) return '#06b6d4';
    if (ratio >= 0.2) return '#38bdf8';
    return '#bae6fd';
  };

  const activeMunName =
    hoveredMun ||
    (selectedMunicipio !== 'Todos'
      ? normalizeMunicipioBarinas(selectedMunicipio)
      : 'Barinas');
  const activeMunShape =
    BARINAS_MUNICIPIOS.find((m) => m.name === activeMunName) ||
    BARINAS_MUNICIPIOS[6];
  const activeStats = statsByMunicipio.get(activeMunShape.name) || {
    toneladas: 0,
    kilogramos: 0,
    familias: 0,
    jornadas: 0,
  };

  return (
    <section
      id="seccion-mapa"
      aria-label="Mapa Territorial de Distribución en Barinas"
      className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-700" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Mapa Territorial del Estado Barinas (12 Municipios)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Haz clic sobre cualquier municipio en el mapa para filtrar los indicadores, gráficos y registros
          </p>
        </div>

        {selectedMunicipio !== 'Todos' && (
          <button
            type="button"
            onClick={() => onSelectMunicipio('Todos')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mostrar los 12 Municipios</span>
          </button>
        )}
      </div>

      <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
        <div className="relative w-full aspect-[14/6] max-h-[300px]">
          <svg
            viewBox="0 0 605 260"
            className="w-full h-full select-none"
            role="img"
            aria-label="Mapa interactivo de los 12 municipios del estado Barinas"
          >
            {/* Subtle hydrographic river lines */}
            <path
              d="M 25,245 Q 210,210 378,228 T 590,198"
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="2.5"
              strokeDasharray="5 4"
            />

            {BARINAS_MUNICIPIOS.map((mun) => {
              const isSelected =
                normalizeMunicipioBarinas(selectedMunicipio) === mun.name;
              const isHovered = hoveredMun === mun.name;
              const fill = getFillColor(mun.name, isSelected, isHovered);
              const textLight =
                isSelected ||
                isHovered ||
                fill === '#0284c7' ||
                fill === '#06b6d4';

              return (
                <g
                  key={mun.name}
                  onClick={() =>
                    onSelectMunicipio(isSelected ? 'Todos' : mun.name)
                  }
                  onMouseEnter={() => setHoveredMun(mun.name)}
                  onMouseLeave={() => setHoveredMun(null)}
                  className="cursor-pointer transition-opacity"
                >
                  <path
                    d={mun.path}
                    fill={fill}
                    stroke={isSelected ? '#22d3ee' : '#ffffff'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    strokeLinejoin="round"
                  />
                  <text
                    x={mun.labelX}
                    y={mun.labelY}
                    textAnchor="middle"
                    className="text-[9px] font-bold pointer-events-none"
                    fill={textLight ? '#ffffff' : '#0f172a'}
                  >
                    {mun.shortLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Map Legend & Hovered Municipality Details Bar */}
        <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-900">
              Municipio {activeMunShape.name}{' '}
              <span className="font-normal text-slate-500">
                (Cap. {activeMunShape.capital})
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono tabular-nums mt-0.5">
              <span className="font-bold text-cyan-800">
                {activeStats.jornadas}{' '}
                {activeStats.jornadas === 1 ? 'jornada' : 'jornadas'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {activeStats.kilogramos.toLocaleString('es-VE', {
                  maximumFractionDigits: 1,
                })}{' '}
                Kg ({activeStats.toneladas.toFixed(2)} TM)
              </span>
              {activeStats.familias > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeStats.familias.toLocaleString('es-VE')} familias
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Menor actividad</span>
            <span className="w-3.5 h-2.5 rounded-xs bg-sky-200 inline-block" />
            <span className="w-3.5 h-2.5 rounded-xs bg-sky-400 inline-block" />
            <span className="w-3.5 h-2.5 rounded-xs bg-cyan-500 inline-block" />
            <span className="w-3.5 h-2.5 rounded-xs bg-sky-600 inline-block" />
            <span>Mayor actividad</span>
          </div>
        </div>
      </div>
    </section>
  );
};
