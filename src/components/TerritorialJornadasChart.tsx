import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MapPinned, FileSpreadsheet, Upload, RotateCcw } from 'lucide-react';
import { FisheryRecord } from '../types/fishery';
import {
  cleanCellText,
  isBlankIndicatorValue,
  isValidFisheryRecord,
  normalizeMunicipioBarinas,
} from '../data/demoData';

export type TerritorialLevel = 'municipio' | 'parroquia' | 'comuna';

interface TerritorialJornadasChartProps {
  records: FisheryRecord[];
  selectedMunicipio: string;
  selectedParroquia: string;
  selectedComuna: string;
  onSelectMunicipio: (mun: string) => void;
  onSelectParroquia: (par: string) => void;
  onSelectComuna: (com: string) => void;
  onQuickUpload: () => void;
}

const TERRITORIAL_COLORS = [
  '#0284c7',
  '#0891b2',
  '#0d9488',
  '#2563eb',
  '#0369a1',
  '#06b6d4',
];

function resolveComunaLabel(r: FisheryRecord): string {
  const direct = cleanCellText(r.comuna);
  if (!isBlankIndicatorValue(direct)) return direct;
  if (r.rawFields) {
    for (const [key, val] of Object.entries(r.rawFields)) {
      const k = key.toLowerCase();
      if (
        k.includes('comuna') ||
        k.includes('circuito') ||
        k.includes('consejo') ||
        k.includes('comunidad') ||
        k.includes('sector')
      ) {
        const cleaned = cleanCellText(val);
        if (!isBlankIndicatorValue(cleaned)) {
          return cleaned;
        }
      }
    }
  }
  return '';
}

export const TerritorialJornadasChart: React.FC<
  TerritorialJornadasChartProps
> = ({
  records,
  selectedMunicipio,
  selectedParroquia,
  selectedComuna,
  onSelectMunicipio,
  onSelectParroquia,
  onSelectComuna,
  onQuickUpload,
}) => {
  const [level, setLevel] = useState<TerritorialLevel>('municipio');
  const [showAll, setShowAll] = useState<boolean>(false);

  const chartStats = useMemo(() => {
    const validRecords = records.filter(isValidFisheryRecord);
    const map = new Map<
      string,
      {
        name: string;
        jornadas: number;
        kilogramos: number;
        toneladas: number;
        familias: number;
        municipios: Set<string>;
      }
    >();

    let countedJornadas = 0;

    validRecords.forEach((r) => {
      let label = '';
      if (level === 'municipio') {
        const mun = cleanCellText(r.municipio);
        label = !isBlankIndicatorValue(mun) ? normalizeMunicipioBarinas(mun) : '';
      } else if (level === 'parroquia') {
        const par = cleanCellText(r.parroquia);
        label = !isBlankIndicatorValue(par) ? par : '';
      } else {
        label = resolveComunaLabel(r);
      }

      // Strictly skip blank / whitespace / placeholder entries from territorial counts
      if (!label) return;

      countedJornadas += 1;

      const current = map.get(label) || {
        name: label,
        jornadas: 0,
        kilogramos: 0,
        toneladas: 0,
        familias: 0,
        municipios: new Set<string>(),
      };

      current.jornadas += 1;
      current.kilogramos += r.kilogramos ?? r.toneladas * 1000;
      current.toneladas += r.toneladas;
      current.familias += r.familiasBeneficiadas;
      const munClean = cleanCellText(r.municipio);
      if (!isBlankIndicatorValue(munClean)) {
        current.municipios.add(normalizeMunicipioBarinas(munClean));
      }

      map.set(label, current);
    });

    const allRows = Array.from(map.values())
      .map((item) => ({
        name: item.name,
        jornadas: item.jornadas,
        kilogramos: +item.kilogramos.toFixed(2),
        toneladas: +item.toneladas.toFixed(3),
        familias: item.familias,
        parentMunicipio: Array.from(item.municipios).join(', '),
      }))
      .sort((a, b) => b.jornadas - a.jornadas || b.kilogramos - a.kilogramos);

    const displayedRows = showAll ? allRows : allRows.slice(0, 15);

    return {
      totalTerritories: allRows.length,
      totalJornadas: countedJornadas,
      allRows,
      displayedRows,
    };
  }, [records, level, showAll]);

  const activeSelection =
    level === 'municipio'
      ? selectedMunicipio !== 'Todos'
        ? normalizeMunicipioBarinas(selectedMunicipio)
        : null
      : level === 'parroquia'
      ? selectedParroquia !== 'Todas'
        ? selectedParroquia
        : null
      : selectedComuna !== 'Todas'
      ? selectedComuna
      : null;

  const handleBarClick = (entryName: string) => {
    if (
      entryName === 'Sin Municipio' ||
      entryName === 'Sin Parroquia' ||
      entryName === 'Sin Comuna'
    ) {
      return;
    }
    if (level === 'municipio') {
      onSelectMunicipio(
        normalizeMunicipioBarinas(selectedMunicipio) === entryName
          ? 'Todos'
          : entryName
      );
    } else if (level === 'parroquia') {
      onSelectParroquia(selectedParroquia === entryName ? 'Todas' : entryName);
    } else {
      onSelectComuna(selectedComuna === entryName ? 'Todas' : entryName);
    }
  };

  const handleClearLevelFilter = () => {
    if (level === 'municipio') onSelectMunicipio('Todos');
    else if (level === 'parroquia') onSelectParroquia('Todas');
    else onSelectComuna('Todas');
  };

  const levelLabel =
    level === 'municipio'
      ? 'Municipios'
      : level === 'parroquia'
      ? 'Parroquias'
      : 'Comunas / Sectores';

  return (
    <section
      id="seccion-jornadas-territoriales"
      aria-label="Gráfico Dinámico de Jornadas por Municipio, Parroquia y Comuna"
      className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-cyan-700" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Jornadas por Municipio, Parroquia y Comuna
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {records.length === 0
              ? 'Carga un archivo Excel para analizar la distribución de jornadas por territorio'
              : `Mostrando ${chartStats.totalJornadas} jornadas distribuidas en ${chartStats.totalTerritories} ${levelLabel.toLowerCase()} · Haz clic en una barra para filtrar`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeSelection && (
            <button
              type="button"
              onClick={handleClearLevelFilter}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Quitar filtro: {activeSelection}</span>
            </button>
          )}

          <div
            role="tablist"
            aria-label="Nivel territorial"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={level === 'municipio'}
              onClick={() => {
                setLevel('municipio');
                setShowAll(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                level === 'municipio'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Municipios
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={level === 'parroquia'}
              onClick={() => {
                setLevel('parroquia');
                setShowAll(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                level === 'parroquia'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Parroquias
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={level === 'comuna'}
              onClick={() => {
                setLevel('comuna');
                setShowAll(false);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                level === 'comuna'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comunas
            </button>
          </div>

          {chartStats.allRows.length > 15 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              {showAll
                ? 'Ver Top 15'
                : `Ver todos (${chartStats.allRows.length})`}
            </button>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Gráfico en cero (0) — Sin jornadas registradas
          </p>
          <p className="text-xs text-slate-500 mb-4 max-w-md">
            Adjunta tu archivo Excel (.xlsx / .xls) para visualizar dinámicamente las jornadas por Municipio, Parroquia y Comuna.
          </p>
          <button
            type="button"
            onClick={onQuickUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Adjuntar archivo Excel</span>
          </button>
        </div>
      ) : chartStats.displayedRows.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-1">
            No se detectaron datos en la columna de {levelLabel}
          </p>
          <p className="text-xs text-slate-500 max-w-md">
            El archivo Excel actual no contiene valores para {levelLabel.toLowerCase()} con los filtros aplicados. Prueba cambiando de nivel territorial o ajustando los filtros.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartStats.displayedRows}
                margin={{ top: 10, right: 16, left: 0, bottom: 28 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <Tooltip
                  formatter={(
                    value: unknown,
                    _name: unknown,
                    item: { payload?: { kilogramos?: number; toneladas?: number; parentMunicipio?: string; familias?: number } }
                  ) => {
                    const count = Number(value ?? 0);
                    const p = item?.payload;
                    const details = p
                      ? `${count} ${count === 1 ? 'jornada' : 'jornadas'} · ${(p.kilogramos ?? 0).toLocaleString('es-VE', { maximumFractionDigits: 1 })} Kg (${(p.toneladas ?? 0).toFixed(2)} TM)`
                      : `${count} jornadas`;
                    return [details, levelLabel];
                  }}
                  labelFormatter={(label: unknown) => {
                    const row = chartStats.displayedRows.find(
                      (r) => r.name === String(label)
                    );
                    if (level !== 'municipio' && row?.parentMunicipio) {
                      return `${String(label)} (Mun. ${row.parentMunicipio})`;
                    }
                    return String(label);
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="jornadas"
                  name="Cantidad de Jornadas"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={54}
                  className="cursor-pointer"
                  onClick={(data) => {
                    if (data && data.name) {
                      handleBarClick(String(data.name));
                    }
                  }}
                >
                  {chartStats.displayedRows.map((entry, idx) => {
                    const isSelected = activeSelection === entry.name;
                    const fill = isSelected
                      ? '#0f172a'
                      : TERRITORIAL_COLORS[idx % TERRITORIAL_COLORS.length];
                    return <Cell key={`cell-${entry.name}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick clickable territorial summary strip */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {chartStats.displayedRows.slice(0, 8).map((item) => {
              const isSelected = activeSelection === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleBarClick(item.name)}
                  className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-50 border-cyan-600'
                      : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                    <span className="font-bold text-cyan-800">
                      {item.jornadas} {item.jornadas === 1 ? 'jorn.' : 'jorn.'}
                    </span>
                    <span className="text-slate-500">
                      {item.kilogramos.toLocaleString('es-VE', {
                        maximumFractionDigits: 0,
                      })}{' '}
                      Kg
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
