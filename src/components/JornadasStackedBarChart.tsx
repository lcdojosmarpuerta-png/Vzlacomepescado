import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Layers, FileSpreadsheet, Upload, RotateCcw } from 'lucide-react';
import { FilterState, FisheryRecord } from '../types/fishery';
import {
  cleanCellText,
  isBlankIndicatorValue,
  isValidFisheryRecord,
  normalizeMunicipioBarinas,
} from '../data/demoData';

export type StackedMode = 'auto' | 'mun_par' | 'mun_com' | 'par_com';

interface JornadasStackedBarChartProps {
  records: FisheryRecord[];
  filters: FilterState;
  onSelectMunicipio: (mun: string) => void;
  onSelectParroquia: (par: string) => void;
  onSelectComuna: (com: string) => void;
  onQuickUpload: () => void;
}

const STACK_COLORS = [
  '#0284c7', // sky-600
  '#06b6d4', // cyan-500
  '#0f172a', // slate-900
  '#0d9488', // teal-600
  '#eab308', // yellow-500
  '#2563eb', // blue-600
  '#f43f5e', // rose-500
  '#ea580c', // orange-600
  '#64748b', // slate-500 (Otras)
];

function extractComuna(r: FisheryRecord): string {
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
        if (!isBlankIndicatorValue(cleaned)) return cleaned;
      }
    }
  }
  return '';
}

function extractMunicipio(r: FisheryRecord): string {
  const cleaned = cleanCellText(r.municipio);
  if (isBlankIndicatorValue(cleaned)) return '';
  return normalizeMunicipioBarinas(cleaned);
}

function extractParroquia(r: FisheryRecord): string {
  const cleaned = cleanCellText(r.parroquia);
  if (isBlankIndicatorValue(cleaned)) return '';
  return cleaned;
}

function extractEspecie(r: FisheryRecord): string {
  const cleaned = cleanCellText(r.especie);
  if (isBlankIndicatorValue(cleaned)) return '';
  return cleaned;
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
}

const StackedTooltip: React.FC<CustomTooltipProps> = ({
  active,
  label,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const nonZero = payload
    .filter((entry) => Number(entry.value ?? 0) > 0)
    .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0));

  const total = nonZero.reduce(
    (sum, entry) => sum + Number(entry.value ?? 0),
    0
  );

  return (
    <div className="rounded-lg bg-slate-900 text-slate-50 px-3.5 py-2.5 shadow-xl border border-slate-700/80 text-xs max-w-xs">
      <div className="font-bold text-white pb-1.5 mb-1.5 border-b border-slate-700 flex items-center justify-between gap-4">
        <span className="truncate">{label}</span>
        <span className="font-mono tabular-nums text-cyan-300 shrink-0">
          {total} {total === 1 ? 'jornada' : 'jornadas'}
        </span>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {nonZero.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: item.color || '#0284c7' }}
              />
              <span className="truncate text-slate-200">{item.name}</span>
            </div>
            <span className="font-mono tabular-nums font-semibold text-white shrink-0">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const JornadasStackedBarChart: React.FC<
  JornadasStackedBarChartProps
> = ({
  records,
  filters,
  onSelectMunicipio,
  onSelectParroquia,
  onSelectComuna,
  onQuickUpload,
}) => {
  const [mode, setMode] = useState<StackedMode>('auto');
  const [showAllBars, setShowAllBars] = useState<boolean>(false);

  const validRecords = useMemo(
    () => records.filter(isValidFisheryRecord),
    [records]
  );

  // Determine active counts for Municipio, Parroquia, and Comuna (strictly non-blank)
  const territorialSummary = useMemo(() => {
    const munSet = new Set<string>();
    const parSet = new Set<string>();
    const comSet = new Set<string>();

    validRecords.forEach((r) => {
      const m = extractMunicipio(r);
      const p = extractParroquia(r);
      const c = extractComuna(r);
      if (m) munSet.add(m);
      if (p) parSet.add(p);
      if (c) comSet.add(c);
    });

    return {
      municipiosCount: munSet.size,
      parroquiasCount: parSet.size,
      comunasCount: comSet.size,
      totalJornadas: validRecords.length,
    };
  }, [validRecords]);

  // Resolve active X-axis & Stack-axis based on mode + applied filters
  const resolvedAxes = useMemo(() => {
    const hasParData = territorialSummary.parroquiasCount > 0;
    const hasComData = territorialSummary.comunasCount > 0;

    if (mode === 'mun_par') {
      return {
        xLevel: 'municipio' as const,
        stackLevel: 'parroquia' as const,
        xLabel: 'Municipio',
        stackLabel: 'Parroquia',
      };
    }
    if (mode === 'mun_com') {
      return {
        xLevel: 'municipio' as const,
        stackLevel: 'comuna' as const,
        xLabel: 'Municipio',
        stackLabel: 'Comuna',
      };
    }
    if (mode === 'par_com') {
      return {
        xLevel: 'parroquia' as const,
        stackLevel: 'comuna' as const,
        xLabel: 'Parroquia',
        stackLabel: 'Comuna',
      };
    }

    // Dynamic "auto" mode driven by active filters
    if (filters.municipio !== 'Todos' && filters.parroquia !== 'Todas') {
      if (hasComData) {
        return {
          xLevel: 'comuna' as const,
          stackLevel: 'especie' as const,
          xLabel: 'Comuna',
          stackLabel: 'Especie',
        };
      }
      return {
        xLevel: 'parroquia' as const,
        stackLevel: 'especie' as const,
        xLabel: 'Parroquia',
        stackLabel: 'Especie',
      };
    }

    if (filters.municipio !== 'Todos') {
      if (hasParData && hasComData) {
        return {
          xLevel: 'parroquia' as const,
          stackLevel: 'comuna' as const,
          xLabel: 'Parroquia',
          stackLabel: 'Comuna',
        };
      }
      if (hasParData) {
        return {
          xLevel: 'parroquia' as const,
          stackLevel: 'especie' as const,
          xLabel: 'Parroquia',
          stackLabel: 'Especie',
        };
      }
      if (hasComData) {
        return {
          xLevel: 'comuna' as const,
          stackLevel: 'especie' as const,
          xLabel: 'Comuna',
          stackLabel: 'Especie',
        };
      }
    }

    // Default state-wide view (Municipio -> Parroquia, falling back to Comuna or Especie if absent)
    if (hasParData) {
      return {
        xLevel: 'municipio' as const,
        stackLevel: 'parroquia' as const,
        xLabel: 'Municipio',
        stackLabel: 'Parroquia',
      };
    }
    if (hasComData) {
      return {
        xLevel: 'municipio' as const,
        stackLevel: 'comuna' as const,
        xLabel: 'Municipio',
        stackLabel: 'Comuna',
      };
    }
    return {
      xLevel: 'municipio' as const,
      stackLevel: 'especie' as const,
      xLabel: 'Municipio',
      stackLabel: 'Especie',
    };
  }, [
    mode,
    filters.municipio,
    filters.parroquia,
    territorialSummary.parroquiasCount,
    territorialSummary.comunasCount,
  ]);

  // Build stacked chart matrix strictly excluding blank values
  const stackedChart = useMemo(() => {
    const getDimValue = (
      r: FisheryRecord,
      dim: 'municipio' | 'parroquia' | 'comuna' | 'especie'
    ): string => {
      if (dim === 'municipio') return extractMunicipio(r);
      if (dim === 'parroquia') return extractParroquia(r);
      if (dim === 'comuna') return extractComuna(r);
      return extractEspecie(r);
    };

    const barMap = new Map<string, Map<string, number>>();
    const stackTotals = new Map<string, number>();
    let countedJornadas = 0;

    validRecords.forEach((r) => {
      const xVal = getDimValue(r, resolvedAxes.xLevel);
      const sVal = getDimValue(r, resolvedAxes.stackLevel);

      // Never sum blank/whitespace entries into territorial indicators
      if (!xVal || !sVal) return;

      countedJornadas += 1;
      let inner = barMap.get(xVal);
      if (!inner) {
        inner = new Map<string, number>();
        barMap.set(xVal, inner);
      }
      inner.set(sVal, (inner.get(sVal) || 0) + 1);
      stackTotals.set(sVal, (stackTotals.get(sVal) || 0) + 1);
    });

    // Rank stack keys by total jornadas; cap to top 8 + "Otras" when > 9 so chart & legend stay legible
    const sortedStacks = Array.from(stackTotals.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const MAX_STACK_SERIES = 8;
    const useOtherBucket = sortedStacks.length > MAX_STACK_SERIES + 1;
    const primaryKeys = useOtherBucket
      ? sortedStacks.slice(0, MAX_STACK_SERIES).map(([k]) => k)
      : sortedStacks.map(([k]) => k);
    const otherBucketCount = useOtherBucket
      ? sortedStacks.length - MAX_STACK_SERIES
      : 0;
    const otherKeyName = `Otras ${resolvedAxes.stackLabel.toLowerCase()}s (${otherBucketCount})`;

    const seriesKeys = useOtherBucket
      ? [...primaryKeys, otherKeyName]
      : primaryKeys;

    const primarySet = new Set(primaryKeys);

    const rows = Array.from(barMap.entries())
      .map(([name, innerMap]) => {
        const rowObj: Record<string, string | number> = { name };
        let total = 0;

        primaryKeys.forEach((k) => {
          rowObj[k] = 0;
        });
        if (useOtherBucket) {
          rowObj[otherKeyName] = 0;
        }

        innerMap.forEach((count, stackKey) => {
          total += count;
          if (!useOtherBucket || primarySet.has(stackKey)) {
            rowObj[stackKey] = Number(rowObj[stackKey] || 0) + count;
          } else {
            rowObj[otherKeyName] = Number(rowObj[otherKeyName] || 0) + count;
          }
        });

        rowObj.__total = total;
        return rowObj;
      })
      .sort((a, b) => Number(b.__total) - Number(a.__total));

    const displayedRows = showAllBars ? rows : rows.slice(0, 14);

    return {
      rows,
      displayedRows,
      seriesKeys,
      countedJornadas,
    };
  }, [validRecords, resolvedAxes, showAllBars]);

  const handleBarSelect = (name: string) => {
    if (!name) return;
    if (resolvedAxes.xLevel === 'municipio') {
      onSelectMunicipio(
        normalizeMunicipioBarinas(filters.municipio) === name ? 'Todos' : name
      );
    } else if (resolvedAxes.xLevel === 'parroquia') {
      onSelectParroquia(filters.parroquia === name ? 'Todas' : name);
    } else if (resolvedAxes.xLevel === 'comuna') {
      onSelectComuna(filters.comuna === name ? 'Todas' : name);
    }
  };

  const hasActiveTerritorialFilter =
    filters.municipio !== 'Todos' ||
    filters.parroquia !== 'Todas' ||
    filters.comuna !== 'Todas';

  return (
    <section
      id="seccion-jornadas-apiladas"
      aria-label="Gráfico de Barras Apiladas de Jornadas por Municipio, Parroquia y Comuna"
      className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs"
    >
      {/* Header & Dynamic Breakdown Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-700" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Desglose Apilado de Jornadas: {resolvedAxes.xLabel} ×{' '}
              {resolvedAxes.stackLabel}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {validRecords.length === 0
              ? 'Carga un archivo Excel para visualizar las barras apiladas por Municipio, Parroquia y Comuna'
              : `${stackedChart.countedJornadas} jornadas válidas desglosadas por ${resolvedAxes.xLabel.toLowerCase()} y apiladas por ${resolvedAxes.stackLabel.toLowerCase()} (sin espacios en blanco)`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasActiveTerritorialFilter && (
            <button
              type="button"
              onClick={() => {
                onSelectMunicipio('Todos');
                onSelectParroquia('Todas');
                onSelectComuna('Todas');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer territorio</span>
            </button>
          )}

          <div
            role="tablist"
            aria-label="Desglose de barras apiladas"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'auto'}
              onClick={() => {
                setMode('auto');
                setShowAllBars(false);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'auto'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dinámico (Filtros)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'mun_par'}
              onClick={() => {
                setMode('mun_par');
                setShowAllBars(false);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'mun_par'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mun. × Parroquia
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'mun_com'}
              onClick={() => {
                setMode('mun_com');
                setShowAllBars(false);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'mun_com'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mun. × Comuna
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'par_com'}
              onClick={() => {
                setMode('par_com');
                setShowAllBars(false);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'par_com'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Parroquia × Comuna
            </button>
          </div>

          {stackedChart.rows.length > 14 && (
            <button
              type="button"
              onClick={() => setShowAllBars((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              {showAllBars
                ? 'Ver Top 14'
                : `Ver todos (${stackedChart.rows.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Exact Non-Blank Territorial Counters Strip */}
      {validRecords.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">
              Jornadas Válidas
            </div>
            <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900">
              {territorialSummary.totalJornadas}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">
              Municipios Activos
            </div>
            <div className="text-lg font-extrabold font-mono tabular-nums text-cyan-800">
              {territorialSummary.municipiosCount}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">
              Parroquias Activas
            </div>
            <div className="text-lg font-extrabold font-mono tabular-nums text-sky-700">
              {territorialSummary.parroquiasCount}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">
              Comunas Activas
            </div>
            <div className="text-lg font-extrabold font-mono tabular-nums text-teal-700">
              {territorialSummary.comunasCount}
            </div>
          </div>
        </div>
      )}

      {/* Chart Area */}
      {validRecords.length === 0 ? (
        <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Gráfico apilado en cero (0) — Sin datos cargados
          </p>
          <p className="text-xs text-slate-500 mb-4 max-w-md">
            Adjunta tu archivo Excel (.xlsx / .xls) para generar el gráfico de barras apiladas por Municipio, Parroquia y Comuna.
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
      ) : stackedChart.displayedRows.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Sin valores válidos para {resolvedAxes.xLabel} ×{' '}
            {resolvedAxes.stackLabel}
          </p>
          <p className="text-xs text-slate-500 max-w-md">
            Las celdas vacías o espacios en blanco no se contabilizan. Cambia la vista arriba o verifica que el archivo Excel incluya columnas de {resolvedAxes.xLabel} y {resolvedAxes.stackLabel}.
          </p>
        </div>
      ) : (
        <div className="h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedChart.displayedRows}
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
                height={58}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#475569' }}
              />
              <Tooltip content={<StackedTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              {stackedChart.seriesKeys.map((seriesKey, idx) => (
                <Bar
                  key={seriesKey}
                  dataKey={seriesKey}
                  stackId="jornadas"
                  name={seriesKey}
                  fill={STACK_COLORS[idx % STACK_COLORS.length]}
                  radius={
                    idx === stackedChart.seriesKeys.length - 1
                      ? [5, 5, 0, 0]
                      : [0, 0, 0, 0]
                  }
                  maxBarSize={54}
                  className="cursor-pointer"
                  onClick={(data) => {
                    if (data && data.name) {
                      handleBarSelect(String(data.name));
                    }
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
