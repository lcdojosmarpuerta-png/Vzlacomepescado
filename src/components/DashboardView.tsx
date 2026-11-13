import React, { useMemo, useState, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  Scale,
  Fish,
  MapPin,
  FolderCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Upload,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Target,
  Users,
  Home,
  FileSpreadsheet,
  X,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  FilterState,
  FisheryRecord,
  UploadedFileMeta,
} from '../types/fishery';
import { DashboardBanner } from './DashboardBanner';
import { ControlSidebar, FilterOptionCount } from './ControlSidebar';
import { BarinasMap } from './BarinasMap';
import { TerritorialJornadasChart } from './TerritorialJornadasChart';
import { JornadasStackedBarChart } from './JornadasStackedBarChart';
import { SpeciesDynamicIndicator } from './SpeciesDynamicIndicator';
import { RecordModal } from './RecordModal';
import { ExecutiveReportModal } from './ExecutiveReportModal';
import {
  cleanCellText,
  downloadSampleExcelTemplate,
  exportRecordsToExcel,
  isBlankIndicatorValue,
  isValidFisheryRecord,
  normalizeMunicipioBarinas,
  normalizeSearchText,
} from '../data/demoData';

interface DashboardViewProps {
  onBackToHero: () => void;
  records: FisheryRecord[];
  uploadedFiles: UploadedFileMeta[];
  onUploadFiles: (files: FileList) => Promise<void>;
  onRemoveSingleFile: (fileName: string) => void;
  onClearAllHistory: () => void;
  onSaveManualRecord: (
    data: Omit<FisheryRecord, 'id' | 'archivoOrigen' | 'kilogramos'>,
    existingId?: string
  ) => void;
  onDeleteRecord: (id: string) => void;
  regionalGoalTons: number;
  onUpdateRegionalGoal: (goal: number) => void;
  filters: FilterState;
  onUpdateFilters: (next: Partial<FilterState>) => void;
  onResetFilters: () => void;
  isUploading: boolean;
  uploadFeedback: { type: 'success' | 'error' | 'warning'; message: string } | null;
}

type SortField =
  | 'fecha'
  | 'especie'
  | 'municipio'
  | 'tipoPesca'
  | 'toneladas'
  | 'familiasBeneficiadas';

function getComunaText(rec: FisheryRecord): string {
  if (rec.comuna && rec.comuna !== '-') return rec.comuna.trim();
  if (rec.rawFields) {
    for (const [key, val] of Object.entries(rec.rawFields)) {
      const k = key.toLowerCase();
      if (
        (k.includes('comuna') ||
          k.includes('circuito') ||
          k.includes('consejo') ||
          k.includes('comunidad') ||
          k.includes('sector')) &&
        val &&
        val.trim() !== '' &&
        val.trim() !== '-'
      ) {
        return val.trim();
      }
    }
  }
  return '-';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onBackToHero,
  records,
  uploadedFiles,
  onUploadFiles,
  onRemoveSingleFile,
  onClearAllHistory,
  onSaveManualRecord,
  onDeleteRecord,
  regionalGoalTons,
  onUpdateRegionalGoal,
  filters,
  onUpdateFilters,
  onResetFilters,
  isUploading,
  uploadFeedback,
}) => {
  const [sortField, setSortField] = useState<SortField>('fecha');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [tableViewMode, setTableViewMode] = useState<'excel' | 'estandar'>(
    'excel'
  );

  // Modals state
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<FisheryRecord | null>(
    null
  );
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>(String(regionalGoalTons));

  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  // Strictly ignore completely blank/whitespace-only records
  const validRecords = useMemo(
    () => records.filter(isValidFisheryRecord),
    [records]
  );

  // Extract all exact column names from uploaded Excel files
  const allExcelColumnNames = useMemo(() => {
    const colSet = new Set<string>();
    uploadedFiles.forEach((f) => {
      f.columns?.forEach((c) => colSet.add(c));
    });
    validRecords.forEach((r) => {
      if (r.rawFields) {
        Object.keys(r.rawFields).forEach((k) => colSet.add(k));
      }
    });
    return Array.from(colSet);
  }, [uploadedFiles, validRecords]);

  // Cascading filter options with counts (strictly excluding blank/whitespace values)
  const availableMunicipios: FilterOptionCount[] = useMemo(() => {
    const counts = new Map<string, number>();
    validRecords.forEach((r) => {
      const mun = cleanCellText(r.municipio);
      if (!isBlankIndicatorValue(mun)) {
        const norm = normalizeMunicipioBarinas(mun);
        counts.set(norm, (counts.get(norm) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [validRecords]);

  const recordsScopedByMun = useMemo(() => {
    if (filters.municipio === 'Todos') return validRecords;
    const targetMun = normalizeMunicipioBarinas(filters.municipio);
    return validRecords.filter(
      (r) => normalizeMunicipioBarinas(cleanCellText(r.municipio)) === targetMun
    );
  }, [validRecords, filters.municipio]);

  const availableParroquias: FilterOptionCount[] = useMemo(() => {
    const counts = new Map<string, number>();
    recordsScopedByMun.forEach((r) => {
      const par = cleanCellText(r.parroquia);
      if (!isBlankIndicatorValue(par)) {
        counts.set(par, (counts.get(par) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [recordsScopedByMun]);

  const recordsScopedByPar = useMemo(() => {
    if (filters.parroquia === 'Todas') return recordsScopedByMun;
    return recordsScopedByMun.filter(
      (r) => cleanCellText(r.parroquia) === filters.parroquia
    );
  }, [recordsScopedByMun, filters.parroquia]);

  const availableComunas: FilterOptionCount[] = useMemo(() => {
    const counts = new Map<string, number>();
    recordsScopedByPar.forEach((r) => {
      const com = cleanCellText(getComunaText(r));
      if (!isBlankIndicatorValue(com)) {
        counts.set(com, (counts.get(com) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [recordsScopedByPar]);

  const availableSpecies: FilterOptionCount[] = useMemo(() => {
    const counts = new Map<string, number>();
    recordsScopedByPar.forEach((r) => {
      const esp = cleanCellText(r.especie);
      if (!isBlankIndicatorValue(esp)) {
        counts.set(esp, (counts.get(esp) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [recordsScopedByPar]);

  const availableTiposPesca = useMemo(() => {
    return Array.from(
      new Set(
        validRecords
          .map((r) => cleanCellText(r.tipoPesca))
          .filter((t) => !isBlankIndicatorValue(t))
      )
    ).sort();
  }, [validRecords]);

  const dynamicExcelColumns = useMemo(() => {
    return allExcelColumnNames
      .map((column) => {
        const valSet = new Set<string>();
        validRecords.forEach((r) => {
          const val = cleanCellText(r.rawFields?.[column]);
          if (!isBlankIndicatorValue(val)) {
            valSet.add(val);
          }
        });
        const options = Array.from(valSet).sort();
        return { column, options };
      })
      .filter((item) => item.options.length > 0 && item.options.length <= 200);
  }, [allExcelColumnNames, validRecords]);

  // Apply dynamic filters + accent-insensitive multi-term search
  const filteredRecords = useMemo(() => {
    const selectedMunNorm =
      filters.municipio !== 'Todos'
        ? normalizeMunicipioBarinas(filters.municipio)
        : 'Todos';
    const normPar =
      filters.parroquia !== 'Todas'
        ? normalizeSearchText(filters.parroquia)
        : null;
    const normCom =
      filters.comuna !== 'Todas' ? normalizeSearchText(filters.comuna) : null;

    const searchTokens = normalizeSearchText(filters.search)
      .split(/\s+/)
      .filter(Boolean);

    return validRecords.filter((rec) => {
      if (
        filters.especie !== 'Todas' &&
        cleanCellText(rec.especie) !== filters.especie
      ) {
        return false;
      }
      if (
        selectedMunNorm !== 'Todos' &&
        normalizeMunicipioBarinas(cleanCellText(rec.municipio)) !== selectedMunNorm
      ) {
        return false;
      }
      if (normPar && normalizeSearchText(rec.parroquia || '') !== normPar) {
        return false;
      }
      if (normCom && normalizeSearchText(getComunaText(rec)) !== normCom) {
        return false;
      }
      if (
        filters.archivoOrigen !== 'Todos' &&
        rec.archivoOrigen !== filters.archivoOrigen
      ) {
        return false;
      }
      if (
        filters.tipoPesca.length > 0 &&
        !filters.tipoPesca.includes(rec.tipoPesca)
      ) {
        return false;
      }
      if (
        filters.fechaInicio &&
        (!rec.fecha || rec.fecha < filters.fechaInicio)
      ) {
        return false;
      }
      if (filters.fechaFin && (!rec.fecha || rec.fecha > filters.fechaFin)) {
        return false;
      }

      // Check dynamic custom Excel field filters
      for (const [colName, selectedVal] of Object.entries(
        filters.customFields
      )) {
        if (selectedVal && selectedVal !== 'Todos') {
          const recordVal = cleanCellText(rec.rawFields?.[colName]);
          if (recordVal !== selectedVal) {
            return false;
          }
        }
      }

      // Accent-insensitive multi-term search scoped to selected column or all fields
      if (searchTokens.length > 0) {
        let haystack = '';
        const sc = filters.searchColumn;
        if (sc === '__especie') {
          haystack = rec.especie;
        } else if (sc === '__municipio') {
          haystack = rec.municipio;
        } else if (sc === '__parroquia') {
          haystack = rec.parroquia;
        } else if (sc === '__comuna') {
          haystack = getComunaText(rec);
        } else if (sc === '__punto') {
          haystack = rec.puntoDistribucion;
        } else if (sc && sc !== 'Todos') {
          haystack = rec.rawFields?.[sc] ?? '';
        } else {
          const rawText = rec.rawFields
            ? Object.values(rec.rawFields).join(' ')
            : '';
          haystack = [
            rec.especie,
            rec.municipio,
            rec.parroquia,
            getComunaText(rec),
            rec.tipoPesca,
            rec.puntoDistribucion,
            rec.archivoOrigen,
            rec.fecha,
            rawText,
          ].join(' ');
        }

        const normHaystack = normalizeSearchText(haystack);
        for (const tok of searchTokens) {
          if (!normHaystack.includes(tok)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [validRecords, filters]);

  const hasDateData = useMemo(
    () => validRecords.some((r) => Boolean(r.fecha && r.fecha.trim())),
    [validRecords]
  );

  // Compute exact KPI Metrics (0 when no Excel uploaded, never summing blank entries)
  const kpiMetrics = useMemo(() => {
    const totalToneladas = filteredRecords.reduce(
      (acc, r) => acc + r.toneladas,
      0
    );
    const totalKilogramos = filteredRecords.reduce(
      (acc, r) => acc + (r.kilogramos ?? r.toneladas * 1000),
      0
    );

    const speciesTotals = new Map<string, number>();
    const validMunicipios = new Set<string>();

    filteredRecords.forEach((r) => {
      const esp = cleanCellText(r.especie);
      if (!isBlankIndicatorValue(esp)) {
        speciesTotals.set(esp, (speciesTotals.get(esp) || 0) + r.toneladas);
      }
      const mun = cleanCellText(r.municipio);
      if (!isBlankIndicatorValue(mun)) {
        validMunicipios.add(normalizeMunicipioBarinas(mun));
      }
    });

    const topSpeciesEntry = Array.from(speciesTotals.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const totalFamilias = filteredRecords.reduce(
      (acc, r) => acc + r.familiasBeneficiadas,
      0
    );
    const avgKgPerFamily =
      totalFamilias > 0 ? +(totalKilogramos / totalFamilias).toFixed(2) : null;
    const goalPct =
      regionalGoalTons > 0 && totalToneladas > 0
        ? Math.min(100, +((totalToneladas / regionalGoalTons) * 100).toFixed(1))
        : 0;

    return {
      totalToneladas,
      totalKilogramos,
      uniqueSpecies: speciesTotals.size,
      topSpeciesName: topSpeciesEntry?.[0] || null,
      uniqueMunicipios: validMunicipios.size,
      totalJornadas: filteredRecords.length,
      totalFamilias,
      avgKgPerFamily,
      goalPct,
    };
  }, [filteredRecords, regionalGoalTons]);

  // Active filter chips for visual clarity & 1-click removal
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filters.search.trim()) {
      chips.push({
        key: 'search',
        label: `Búsqueda: "${filters.search.trim()}"`,
        onClear: () => onUpdateFilters({ search: '' }),
      });
    }
    if (filters.municipio !== 'Todos') {
      chips.push({
        key: 'municipio',
        label: `Municipio: ${filters.municipio}`,
        onClear: () =>
          onUpdateFilters({
            municipio: 'Todos',
            parroquia: 'Todas',
            comuna: 'Todas',
          }),
      });
    }
    if (filters.parroquia !== 'Todas') {
      chips.push({
        key: 'parroquia',
        label: `Parroquia: ${filters.parroquia}`,
        onClear: () => onUpdateFilters({ parroquia: 'Todas', comuna: 'Todas' }),
      });
    }
    if (filters.comuna !== 'Todas') {
      chips.push({
        key: 'comuna',
        label: `Comuna: ${filters.comuna}`,
        onClear: () => onUpdateFilters({ comuna: 'Todas' }),
      });
    }
    if (filters.especie !== 'Todas') {
      chips.push({
        key: 'especie',
        label: `Especie: ${filters.especie}`,
        onClear: () => onUpdateFilters({ especie: 'Todas' }),
      });
    }
    if (filters.archivoOrigen !== 'Todos') {
      chips.push({
        key: 'archivo',
        label: `Archivo: ${filters.archivoOrigen}`,
        onClear: () => onUpdateFilters({ archivoOrigen: 'Todos' }),
      });
    }
    if (filters.fechaInicio || filters.fechaFin) {
      chips.push({
        key: 'fechas',
        label: `Fecha: ${filters.fechaInicio || '...'} a ${
          filters.fechaFin || '...'
        }`,
        onClear: () => onUpdateFilters({ fechaInicio: '', fechaFin: '' }),
      });
    }
    Object.entries(filters.customFields).forEach(([col, val]) => {
      chips.push({
        key: `custom-${col}`,
        label: `${col}: ${val}`,
        onClear: () => {
          const next = { ...filters.customFields };
          delete next[col];
          onUpdateFilters({ customFields: next });
        },
      });
    });
    return chips;
  }, [filters, onUpdateFilters]);

  // Sorted & Paginated Table Data
  const sortedTableRecords = useMemo(() => {
    const copy = [...filteredRecords];
    copy.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return copy;
  }, [filteredRecords, sortField, sortAsc]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedTableRecords.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedTableRecords.slice(start, start + pageSize);
  }, [sortedTableRecords, safeCurrentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Hidden input for quick Excel file upload */}
      <input
        ref={quickFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            await onUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Top Bar: Left "Venezue Come Pescado" + Right 2 Action Buttons: 1) Inicio 2) Filtros */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={onBackToHero}
            className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 hover:text-cyan-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Venezue Come Pescado
          </button>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onBackToHero}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-cyan-700" />
              <span>Inicio</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6">
        {/* Top Central Banner with Attached Photographs */}
        <DashboardBanner />

        {/* Zero-Data State Notice: Ready to attach Excel file */}
        {validRecords.length === 0 && (
          <div
            role="status"
            className="mb-6 rounded-xl bg-cyan-950 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Indicadores en cero (0) — Listo para cargar tu archivo Excel
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Adjunta tu reporte en formato Excel (.xlsx / .xls) para calcular automáticamente las métricas, habilitar los filtros de tus columnas y generar las gráficas.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => downloadSampleExcelTemplate(1)}
                className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Descargar Formato Ejemplo
              </button>
              <button
                type="button"
                onClick={() => quickFileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Adjuntar Archivo Excel</span>
              </button>
            </div>
          </div>
        )}

        {/* Upload / Validation Status Feedback Banner */}
        {uploadFeedback && (
          <div
            role="status"
            className={`mb-5 rounded-xl px-4 py-3 text-xs flex items-start sm:items-center gap-2.5 border ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                : uploadFeedback.type === 'warning'
                ? 'bg-amber-50 text-amber-950 border-amber-200'
                : 'bg-rose-50 text-rose-950 border-rose-200'
            }`}
          >
            {uploadFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : uploadFeedback.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <span className="font-medium leading-snug">
              {uploadFeedback.message}
            </span>
          </div>
        )}

        {/* Two-Column Analytical Workspace Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Área Central (Izquierda/Centro en Desktop, Superior en Móvil) */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* 0. Barra Integrada de Búsqueda Avanzada y Filtros Rápidos */}
            <section
              id="barra-busqueda-filtros"
              aria-label="Buscador y filtros rápidos"
              className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                {/* Search Scope Selector */}
                <select
                  aria-label="Campo donde buscar"
                  value={filters.searchColumn}
                  onChange={(e) => {
                    onUpdateFilters({ searchColumn: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-cyan-600 focus:bg-white focus:outline-none md:w-52 shrink-0"
                >
                  <option value="Todos">Buscar en: Todos los campos</option>
                  <option value="__especie">Campo: Especie</option>
                  <option value="__municipio">Campo: Municipio</option>
                  <option value="__parroquia">Campo: Parroquia</option>
                  <option value="__comuna">Campo: Comuna / Sector</option>
                  <option value="__punto">Campo: Punto Distribución</option>
                  {allExcelColumnNames.map((col) => (
                    <option key={col} value={col}>
                      Excel: {col}
                    </option>
                  ))}
                </select>

                {/* Accent-insensitive Multi-term Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={filters.search}
                    onChange={(e) => {
                      onUpdateFilters({ search: e.target.value });
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar por municipio, parroquia, comuna, especie o varias palabras..."
                    className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none"
                  />
                  {filters.search && (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateFilters({ search: '' });
                        setCurrentPage(1);
                      }}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Live match counter */}
                <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                  <span className="text-xs font-mono tabular-nums text-slate-600 bg-slate-100 px-3 py-2 rounded-lg whitespace-nowrap">
                    {filteredRecords.length} de {validRecords.length} reg.
                  </span>
                </div>
              </div>

              {/* Quick Cascading Filters Row */}
              {validRecords.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 pt-1">
                  <select
                    aria-label="Filtro rápido por Municipio"
                    value={filters.municipio}
                    onChange={(e) => {
                      onUpdateFilters({
                        municipio: e.target.value,
                        parroquia: 'Todas',
                        comuna: 'Todas',
                      });
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-cyan-600 focus:bg-white focus:outline-none"
                  >
                    <option value="Todos">
                      Municipio: Todos ({availableMunicipios.length})
                    </option>
                    {availableMunicipios.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} ({opt.count})
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filtro rápido por Parroquia"
                    value={filters.parroquia}
                    disabled={availableParroquias.length === 0}
                    onChange={(e) => {
                      onUpdateFilters({
                        parroquia: e.target.value,
                        comuna: 'Todas',
                      });
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-cyan-600 focus:bg-white focus:outline-none disabled:opacity-50"
                  >
                    <option value="Todas">
                      Parroquia: Todas ({availableParroquias.length})
                    </option>
                    {availableParroquias.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} ({opt.count})
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filtro rápido por Comuna"
                    value={filters.comuna}
                    disabled={availableComunas.length === 0}
                    onChange={(e) => {
                      onUpdateFilters({ comuna: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-cyan-600 focus:bg-white focus:outline-none disabled:opacity-50"
                  >
                    <option value="Todas">
                      Comuna: Todas ({availableComunas.length})
                    </option>
                    {availableComunas.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} ({opt.count})
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filtro rápido por Especie"
                    value={filters.especie}
                    onChange={(e) => {
                      onUpdateFilters({ especie: e.target.value });
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-cyan-600 focus:bg-white focus:outline-none"
                  >
                    <option value="Todas">
                      Especie: Todas ({availableSpecies.length})
                    </option>
                    {availableSpecies.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} ({opt.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Active Filters Strip */}
              {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Filtros activos:
                  </span>
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => {
                        chip.onClear();
                        setCurrentPage(1);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-[11px] font-semibold text-cyan-900 hover:bg-cyan-100 transition-colors cursor-pointer"
                    >
                      <span>{chip.label}</span>
                      <X className="w-3 h-3 text-cyan-700" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onResetFilters();
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 ml-auto cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpiar todo</span>
                  </button>
                </div>
              )}
            </section>

            {/* 1. Tarjetas Superiores de KPIs (Inician en 0 hasta subir Excel) */}
            <section
              id="seccion-kpis"
              aria-label="Indicadores Clave de Desempeño"
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* KPI 1: Total Toneladas */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                    <span>Total Toneladas</span>
                    <Scale className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                    {kpiMetrics.totalToneladas.toFixed(2)}{' '}
                    <span className="text-sm font-semibold text-cyan-700">
                      TM
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                    <span>
                      {kpiMetrics.totalKilogramos.toLocaleString('es-VE', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      Kg
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Proteína distribuida</span>
                  </div>
                </div>

                {/* KPI 2: Especies Registradas */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                    <span>Especies Registradas</span>
                    <Fish className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                    {kpiMetrics.uniqueSpecies}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 truncate">
                    <span>Líder:</span>
                    <span className="font-semibold text-slate-700 truncate">
                      {kpiMetrics.topSpeciesName || 'Sin datos'}
                    </span>
                  </div>
                </div>

                {/* KPI 3: Jornadas / Municipios */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                    <span>Jornadas / Municipios</span>
                    <MapPin className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                    {kpiMetrics.totalJornadas}{' '}
                    <span className="text-sm font-normal text-slate-400">/</span>{' '}
                    <span className="text-xl text-sky-700">
                      {kpiMetrics.uniqueMunicipios} Mun.
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                    <span>
                      {kpiMetrics.totalFamilias > 0
                        ? `${kpiMetrics.totalFamilias.toLocaleString('es-VE')} familias atendidas`
                        : 'Sin columna de familias'}
                    </span>
                  </div>
                </div>

                {/* KPI 4: Archivos Cargados */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                    <span>Archivos Cargados</span>
                    <FolderCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 tracking-tight">
                    {uploadedFiles.length}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                    <Users className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span>
                      {kpiMetrics.avgKgPerFamily !== null
                        ? `Promedio: ${kpiMetrics.avgKgPerFamily} Kg / familia`
                        : 'Promedio: —'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de Cumplimiento Regional + Acciones Rápidas */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Target className="w-4 h-4 text-cyan-600" />
                      <span>
                        Meta Regional de Distribución Proteica:{' '}
                        <span className="font-mono tabular-nums text-cyan-700">
                          {kpiMetrics.totalToneladas.toFixed(2)} /{' '}
                          {regionalGoalTons} TM ({kpiMetrics.goalPct}%)
                        </span>
                      </span>
                    </div>

                    {!editingGoal ? (
                      <button
                        type="button"
                        onClick={() => {
                          setGoalInput(String(regionalGoalTons));
                          setEditingGoal(true);
                        }}
                        className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 cursor-pointer"
                      >
                        Ajustar meta (TM)
                      </button>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = parseFloat(goalInput);
                          if (!isNaN(val) && val > 0) {
                            onUpdateRegionalGoal(val);
                          }
                          setEditingGoal(false);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={goalInput}
                          onChange={(e) => setGoalInput(e.target.value)}
                          className="w-20 rounded border border-slate-300 px-2 py-0.5 text-xs font-mono tabular-nums"
                        />
                        <button
                          type="submit"
                          className="px-2 py-0.5 rounded bg-cyan-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          OK
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-sky-600 rounded-full transition-all duration-300"
                      style={{ width: `${kpiMetrics.goalPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => quickFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Adjuntar Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecord(null);
                      setRecordModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Registrar Jornada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-700" />
                    <span>Informe Ejecutivo / PDF</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 2. Indicador Dinámico por Especie Hidrobiológica */}
            <SpeciesDynamicIndicator
              records={filteredRecords}
              selectedSpecies={filters.especie}
              onSelectSpecies={(especie) => {
                onUpdateFilters({ especie });
                setCurrentPage(1);
              }}
            />

            {/* 3. Gráfico de Barras Apiladas Dinámico: Jornadas por Municipio, Parroquia y Comuna */}
            <JornadasStackedBarChart
              records={filteredRecords}
              filters={filters}
              onSelectMunicipio={(municipio) => {
                onUpdateFilters({
                  municipio,
                  parroquia: 'Todas',
                  comuna: 'Todas',
                });
                setCurrentPage(1);
              }}
              onSelectParroquia={(parroquia) => {
                onUpdateFilters({ parroquia, comuna: 'Todas' });
                setCurrentPage(1);
              }}
              onSelectComuna={(comuna) => {
                onUpdateFilters({ comuna });
                setCurrentPage(1);
              }}
              onQuickUpload={() => quickFileInputRef.current?.click()}
            />

            {/* 4. Gráfico Dinámico de Jornadas por Nivel Territorial */}
            <TerritorialJornadasChart
              records={filteredRecords}
              selectedMunicipio={filters.municipio}
              selectedParroquia={filters.parroquia}
              selectedComuna={filters.comuna}
              onSelectMunicipio={(municipio) => {
                onUpdateFilters({
                  municipio,
                  parroquia: 'Todas',
                  comuna: 'Todas',
                });
                setCurrentPage(1);
              }}
              onSelectParroquia={(parroquia) => {
                onUpdateFilters({ parroquia, comuna: 'Todas' });
                setCurrentPage(1);
              }}
              onSelectComuna={(comuna) => {
                onUpdateFilters({ comuna });
                setCurrentPage(1);
              }}
              onQuickUpload={() => quickFileInputRef.current?.click()}
            />

            {/* 4. Mapa Territorial del Estado Barinas (Sin Semáforo de Meta Municipal) */}
            <BarinasMap
              records={filteredRecords}
              selectedMunicipio={filters.municipio}
              onSelectMunicipio={(municipio) => {
                onUpdateFilters({
                  municipio,
                  parroquia: 'Todas',
                  comuna: 'Todas',
                });
                setCurrentPage(1);
              }}
            />

            {/* 5. Tabla de Datos Paginada con Columnas del Formato Excel Adjuntado */}
            <section
              id="seccion-tabla"
              aria-label="Tabla de registros acumulados"
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Table Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Registro Consolidado del Formato Excel
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mostrando{' '}
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {filteredRecords.length}
                    </span>{' '}
                    de{' '}
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {validRecords.length}
                    </span>{' '}
                    registros cargados
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {allExcelColumnNames.length > 0 && (
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setTableViewMode('excel')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                          tableViewMode === 'excel'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Campos del Excel ({allExcelColumnNames.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableViewMode('estandar')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                          tableViewMode === 'estandar'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Vista Resumen
                      </button>
                    </div>
                  )}

                  {/* Export Consolidated Data Button */}
                  <button
                    type="button"
                    onClick={() => exportRecordsToExcel(filteredRecords)}
                    disabled={filteredRecords.length === 0}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-700" />
                    <span>Exportar (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* High-Density Data Grid */}
              <div className="overflow-x-auto">
                {tableViewMode === 'excel' && allExcelColumnNames.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        {allExcelColumnNames.map((col) => (
                          <th key={col} className="py-3 px-4 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                        <th className="py-3 px-4 whitespace-nowrap text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 text-xs">
                      {paginatedRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={allExcelColumnNames.length + 1}
                            className="py-12 px-4 text-center text-slate-500"
                          >
                            No hay registros que coincidan con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        paginatedRecords.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-cyan-50/40 transition-colors"
                          >
                            {allExcelColumnNames.map((col) => (
                              <td
                                key={col}
                                className="py-3 px-4 text-slate-800 whitespace-nowrap font-mono tabular-nums"
                              >
                                {row.rawFields?.[col] ?? '-'}
                              </td>
                            ))}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecord(row);
                                    setRecordModalOpen(true);
                                  }}
                                  title="Editar fila"
                                  className="p-1.5 rounded text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteRecord(row.id)}
                                  title="Eliminar fila"
                                  className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <th className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort('fecha')}
                            className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                          >
                            <span>Fecha</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort('especie')}
                            className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                          >
                            <span>Especie</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort('municipio')}
                            className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                          >
                            <span>Municipio / Parroquia / Comuna</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort('tipoPesca')}
                            className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                          >
                            <span>Modalidad</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => handleSort('toneladas')}
                            className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                          >
                            <span>Volumen</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => handleSort('familiasBeneficiadas')}
                            className="inline-flex items-center justify-end gap-1 hover:text-slate-900 cursor-pointer ml-auto"
                          >
                            <span>Familias</span>
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap">
                          Punto / Origen
                        </th>
                        <th className="py-3 px-4 whitespace-nowrap text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 text-xs">
                      {paginatedRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-12 px-4 text-center text-slate-500"
                          >
                            Tabla en cero (0) — Adjunta un archivo Excel para mostrar los registros.
                          </td>
                        </tr>
                      ) : (
                        paginatedRecords.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-cyan-50/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {row.fecha || '—'}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                              {row.especie}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-medium text-slate-800">
                                {row.municipio}
                              </span>
                              <span
                                className="text-slate-400 mx-1.5"
                                aria-hidden="true"
                              >
                                ·
                              </span>
                              <span className="text-slate-500">
                                {row.parroquia}
                              </span>
                              {getComunaText(row) !== '-' && (
                                <>
                                  <span
                                    className="text-slate-400 mx-1.5"
                                    aria-hidden="true"
                                  >
                                    ·
                                  </span>
                                  <span className="text-cyan-700 font-medium">
                                    {getComunaText(row)}
                                  </span>
                                </>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {row.tipoPesca}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-cyan-800 whitespace-nowrap">
                              <span>
                                {(row.kilogramos ?? row.toneladas * 1000).toLocaleString(
                                  'es-VE',
                                  { maximumFractionDigits: 2 }
                                )}{' '}
                                Kg
                              </span>
                              <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                                ({row.toneladas.toFixed(2)} TM)
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {row.familiasBeneficiadas.toLocaleString('es-VE')}
                            </td>
                            <td className="py-3 px-4 text-slate-500 max-w-[190px] truncate">
                              <span title={row.puntoDistribucion}>
                                {row.puntoDistribucion}
                              </span>
                              <span
                                className="mx-1.5 text-slate-300"
                                aria-hidden="true"
                              >
                                /
                              </span>
                              <span
                                className="text-[11px] text-slate-400"
                                title={row.archivoOrigen}
                              >
                                {row.archivoOrigen}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecord(row);
                                    setRecordModalOpen(true);
                                  }}
                                  title="Editar fila"
                                  className="p-1.5 rounded text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteRecord(row.id)}
                                  title="Eliminar fila"
                                  className="p-1.5 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Footer */}
              <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Filas por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-mono tabular-nums text-slate-800 focus:border-cyan-600 focus:outline-none"
                  >
                    <option value={8}>8</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span>
                    Página {safeCurrentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      aria-label="Página anterior"
                      className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      aria-label="Página siguiente"
                      className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Barra Lateral Derecha (Sidebar de Control y Filtros) */}
          <ControlSidebar
            uploadedFiles={uploadedFiles}
            onUploadFiles={onUploadFiles}
            onRemoveSingleFile={onRemoveSingleFile}
            onClearAllHistory={onClearAllHistory}
            filters={filters}
            onUpdateFilters={(next) => {
              onUpdateFilters(next);
              setCurrentPage(1);
            }}
            onResetFilters={() => {
              onResetFilters();
              setCurrentPage(1);
            }}
            availableSpecies={availableSpecies}
            availableMunicipios={availableMunicipios}
            availableParroquias={availableParroquias}
            availableComunas={availableComunas}
            availableTiposPesca={availableTiposPesca}
            allExcelColumnNames={allExcelColumnNames}
            dynamicExcelColumns={dynamicExcelColumns}
            hasDateData={hasDateData}
            isUploading={isUploading}
            uploadFeedback={uploadFeedback}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        </div>
      </main>

      {/* Modal: Registrar / Editar Jornada Manual */}
      <RecordModal
        isOpen={recordModalOpen}
        initialRecord={editingRecord}
        onClose={() => {
          setRecordModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={onSaveManualRecord}
      />

      {/* Modal: Informe Ejecutivo Imprimible / PDF */}
      <ExecutiveReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        records={filteredRecords}
        regionalGoalTons={regionalGoalTons}
      />
    </div>
  );
};
