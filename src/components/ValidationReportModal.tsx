import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  X,
  ShieldAlert,
  CalendarX,
  Hash,
  MinusCircle,
} from 'lucide-react';
import {
  BatchValidationSummary,
  ValidationIssueCode,
} from '../types/fishery';
import { exportValidationReportToExcel } from '../data/demoData';

interface ValidationReportModalProps {
  summary: BatchValidationSummary | null;
  onCancel: () => void;
  onCommitCleanOnly: () => void;
  onCommitWithoutErrors: () => void;
}

type SeverityFilter = 'all' | 'error' | 'warning';
type CategoryFilter =
  | 'all'
  | 'date'
  | 'negative'
  | 'text_numeric'
  | 'incomplete_meta';

const DATE_CODES = new Set<ValidationIssueCode>(['missing_date', 'invalid_date']);
const NEGATIVE_CODES = new Set<ValidationIssueCode>([
  'negative_toneladas',
  'negative_kilogramos',
  'negative_families',
  'negative_numeric',
]);
const META_CODES = new Set<ValidationIssueCode>([
  'missing_municipio',
  'missing_especie',
  'zero_weight',
]);

export const ValidationReportModal: React.FC<ValidationReportModalProps> = ({
  summary,
  onCancel,
  onCommitCleanOnly,
  onCommitWithoutErrors,
}) => {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const filteredItems = useMemo(() => {
    if (!summary) return [];
    return summary.itemsWithIssues.filter((item) => {
      if (severityFilter === 'error' && !item.hasErrors) return false;
      if (severityFilter === 'warning' && (item.hasErrors || !item.hasWarnings)) {
        return false;
      }
      if (categoryFilter === 'date') {
        return item.issues.some((i) => DATE_CODES.has(i.code));
      }
      if (categoryFilter === 'negative') {
        return item.issues.some((i) => NEGATIVE_CODES.has(i.code));
      }
      if (categoryFilter === 'text_numeric') {
        return item.issues.some((i) => i.code === 'text_in_numeric_field');
      }
      if (categoryFilter === 'incomplete_meta') {
        return item.issues.some((i) => META_CODES.has(i.code));
      }
      return true;
    });
  }, [summary, severityFilter, categoryFilter]);

  if (!summary) return null;

  const totalDateIssues =
    (summary.issueCounts.missing_date || 0) +
    (summary.issueCounts.invalid_date || 0);
  const totalNegativeIssues =
    (summary.issueCounts.negative_toneladas || 0) +
    (summary.issueCounts.negative_kilogramos || 0) +
    (summary.issueCounts.negative_families || 0) +
    (summary.issueCounts.negative_numeric || 0);
  const totalTextNumericIssues =
    summary.issueCounts.text_in_numeric_field || 0;
  const totalMetaIssues =
    (summary.issueCounts.missing_municipio || 0) +
    (summary.issueCounts.missing_especie || 0) +
    (summary.issueCounts.zero_weight || 0);

  const canCommitClean = summary.cleanCount > 0;
  const canCommitWithoutErrors =
    summary.safeRecordsWithoutErrors.length > 0 &&
    summary.warningOnlyCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2
                id="validation-modal-title"
                className="text-base sm:text-lg font-bold tracking-tight"
              >
                Reporte Automático de Validación de Datos
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Se detectaron datos incompletos o inconsistencias antes de agregar los registros al estado global.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar reporte de validación"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Filas Evaluadas
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                {summary.totalRowsEvaluated}
              </div>
              {(summary.emptyRowsSkipped > 0 ||
                summary.summaryRowsSkipped > 0) && (
                <div className="text-[11px] text-slate-500 mt-1">
                  Omitidas: {summary.emptyRowsSkipped} vacías ·{' '}
                  {summary.summaryRowsSkipped} totales
                </div>
              )}
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
              <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completos (Válidos)</span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-900 mt-1">
                {summary.cleanCount}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                Listos sin observaciones
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
              <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Datos Incompletos</span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-900 mt-1">
                {summary.warningOnlyCount}
              </div>
              <div className="text-[11px] text-amber-800 mt-1">
                Sin fecha, territorio o peso en 0
              </div>
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5">
              <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                <span>Errores Críticos</span>
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-rose-900 mt-1">
                {summary.errorCount}
              </div>
              <div className="text-[11px] text-rose-800 mt-1">
                Bloqueados (negativos o texto)
              </div>
            </div>
          </div>

          {/* Anomaly Type Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() =>
                setCategoryFilter((prev) => (prev === 'date' ? 'all' : 'date'))
              }
              className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                categoryFilter === 'date'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <CalendarX className="w-3.5 h-3.5 text-amber-600" />
                  Sin fecha / inválida
                </span>
                <span className="font-mono tabular-nums text-xs font-bold text-slate-900">
                  {totalDateIssues}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setCategoryFilter((prev) =>
                  prev === 'negative' ? 'all' : 'negative'
                )
              }
              className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                categoryFilter === 'negative'
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                  Valores negativos
                </span>
                <span className="font-mono tabular-nums text-xs font-bold text-slate-900">
                  {totalNegativeIssues}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setCategoryFilter((prev) =>
                  prev === 'text_numeric' ? 'all' : 'text_numeric'
                )
              }
              className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                categoryFilter === 'text_numeric'
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-rose-600" />
                  Texto en numéricos
                </span>
                <span className="font-mono tabular-nums text-xs font-bold text-slate-900">
                  {totalTextNumericIssues}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setCategoryFilter((prev) =>
                  prev === 'incomplete_meta' ? 'all' : 'incomplete_meta'
                )
              }
              className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                categoryFilter === 'incomplete_meta'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                  Otros incompletos
                </span>
                <span className="font-mono tabular-nums text-xs font-bold text-slate-900">
                  {totalMetaIssues}
                </span>
              </div>
            </button>
          </div>

          {/* Filter Bar + Export Findings */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSeverityFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  severityFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({summary.itemsWithIssues.length})
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('error')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  severityFilter === 'error'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Errores Críticos ({summary.errorCount})
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('warning')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  severityFilter === 'warning'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Incompletos ({summary.warningOnlyCount})
              </button>
              {categoryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-cyan-700 hover:bg-white transition-colors cursor-pointer"
                >
                  Ver todas las causas
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                exportValidationReportToExcel(summary.itemsWithIssues)
              }
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-cyan-700" />
              <span>Exportar Reporte (.xlsx)</span>
            </button>
          </div>

          {/* Detailed Findings Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      Archivo / Fila
                    </th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      Referencia
                    </th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      Estado
                    </th>
                    <th className="py-2.5 px-3 font-semibold">
                      Hallazgos Detectados
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-500"
                      >
                        No hay registros en esta categoría de filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.slice(0, 150).map((item) => (
                      <tr
                        key={`${item.fileName}-${item.rowNumber}-${item.record.id}`}
                        className="hover:bg-slate-50/70 align-top"
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">
                            Fila {item.rowNumber}
                          </div>
                          <div
                            className="text-[11px] text-slate-500 max-w-[150px] truncate"
                            title={item.fileName}
                          >
                            {item.fileName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {item.record.municipio}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.record.especie} ·{' '}
                            {item.record.fecha || 'Sin fecha'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {item.hasErrors ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold text-[11px]">
                              <XCircle className="w-3 h-3" />
                              Error crítico
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold text-[11px]">
                              <AlertTriangle className="w-3 h-3" />
                              Incompleto
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <ul className="space-y-1">
                            {item.issues.map((issue, idx) => (
                              <li
                                key={`${issue.code}-${issue.field}-${idx}`}
                                className="flex flex-wrap items-center gap-1.5"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    issue.severity === 'error'
                                      ? 'bg-rose-600'
                                      : 'bg-amber-500'
                                  }`}
                                />
                                <span className="text-slate-800">
                                  {issue.message}
                                </span>
                                {issue.rawValue && (
                                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                    {issue.rawValue}
                                  </code>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredItems.length > 150 && (
              <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600">
                Mostrando las primeras 150 filas con observaciones de{' '}
                {filteredItems.length}. Usa &quot;Exportar Reporte (.xlsx)&quot; para ver el detalle completo.
              </div>
            )}
          </div>
        </div>

        {/* Footer Decision Controls */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-600">
            {summary.safeRecordsWithoutErrors.length === 0
              ? 'No hay registros libres de errores críticos para agregar al estado global. Corrige el archivo Excel e inténtalo de nuevo.'
              : summary.errorCount > 0
              ? 'Los registros con valores negativos o texto en campos numéricos serán excluidos automáticamente para proteger la integridad de los cálculos.'
              : 'Elige si deseas importar únicamente registros completos o incluir también los registros con datos incompletos.'}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancelar carga
            </button>

            {canCommitWithoutErrors && (
              <button
                type="button"
                onClick={onCommitWithoutErrors}
                className="px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                {canCommitClean
                  ? `Importar sin errores críticos (${summary.safeRecordsWithoutErrors.length})`
                  : `Importar con advertencias (${summary.safeRecordsWithoutErrors.length})`}
              </button>
            )}

            {canCommitClean && (
              <button
                type="button"
                onClick={onCommitCleanOnly}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Importar solo completos ({summary.cleanCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
