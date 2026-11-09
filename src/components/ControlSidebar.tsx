import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Filter,
  RotateCcw,
  Download,
  Check,
  X,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { FilterState, UploadedFileMeta } from '../types/fishery';
import { downloadSampleExcelTemplate } from '../data/demoData';

interface ControlSidebarProps {
  uploadedFiles: UploadedFileMeta[];
  onUploadFiles: (files: FileList) => Promise<void>;
  onRemoveSingleFile: (fileName: string) => void;
  onClearAllHistory: () => void;
  filters: FilterState;
  onUpdateFilters: (next: Partial<FilterState>) => void;
  onResetFilters: () => void;
  availableSpecies: string[];
  availableMunicipios: string[];
  availableTiposPesca: string[];
  isUploading: boolean;
  uploadFeedback: { type: 'success' | 'error'; message: string } | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  uploadedFiles,
  onUploadFiles,
  onRemoveSingleFile,
  onClearAllHistory,
  filters,
  onUpdateFilters,
  onResetFilters,
  availableSpecies,
  availableMunicipios,
  availableTiposPesca,
  isUploading,
  uploadFeedback,
  mobileOpen,
  onCloseMobile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const toggleTipoPesca = (tipo: string) => {
    const exists = filters.tipoPesca.includes(tipo);
    const updated = exists
      ? filters.tipoPesca.filter((t) => t !== tipo)
      : [...filters.tipoPesca, tipo];
    onUpdateFilters({ tipoPesca: updated });
  };

  const activeFilterCount =
    (filters.especie !== 'Todas' ? 1 : 0) +
    (filters.municipio !== 'Todos' ? 1 : 0) +
    (filters.archivoOrigen !== 'Todos' ? 1 : 0) +
    (filters.fechaInicio ? 1 : 0) +
    (filters.fechaFin ? 1 : 0) +
    filters.tipoPesca.length;

  const sidebarContent = (
    <div className="flex flex-col gap-6">
      {/* 1. Módulo de Carga Acumulativa de Excel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Carga Acumulativa Excel
          </h3>
          <span className="text-xs font-mono tabular-nums text-cyan-700 font-semibold">
            {uploadedFiles.length} {uploadedFiles.length === 1 ? 'archivo' : 'archivos'}
          </span>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Sube uno o varios reportes Excel. Los registros se suman automáticamente
          al consolidado actual sin borrar cargas anteriores.
        </p>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`group relative rounded-xl border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-cyan-500 bg-cyan-50/70'
              : 'border-slate-300 hover:border-cyan-600 hover:bg-slate-50/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5" />
          </div>

          <span className="block text-xs font-bold text-slate-900 mb-1">
            {isUploading
              ? 'Procesando archivo Excel...'
              : 'Adjuntar archivo Excel .xlsx / .xls'}
          </span>
          <span className="block text-[11px] text-slate-500">
            Arrastra y suelta aquí o haz clic para explorar
          </span>
        </div>

        {/* Sample Excel Template Download Button */}
        <button
          type="button"
          onClick={() => downloadSampleExcelTemplate(uploadedFiles.length + 1)}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
          <span>Descargar plantilla de prueba (.xlsx)</span>
        </button>

        {/* Feedback Toast inside module */}
        {uploadFeedback && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2 ${
              uploadFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            {uploadFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug">{uploadFeedback.message}</span>
          </div>
        )}

        {/* Lista de Archivos Cargados */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-700">
              Archivos cargados
            </span>
            {uploadedFiles.length > 0 && (
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                Acumulado activo
              </span>
            )}
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="py-4 px-3 rounded-lg bg-slate-50 text-center">
              <FileSpreadsheet className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xs text-slate-500">
                Ningún archivo cargado aún. Se muestran datos de demostración de Barinas.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {uploadedFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                      <p
                        className="font-semibold text-slate-800 truncate"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                      <span>{file.recordCount} reg.</span>
                      <span aria-hidden="true">·</span>
                      <span>{file.totalToneladas.toFixed(2)} TM</span>
                      <span aria-hidden="true">·</span>
                      <span>{file.uploadedAt}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveSingleFile(file.name)}
                    title={`Quitar ${file.name}`}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Botón Secundario: Limpiar historial de datos */}
          {uploadedFiles.length > 0 && (
            <div className="mt-3">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar historial de datos</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
                  <p className="text-[11px] text-rose-900 font-medium text-center">
                    ¿Confirmas eliminar los archivos acumulados y restaurar la vista inicial?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllHistory();
                        setConfirmClear(false);
                      }}
                      className="flex-1 py-1.5 px-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Sí, limpiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 py-1.5 px-2 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Sección de Filtros Dinámicos */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-700" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Filtros Analíticos
            </h3>
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-900 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer ({activeFilterCount})</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Select Especie */}
          <div>
            <label
              htmlFor="filter-especie"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Especie Hidrobiológica
            </label>
            <select
              id="filter-especie"
              value={filters.especie}
              onChange={(e) => onUpdateFilters({ especie: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 font-medium focus:border-cyan-600 focus:bg-white focus:outline-none"
            >
              <option value="Todas">Todas las especies ({availableSpecies.length})</option>
              {availableSpecies.map((esp) => (
                <option key={esp} value={esp}>
                  {esp}
                </option>
              ))}
            </select>
          </div>

          {/* Select Municipio */}
          <div>
            <label
              htmlFor="filter-municipio"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Municipio (Región Barinas)
            </label>
            <select
              id="filter-municipio"
              value={filters.municipio}
              onChange={(e) => onUpdateFilters({ municipio: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 font-medium focus:border-cyan-600 focus:bg-white focus:outline-none"
            >
              <option value="Todos">Todos los municipios ({availableMunicipios.length})</option>
              {availableMunicipios.map((mun) => (
                <option key={mun} value={mun}>
                  {mun}
                </option>
              ))}
            </select>
          </div>

          {/* Select Archivo de Origen (si hay más de 1 archivo) */}
          {uploadedFiles.length > 1 && (
            <div>
              <label
                htmlFor="filter-archivo"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Archivo Excel de Origen
              </label>
              <select
                id="filter-archivo"
                value={filters.archivoOrigen}
                onChange={(e) => onUpdateFilters({ archivoOrigen: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 font-medium focus:border-cyan-600 focus:bg-white focus:outline-none"
              >
                <option value="Todos">Todos los archivos acumulados</option>
                {uploadedFiles.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rango de Fechas */}
          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Rango de Fecha</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="fecha-inicio" className="block text-[11px] text-slate-500 mb-1">
                  Desde
                </label>
                <input
                  id="fecha-inicio"
                  type="date"
                  value={filters.fechaInicio}
                  onChange={(e) => onUpdateFilters({ fechaInicio: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-800 focus:border-cyan-600 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="fecha-fin" className="block text-[11px] text-slate-500 mb-1">
                  Hasta
                </label>
                <input
                  id="fecha-fin"
                  type="date"
                  value={filters.fechaFin}
                  onChange={(e) => onUpdateFilters({ fechaFin: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-800 focus:border-cyan-600 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Casillas de Verificación: Tipo de Pesca / Modalidad */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Modalidad / Tipo de Pesca
            </span>
            <div className="space-y-1.5">
              {availableTiposPesca.map((tipo) => {
                const checked = filters.tipoPesca.includes(tipo);
                return (
                  <label
                    key={tipo}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-cyan-50/80 border-cyan-600 text-slate-900 font-semibold'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTipoPesca(tipo)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="truncate">{tipo}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Right Sidebar (lg:w-80) */}
      <aside
        aria-label="Barra lateral de carga Excel y filtros"
        className="hidden lg:block w-80 shrink-0"
      >
        <div className="sticky top-20">{sidebarContent}</div>
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-full max-w-sm bg-slate-50 h-full overflow-y-auto p-4 pb-20 shadow-2xl border-l border-slate-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-900">
                Control de Datos y Filtros
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
