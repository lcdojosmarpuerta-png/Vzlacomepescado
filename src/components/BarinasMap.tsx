import React, { useMemo, useState } from 'react';
import { MapPin, CheckCircle2, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { FisheryRecord } from '../types/fishery';

interface BarinasMapProps {
  records: FisheryRecord[];
  selectedMunicipio: string;
  onSelectMunicipio: (municipio: string) => void;
  regionalGoalTons: number;
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
  regionalGoalTons,
}) => {
  const [hoveredMun, setHoveredMun] = useState<string | null>(null);

  const statsByMunicipio = useMemo(() => {
    const map = new Map<
      string,
      { toneladas: number; familias: number; jornadas: number }
    >();
    BARINAS_MUNICIPIOS.forEach((m) => {
      map.set(m.name, { toneladas: 0, familias: 0, jornadas: 0 });
    });

    records.forEach((r) => {
      const prev = map.get(r.municipio) || {
        toneladas: 0,
        familias: 0,
        jornadas: 0,
      };
      map.set(r.municipio, {
        toneladas: +(prev.toneladas + r.toneladas).toFixed(2),
        familias: prev.familias + r.familiasBeneficiadas,
        jornadas: prev.jornadas + 1,
      });
    });

    return map;
  }, [records]);

  const maxTons = useMemo(() => {
    let max = 1;
    statsByMunicipio.forEach((v) => {
      if (v.toneladas > max) max = v.toneladas;
    });
    return max;
  }, [statsByMunicipio]);

  // Goal per municipality (~1/12th of regional target)
  const municipalGoal = Math.max(1, +(regionalGoalTons / 12).toFixed(1));

  const getFillColor = (munName: string, isSelected: boolean, isHovered: boolean) => {
    const data = statsByMunicipio.get(munName);
    const tons = data?.toneladas || 0;
    if (isSelected) return '#0f172a'; // Deep slate active highlight
    if (isHovered) return '#0891b2'; // Cyan hover
    if (tons <= 0) return '#f1f5f9';
    const ratio = tons / maxTons;
    if (ratio >= 0.75) return '#0284c7'; // High volume
    if (ratio >= 0.45) return '#06b6d4'; // Medium-high volume
    if (ratio >= 0.2) return '#38bdf8'; // Medium volume
    return '#bae6fd'; // Low volume
  };

  const activeMunName =
    hoveredMun || (selectedMunicipio !== 'Todos' ? selectedMunicipio : 'Barinas');
  const activeMunShape =
    BARINAS_MUNICIPIOS.find((m) => m.name === activeMunName) ||
    BARINAS_MUNICIPIOS[6];
  const activeStats = statsByMunicipio.get(activeMunShape.name) || {
    toneladas: 0,
    familias: 0,
    jornadas: 0,
  };

  const rankedList = useMemo(() => {
    return BARINAS_MUNICIPIOS.map((m) => {
      const st = statsByMunicipio.get(m.name) || {
        toneladas: 0,
        familias: 0,
        jornadas: 0,
      };
      const pctGoal = Math.min(100, Math.round((st.toneladas / municipalGoal) * 100));
      return {
        ...m,
        ...st,
        pctGoal,
      };
    }).sort((a, b) => b.toneladas - a.toneladas);
  }, [statsByMunicipio, municipalGoal]);

  return (
    <section
      id="seccion-mapa"
      aria-label="Mapa Territorial de Distribución en Barinas"
      className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-700" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Cobertura Territorial e Impacto por Municipio (Estado Barinas)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Haz clic sobre cualquier municipio en el mapa o en el semáforo lateral para filtrar todo el Dashboard
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive SVG Map of Barinas (7 cols) */}
        <div className="xl:col-span-7 bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
          <div className="relative w-full aspect-[12/6] min-h-[220px]">
            <svg
              viewBox="0 0 605 260"
              className="w-full h-full select-none"
              role="img"
              aria-label="Mapa interactivo de los 12 municipios del estado Barinas"
            >
              {/* Subtle hydrographic river lines (Río Apure & Río Santo Domingo) */}
              <path
                d="M 25,245 Q 210,210 378,228 T 590,198"
                fill="none"
                stroke="#7dd3fc"
                strokeWidth="2.5"
                strokeDasharray="5 4"
              />

              {BARINAS_MUNICIPIOS.map((mun) => {
                const isSelected = selectedMunicipio === mun.name;
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
                      onSelectMunicipio(
                        selectedMunicipio === mun.name ? 'Todos' : mun.name
                      )
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
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Municipio {activeMunShape.name}{' '}
                  <span className="font-normal text-slate-500">
                    (Cap. {activeMunShape.capital})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                  <span className="font-bold text-cyan-800">
                    {activeStats.toneladas.toFixed(2)} TM
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {activeStats.familias.toLocaleString('es-VE')} familias
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeStats.jornadas} jornadas</span>
                </div>
              </div>
            </div>

            {/* Choropleth Scale Legend */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span>Menor TM</span>
              <span className="w-3.5 h-2.5 rounded-xs bg-sky-200 inline-block" />
              <span className="w-3.5 h-2.5 rounded-xs bg-sky-400 inline-block" />
              <span className="w-3.5 h-2.5 rounded-xs bg-cyan-500 inline-block" />
              <span className="w-3.5 h-2.5 rounded-xs bg-sky-600 inline-block" />
              <span>Mayor TM</span>
            </div>
          </div>
        </div>

        {/* Right: Semáforo de Cumplimiento Municipal (5 cols) */}
        <div className="xl:col-span-5 flex flex-col justify-between bg-slate-50/50 rounded-xl border border-slate-200/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800">
              Semáforo de Meta Municipal ({municipalGoal} TM / mun.)
            </span>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              12 Municipios
            </span>
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {rankedList.map((item) => {
              const isSelected = selectedMunicipio === item.name;
              const status =
                item.pctGoal >= 80
                  ? {
                      label: 'Óptimo',
                      icon: CheckCircle2,
                      textClass: 'text-emerald-700',
                      barClass: 'bg-emerald-500',
                    }
                  : item.pctGoal >= 40
                  ? {
                      label: 'En Avance',
                      icon: Clock,
                      textClass: 'text-amber-700',
                      barClass: 'bg-amber-500',
                    }
                  : {
                      label: 'Prioritario',
                      icon: AlertTriangle,
                      textClass: 'text-rose-700',
                      barClass: 'bg-rose-500',
                    };
              const StatusIcon = status.icon;

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() =>
                    onSelectMunicipio(isSelected ? 'Todos' : item.name)
                  }
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-50/90 border-cyan-600'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="font-semibold text-slate-900 truncate">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">
                        {item.toneladas.toFixed(2)} TM
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-sans font-semibold ${status.textClass}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${status.barClass}`}
                      style={{ width: `${Math.max(4, item.pctGoal)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
