import React, { useMemo, useState } from 'react';
import { Fish, Search, RotateCcw, ArrowUpDown } from 'lucide-react';
import { FisheryRecord } from '../types/fishery';
import { normalizeMunicipioBarinas, normalizeSearchText } from '../data/demoData';

interface SpeciesDynamicIndicatorProps {
  records: FisheryRecord[];
  selectedSpecies: string;
  onSelectSpecies: (species: string) => void;
}

type SpeciesSortBy = 'volumen' | 'jornadas' | 'nombre';

export const SpeciesDynamicIndicator: React.FC<
  SpeciesDynamicIndicatorProps
> = ({ records, selectedSpecies, onSelectSpecies }) => {
  const [speciesQuery, setSpeciesQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SpeciesSortBy>('volumen');

  const speciesStats = useMemo(() => {
    const map = new Map<
      string,
      {
        especie: string;
        kilogramos: number;
        toneladas: number;
        jornadas: number;
        familias: number;
        municipios: Set<string>;
      }
    >();

    let totalKgAll = 0;

    records.forEach((r) => {
      const esp = r.especie.trim() || 'Sin Especificar';
      const kg = r.kilogramos ?? r.toneladas * 1000;
      totalKgAll += kg;

      const cur = map.get(esp) || {
        especie: esp,
        kilogramos: 0,
        toneladas: 0,
        jornadas: 0,
        familias: 0,
        municipios: new Set<string>(),
      };

      cur.kilogramos += kg;
      cur.toneladas += r.toneladas;
      cur.jornadas += 1;
      cur.familias += r.familiasBeneficiadas;
      if (r.municipio && r.municipio !== 'No especificado') {
        cur.municipios.add(normalizeMunicipioBarinas(r.municipio));
      }

      map.set(esp, cur);
    });

    const list = Array.from(map.values()).map((item) => ({
      ...item,
      municipiosCount: item.municipios.size,
      sharePct: totalKgAll > 0 ? (item.kilogramos / totalKgAll) * 100 : 0,
    }));

    list.sort((a, b) => {
      if (sortBy === 'jornadas') {
        return b.jornadas - a.jornadas || b.kilogramos - a.kilogramos;
      }
      if (sortBy === 'nombre') {
        return a.especie.localeCompare(b.especie);
      }
      return b.kilogramos - a.kilogramos || b.jornadas - a.jornadas;
    });

    const namedCount = list.filter(
      (s) => s.especie !== 'Sin Especificar' && s.especie !== 'No especificado'
    ).length;

    return {
      list,
      totalKgAll,
      namedCount,
      topSpecies: list[0] || null,
    };
  }, [records, sortBy]);

  const visibleSpecies = useMemo(() => {
    const q = normalizeSearchText(speciesQuery);
    if (!q) return speciesStats.list;
    return speciesStats.list.filter((item) =>
      normalizeSearchText(item.especie).includes(q)
    );
  }, [speciesStats.list, speciesQuery]);

  const activeSpeciesObj = useMemo(() => {
    if (selectedSpecies === 'Todas') return null;
    return (
      speciesStats.list.find((s) => s.especie === selectedSpecies) || null
    );
  }, [speciesStats.list, selectedSpecies]);

  const maxKg = useMemo(() => {
    return speciesStats.list.reduce(
      (max, item) => (item.kilogramos > max ? item.kilogramos : max),
      0
    );
  }, [speciesStats.list]);

  return (
    <section
      id="seccion-indicador-especies"
      aria-label="Indicador Dinámico de Especies"
      className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Fish className="w-4 h-4 text-cyan-700" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Indicador Dinámico por Especie Hidrobiológica
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {records.length === 0
              ? 'Carga un archivo Excel para explorar las métricas individuales de cada especie'
              : `${speciesStats.namedCount} ${
                  speciesStats.namedCount === 1
                    ? 'especie registrada'
                    : 'especies registradas'
                } · Selecciona una especie para filtrar todo el panel`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedSpecies !== 'Todas' && (
            <button
              type="button"
              onClick={() => onSelectSpecies('Todas')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Ver todas ({speciesStats.list.length})</span>
            </button>
          )}

          {/* Quick filter input inside indicator */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={speciesQuery}
              onChange={(e) => setSpeciesQuery(e.target.value)}
              placeholder="Filtrar especie..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none w-44 sm:w-48"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              aria-label="Ordenar especies"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SpeciesSortBy)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="volumen">Mayor Volumen (Kg)</option>
              <option value="jornadas">Más Jornadas</option>
              <option value="nombre">Alfabético (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="py-10 px-4 text-center rounded-lg bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
          Indicador en cero (0) — Adjunta tu reporte Excel para activar el desglose dinámico por especie.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Dynamic Spotlight Card for Selected or Top Species */}
          {(activeSpeciesObj || speciesStats.topSpecies) && (
            <div className="rounded-xl bg-slate-900 text-white p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-cyan-300">
                  {activeSpeciesObj
                    ? 'Especie Seleccionada (Filtro Activo)'
                    : 'Especie Líder en Distribución'}
                </div>
                <div className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                  {(activeSpeciesObj || speciesStats.topSpecies)!.especie}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 font-mono tabular-nums">
                <div>
                  <div className="text-[11px] font-sans text-slate-400">
                    Volumen (Kg)
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white">
                    {(
                      activeSpeciesObj || speciesStats.topSpecies
                    )!.kilogramos.toLocaleString('es-VE', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    Kg
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-slate-400">
                    Toneladas
                  </div>
                  <div className="text-sm sm:text-base font-bold text-cyan-300">
                    {(
                      activeSpeciesObj || speciesStats.topSpecies
                    )!.toneladas.toFixed(2)}{' '}
                    TM
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-slate-400">
                    Jornadas
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white">
                    {(activeSpeciesObj || speciesStats.topSpecies)!.jornadas}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-slate-400">
                    Cobertura
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white">
                    {
                      (activeSpeciesObj || speciesStats.topSpecies)!
                        .municipiosCount
                    }{' '}
                    Mun. (
                    {(
                      activeSpeciesObj || speciesStats.topSpecies
                    )!.sharePct.toFixed(1)}
                    %)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Species Grid */}
          {visibleSpecies.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
              No hay especies que coincidan con &ldquo;{speciesQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1">
              {visibleSpecies.map((item) => {
                const isSelected = selectedSpecies === item.especie;
                const barWidth =
                  maxKg > 0 ? Math.max(4, (item.kilogramos / maxKg) * 100) : 0;

                return (
                  <button
                    key={item.especie}
                    type="button"
                    onClick={() =>
                      onSelectSpecies(isSelected ? 'Todas' : item.especie)
                    }
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-50/90 border-cyan-600 shadow-xs'
                        : 'bg-slate-50/60 border-slate-200 hover:border-cyan-400 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span
                        className="text-xs font-bold text-slate-900 truncate"
                        title={item.especie}
                      >
                        {item.especie}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums font-bold text-cyan-800 shrink-0">
                        {item.sharePct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSelected ? 'bg-slate-900' : 'bg-cyan-600'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {item.kilogramos.toLocaleString('es-VE', {
                          maximumFractionDigits: 1,
                        })}{' '}
                        Kg ({item.toneladas.toFixed(2)} TM)
                      </span>
                      <span>
                        {item.jornadas}{' '}
                        {item.jornadas === 1 ? 'jorn.' : 'jorn.'} ·{' '}
                        {item.municipiosCount} Mun.
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
