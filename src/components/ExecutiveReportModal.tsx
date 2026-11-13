import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { FisheryRecord } from '../types/fishery';
import { OfficialLogo } from './OfficialLogo';
import { exportRecordsToExcel, normalizeMunicipioBarinas } from '../data/demoData';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: FisheryRecord[];
  regionalGoalTons: number;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  records,
  regionalGoalTons,
}) => {
  if (!isOpen) return null;

  const totalToneladas = records.reduce((acc, r) => acc + r.toneladas, 0);
  const totalKilogramos = records.reduce(
    (acc, r) => acc + (r.kilogramos ?? r.toneladas * 1000),
    0
  );
  const totalFamilias = records.reduce(
    (acc, r) => acc + r.familiasBeneficiadas,
    0
  );
  const avgKgPerFamily =
    totalFamilias > 0 ? (totalKilogramos / totalFamilias).toFixed(2) : '0.00';
  const goalPct =
    regionalGoalTons > 0 && totalToneladas > 0
      ? Math.min(100, +((totalToneladas / regionalGoalTons) * 100).toFixed(1))
      : 0;

  // Group by Municipality
  const byMunicipio = Array.from(
    records.reduce((map, r) => {
      const munName =
        r.municipio === 'No especificado'
          ? 'No especificado'
          : normalizeMunicipioBarinas(r.municipio);
      const cur = map.get(munName) || {
        toneladas: 0,
        familias: 0,
        jornadas: 0,
      };
      cur.toneladas += r.toneladas;
      cur.familias += r.familiasBeneficiadas;
      cur.jornadas += 1;
      map.set(munName, cur);
      return map;
    }, new Map<string, { toneladas: number; familias: number; jornadas: number }>())
  ).sort((a, b) => b[1].toneladas - a[1].toneladas);

  // Group by Species
  const bySpecies = Array.from(
    records.reduce((map, r) => {
      const cur = map.get(r.especie) || { toneladas: 0, jornadas: 0 };
      cur.toneladas += r.toneladas;
      cur.jornadas += 1;
      map.set(r.especie, cur);
      return map;
    }, new Map<string, { toneladas: number; jornadas: number }>())
  ).sort((a, b) => b[1].toneladas - a[1].toneladas);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs print:hidden"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 print:shadow-none print:border-none print:m-0 print:max-w-none">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 print:hidden">
          <div>
            <h3 className="text-base font-bold">
              Informe Ejecutivo Institucional · Vista Previa
            </h3>
            <p className="text-xs text-slate-300">
              Formato listo para impresión en papel o guardado directo como PDF
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportRecordsToExcel(records)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Institutional Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-900">
            <div className="flex items-center gap-4">
              <OfficialLogo className="h-20 w-auto object-contain" />
              <div>
                <p className="text-xs font-bold text-cyan-800 tracking-tight">
                  REPÚBLICA BOLIVARIANA DE VENEZUELA · ESTADO BARINAS
                </p>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Venezuela Come + Pescado (Región Barinas)
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-600">
                  Coordinación de Observatorio de Pesca y Acuicultura — Balance Consolidado
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right font-mono tabular-nums text-xs text-slate-600">
              <div>
                Fecha de Emisión: <strong>{new Date().toISOString().slice(0, 10)}</strong>
              </div>
              <div>
                Registros Analizados: <strong>{records.length} jornadas</strong>
              </div>
              <div>
                Cumplimiento de Meta: <strong>{goalPct}% de {regionalGoalTons} TM</strong>
              </div>
            </div>
          </div>

          {/* Executive KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">
                Volumen Total Distribuido
              </div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                {totalToneladas.toFixed(2)} TM
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500">
                {totalKilogramos.toLocaleString('es-VE')} Kilogramos
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">
                Familias Beneficiadas
              </div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                {totalFamilias.toLocaleString('es-VE')}
              </div>
              <div className="text-[11px] text-slate-500">
                Atención directa comunitaria
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">
                Promedio Proteico / Hogar
              </div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                {avgKgPerFamily} Kg
              </div>
              <div className="text-[11px] text-slate-500">
                Por familia atendida
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">
                Cobertura Territorial
              </div>
              <div className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
                {byMunicipio.length} Municipios
              </div>
              <div className="text-[11px] text-slate-500">
                {bySpecies.length} especies registradas
              </div>
            </div>
          </div>

          {/* Two Summary Tables: By Municipality & By Species */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2 pb-1 border-b border-slate-200">
                Desglose por Municipio (Estado Barinas)
              </h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold">
                    <th className="py-2 px-3 text-left">Municipio</th>
                    <th className="py-2 px-3 text-right">Jornadas</th>
                    <th className="py-2 px-3 text-right">Familias</th>
                    <th className="py-2 px-3 text-right">Volumen (TM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  {byMunicipio.map(([mun, data]) => (
                    <tr key={mun}>
                      <td className="py-1.5 px-3 font-sans font-medium text-slate-800">
                        {mun}
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-600">
                        {data.jornadas}
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-600">
                        {data.familias.toLocaleString('es-VE')}
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                        {data.toneladas.toFixed(2)} TM
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2 pb-1 border-b border-slate-200">
                Desglose por Especie Hidrobiológica
              </h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold">
                    <th className="py-2 px-3 text-left">Especie</th>
                    <th className="py-2 px-3 text-right">Jornadas</th>
                    <th className="py-2 px-3 text-right">% Aporte</th>
                    <th className="py-2 px-3 text-right">Volumen (TM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  {bySpecies.map(([esp, data]) => {
                    const pct =
                      totalToneladas > 0
                        ? ((data.toneladas / totalToneladas) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <tr key={esp}>
                        <td className="py-1.5 px-3 font-sans font-medium text-slate-800">
                          {esp}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-600">
                          {data.jornadas}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-600">
                          {pct}%
                        </td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                          {data.toneladas.toFixed(2)} TM
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Block */}
          <div className="pt-10 mt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="w-56 mx-auto border-b border-slate-400 mb-2 h-8" />
              <p className="font-bold text-slate-900">
                Coordinación Regional del Observatorio
              </p>
              <p>Pesca y Acuicultura · Estado Barinas</p>
            </div>
            <div>
              <div className="w-56 mx-auto border-b border-slate-400 mb-2 h-8" />
              <p className="font-bold text-slate-900">
                Operación Venezuela Come + Pescado
              </p>
              <p>Validación Estadística y Control de Distribución</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
