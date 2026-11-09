import React, { useMemo, useState, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
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
  Info,
  Upload,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Target,
  Users,
} from 'lucide-react';
import {
  FilterState,
  FisheryRecord,
  UploadedFileMeta,
} from '../types/fishery';
import { DashboardBanner } from './DashboardBanner';
import { ControlSidebar } from './ControlSidebar';
import { BarinasMap } from './BarinasMap';
import { RecordModal } from './RecordModal';
import { ExecutiveReportModal } from './ExecutiveReportModal';
import {
  downloadSampleExcelTemplate,
  exportRecordsToExcel,
} from '../data/demoData';

interface DashboardViewProps {
  onBackToHero: () => void;
  records: FisheryRecord[];
  uploadedFiles: UploadedFileMeta[];
  isUsingDemoData: boolean;
  onUploadFiles: (files: FileList) => Promise<void>;
  onRemoveSingleFile: (fileName: string) => void;
  onClearAllHistory: () => void;
  onSaveManualRecord: (
    data: Omit<FisheryRecord, 'id' | 'archivoOrigen'>,
    existingId?: string
  ) => void;
  onDeleteRecord: (id: string) => void;
  regionalGoalTons: number;
  onUpdateRegionalGoal: (goal: number) => void;
  filters: FilterState;
  onUpdateFilters: (next: Partial<FilterState>) => void;
  onResetFilters: () => void;
  isUploading: boolean;
  uploadFeedback: { type: 'success' | 'error'; message: string } | null;
}

const CHART_COLORS = [
  '#0284c7', // sky-600
  '#06b6d4', // cyan-500
  '#0f172a', // slate-900
  '#eab308', // yellow-500
  '#f43f5e', // rose-500
  '#0d9488', // teal-600
  '#2563eb', // blue-600
  '#ea580c', // orange-600
];

type SortField =
  | 'fecha'
  | 'especie'
  | 'municipio'
  | 'tipoPesca'
  | 'toneladas'
  | 'familiasBeneficiadas';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onBackToHero,
  records,
  uploadedFiles,
  isUsingDemoData,
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
  const [barChartMode, setBarChartMode] = useState<'especie' | 'municipio'>(
    'especie'
  );
  const [donutMode, setDonutMode] = useState<'tipoPesca' | 'especie'>(
    'tipoPesca'
  );
  const [sortField, setSortField] = useState<SortField>('fecha');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Modals state
  const [recordModalOpen, setRecordModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<FisheryRecord | null>(
    null
  );
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>(String(regionalGoalTons));

  const quickFileInputRef = useRef<HTMLInputElement | null>(null);

  // Extract unique filter options from all loaded records
  const availableSpecies = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.especie))).sort();
  }, [records]);

  const availableMunicipios = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.municipio))).sort();
  }, [records]);

  const availableTiposPesca = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.tipoPesca))).sort();
  }, [records]);

  // Apply dynamic filters + real-time search
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (filters.especie !== 'Todas' && rec.especie !== filters.especie) {
        return false;
      }
      if (filters.municipio !== 'Todos' && rec.municipio !== filters.municipio) {
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
      if (filters.fechaInicio && rec.fecha < filters.fechaInicio) {
        return false;
      }
      if (filters.fechaFin && rec.fecha > filters.fechaFin) {
        return false;
      }
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const match =
          rec.especie.toLowerCase().includes(q) ||
          rec.municipio.toLowerCase().includes(q) ||
          rec.parroquia.toLowerCase().includes(q) ||
          rec.tipoPesca.toLowerCase().includes(q) ||
          rec.puntoDistribucion.toLowerCase().includes(q) ||
          rec.archivoOrigen.toLowerCase().includes(q) ||
          rec.fecha.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [records, filters]);

  // Compute KPI Metrics from filtered records
  const kpiMetrics = useMemo(() => {
    const totalToneladas = filteredRecords.reduce(
      (acc, r) => acc + r.toneladas,
      0
    );
    const totalKilogramos = Math.round(totalToneladas * 1000);
    const uniqueSpecies = new Set(filteredRecords.map((r) => r.especie)).size;
    const uniqueMunicipios = new Set(filteredRecords.map((r) => r.municipio))
      .size;
    const totalFamilias = filteredRecords.reduce(
      (acc, r) => acc + r.familiasBeneficiadas,
      0
    );
    const avgKgPerFamily =
      totalFamilias > 0 ? +(totalKilogramos / totalFamilias).toFixed(2) : 0;
    const goalPct =
      regionalGoalTons > 0
        ? Math.min(100, +((totalToneladas / regionalGoalTons) * 100).toFixed(1))
        : 0;

    return {
      totalToneladas,
      totalKilogramos,
      uniqueSpecies,
      uniqueMunicipios,
      totalJornadas: filteredRecords.length,
      totalFamilias,
      avgKgPerFamily,
      goalPct,
    };
  }, [filteredRecords, regionalGoalTons]);

  // 1. Bar Chart Data (by Species or by Municipality)
  const barChartData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; toneladas: number; familias: number }
    >();
    filteredRecords.forEach((r) => {
      const key = barChartMode === 'especie' ? r.especie : r.municipio;
      const existing = map.get(key) || { name: key, toneladas: 0, familias: 0 };
      existing.toneladas = +(existing.toneladas + r.toneladas).toFixed(2);
      existing.familias += r.familiasBeneficiadas;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.toneladas - a.toneladas);
  }, [filteredRecords, barChartMode]);

  // 2. Temporal Evolution Data
  const timeSeriesData = useMemo(() => {
    const map = new Map<
      string,
      { fecha: string; toneladas: number; acumulado: number }
    >();
    const sortedByDate = [...filteredRecords].sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );

    sortedByDate.forEach((r) => {
      const key = r.fecha;
      const existing = map.get(key) || { fecha: key, toneladas: 0, acumulado: 0 };
      existing.toneladas = +(existing.toneladas + r.toneladas).toFixed(2);
      map.set(key, existing);
    });

    let runningTotal = 0;
    return Array.from(map.values()).map((item) => {
      runningTotal = +(runningTotal + item.toneladas).toFixed(2);
      return {
        ...item,
        acumulado: runningTotal,
      };
    });
  }, [filteredRecords]);

  // 3. Doughnut Distribution Data
  const donutChartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredRecords.forEach((r) => {
      const key = donutMode === 'tipoPesca' ? r.tipoPesca : r.especie;
      map.set(key, +((map.get(key) || 0) + r.toneladas).toFixed(2));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRecords, donutMode]);

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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Hidden input for Top Bar quick upload */}
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

      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={onBackToHero}
            className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 hover:text-cyan-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Venezuela Come + Pescado
          </button>

          {/* Zone 2: 5 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={onBackToHero}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Inicio
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('seccion-kpis')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Indicadores
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('seccion-mapa')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Mapa Barinas
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('seccion-graficos')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Gráficos
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('seccion-tabla')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Registros
            </button>
          </nav>

          {/* Zone 3: 1 primary action (plus mobile drawer trigger on < lg) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => quickFileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Adjuntar Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Abrir panel de control y filtros"
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-6">
        {/* Top Banner Superior */}
        <DashboardBanner />

        {/* Demo Data Notice Banner */}
        {isUsingDemoData && (
          <div
            role="status"
            className="mb-6 rounded-xl bg-amber-50/90 border border-amber-200/90 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start sm:items-center gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-xs sm:text-sm font-bold text-amber-950">
                  Mostrando datos de ejemplo - Sube un archivo Excel para actualizar
                </p>
                <p className="text-xs text-amber-800">
                  Visualizando registros demostrativos de pesca y acuicultura en la Región Barinas. Puedes subir un archivo Excel, registrar jornadas manualmente o editar cualquier fila.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadSampleExcelTemplate(1)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Descargar Excel de Ejemplo
              </button>
              <button
                type="button"
                onClick={() => quickFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Subir Excel Ahora
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Analytical Workspace Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Área Central (Izquierda/Centro en Desktop, Superior en Móvil) */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* 1. Tarjetas Superiores de KPIs + Meta Mensual */}
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
                      {kpiMetrics.totalKilogramos.toLocaleString('es-VE')} Kg
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
                      {barChartData[0]?.name || 'N/A'}
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
                      {kpiMetrics.totalFamilias.toLocaleString('es-VE')} familias
                      atendidas
                    </span>
                  </div>
                </div>

                {/* KPI 4: Archivos Cargados & Promedio Proteico */}
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
                    <span>Promedio: {kpiMetrics.avgKgPerFamily} Kg / familia</span>
                  </div>
                </div>
              </div>

              {/* Barra de Cumplimiento de Meta Regional + Acciones Rápidas */}
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
                      style={{ width: `${Math.max(3, kpiMetrics.goalPct)}%` }}
                    />
                  </div>
                </div>

                {/* Botones Ejecutivos: Registrar Jornada Manual e Informe Ejecutivo */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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

            {/* 2. Mapa Interactivo del Estado Barinas y Semáforo Municipal */}
            <BarinasMap
              records={records}
              selectedMunicipio={filters.municipio}
              onSelectMunicipio={(municipio) => {
                onUpdateFilters({ municipio });
                setCurrentPage(1);
              }}
              regionalGoalTons={regionalGoalTons}
            />

            {/* 3. Gráficos Interactivos */}
            <section
              id="seccion-graficos"
              aria-label="Visualizaciones analíticas"
              className="space-y-6"
            >
              {/* Gráfico Principal de Barras: Volumen por Especie / Municipio */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Volumen de Producción y Distribución (Toneladas Métricas)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comparativa acumulada según filtro activo en el Observatorio Regional
                    </p>
                  </div>

                  {/* Interactive Segmented Control */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setBarChartMode('especie')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        barChartMode === 'especie'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Por Especie
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarChartMode('municipio')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        barChartMode === 'municipio'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Por Municipio
                    </button>
                  </div>
                </div>

                {barChartData.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-lg">
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      Sin registros para los filtros seleccionados
                    </p>
                    <p className="text-xs text-slate-500 mb-3">
                      Ajusta los controles laterales o restablece los filtros para visualizar las métricas.
                    </p>
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 transition-colors cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  <div className="h-72 sm:h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barChartData}
                        margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
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
                          height={50}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#475569' }}
                          unit=" TM"
                        />
                        <Tooltip
                          formatter={(value: unknown) => [
                            `${Number(value ?? 0).toFixed(2)} TM (${Math.round(
                              Number(value ?? 0) * 1000
                            ).toLocaleString('es-VE')} Kg)`,
                            'Volumen',
                          ]}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#f8fafc',
                            fontSize: '12px',
                          }}
                        />
                        <Bar
                          dataKey="toneladas"
                          name="Toneladas (TM)"
                          fill="#0284c7"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={54}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Segunda Fila de Gráficos: Evolución Temporal + Distribución (Dona) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Gráfico de Líneas / Evolución Temporal (7 cols) */}
                <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      Evolución Temporal de Captura y Jornadas
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Toneladas registradas por fecha y curva de crecimiento acumulado en Barinas
                    </p>
                  </div>

                  {timeSeriesData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg text-xs text-slate-500">
                      Sin datos temporales disponibles con el filtro actual
                    </div>
                  ) : (
                    <div className="h-64 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={timeSeriesData}
                          margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorAcumulado"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#06b6d4"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="95%"
                                stopColor="#06b6d4"
                                stopOpacity={0.02}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="fecha"
                            tick={{ fontSize: 11, fill: '#475569' }}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: '#475569' }}
                            unit=" TM"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#f8fafc',
                              fontSize: '12px',
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="acumulado"
                            name="Acumulado (TM)"
                            stroke="#0891b2"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorAcumulado)"
                          />
                          <Area
                            type="monotone"
                            dataKey="toneladas"
                            name="Jornada / Fecha (TM)"
                            stroke="#0f172a"
                            strokeWidth={2}
                            fillOpacity={0.1}
                            fill="#0f172a"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Gráfico de Dona: Distribución Porcentual (5 cols) */}
                <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        Distribución de Aporte
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Proporción sobre el volumen total ({kpiMetrics.totalToneladas.toFixed(2)} TM)
                      </p>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                      <button
                        type="button"
                        onClick={() => setDonutMode('tipoPesca')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                          donutMode === 'tipoPesca'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Modalidad
                      </button>
                      <button
                        type="button"
                        onClick={() => setDonutMode('especie')}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                          donutMode === 'especie'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Especie
                      </button>
                    </div>
                  </div>

                  {donutChartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg text-xs text-slate-500">
                      Sin datos para calcular distribución
                    </div>
                  ) : (
                    <div className="h-64 sm:h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutChartData}
                            cx="50%"
                            cy="46%"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {donutChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${entry.name}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: unknown) => [
                              `${Number(value ?? 0).toFixed(2)} TM (${
                                kpiMetrics.totalToneladas > 0
                                  ? (
                                      (Number(value ?? 0) /
                                        kpiMetrics.totalToneladas) *
                                      100
                                    ).toFixed(1)
                                  : 0
                              }%)`,
                              'Aporte',
                            ]}
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#f8fafc',
                              fontSize: '12px',
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: '11px' }}
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 4. Tabla de Datos Paginada con Buscador en Tiempo Real + Edición/Eliminación */}
            <section
              id="seccion-tabla"
              aria-label="Tabla de registros acumulados"
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Table Header & Real-time Search Bar */}
              <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Registro Consolidado del Observatorio Pesquero
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mostrando{' '}
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {filteredRecords.length}
                    </span>{' '}
                    de{' '}
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {records.length}
                    </span>{' '}
                    registros totales en memoria
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Buscador en tiempo real */}
                  <div className="relative min-w-[220px] sm:min-w-[250px] flex-1 sm:flex-none">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={filters.search}
                      onChange={(e) => {
                        onUpdateFilters({ search: e.target.value });
                        setCurrentPage(1);
                      }}
                      placeholder="Buscar especie, municipio, parroquia..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecord(null);
                      setRecordModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Fila</span>
                  </button>

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
                          <span>Municipio / Parroquia</span>
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
                          <span>Volumen (TM)</span>
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
                          No se encontraron registros que coincidan con la búsqueda o filtros activos.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-cyan-50/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {row.fecha}
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
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {row.tipoPesca}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-cyan-800 whitespace-nowrap">
                            {row.toneladas.toFixed(2)} TM
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
            availableTiposPesca={availableTiposPesca}
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
