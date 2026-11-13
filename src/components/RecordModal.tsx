import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { FisheryRecord } from '../types/fishery';

interface RecordModalProps {
  isOpen: boolean;
  initialRecord: FisheryRecord | null;
  onClose: () => void;
  onSave: (
    record: Omit<FisheryRecord, 'id' | 'archivoOrigen' | 'kilogramos'>,
    existingId?: string
  ) => void;
}

const MUNICIPIOS_BARINAS = [
  'Barinas',
  'Pedraza',
  'Sosa',
  'Rojas',
  'Alberto Arvelo Torrealba',
  'Arismendi',
  'Obispos',
  'Antonio José de Sucre',
  'Ezequiel Zamora',
  'Bolívar',
  'Cruz Paredes',
  'Andrés Eloy Blanco',
];

const ESPECIES_SUGERIDAS = [
  'Cachama Negra',
  'Coporo',
  'Bagre Rayado',
  'Pavón Cinchado',
  'Palometa Llanera',
  'Curito',
  'Morocoto',
  'Bocachico',
  'Caribe',
];

const MODALIDADES_PESCA = [
  'Feria / Jornada Social',
  'Acuicultura Continental',
  'Pesca Artesanal Fluvial',
  'Centro de Acopio',
];

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  initialRecord,
  onClose,
  onSave,
}) => {
  const [fecha, setFecha] = useState('2026-10-15');
  const [especie, setEspecie] = useState('Cachama Negra');
  const [municipio, setMunicipio] = useState('Barinas');
  const [parroquia, setParroquia] = useState('El Carmen');
  const [comuna, setComuna] = useState('Comuna Central');
  const [tipoPesca, setTipoPesca] = useState('Feria / Jornada Social');
  const [toneladas, setToneladas] = useState('4.50');
  const [familiasBeneficiadas, setFamiliasBeneficiadas] = useState('1125');
  const [puntoDistribucion, setPuntoDistribucion] = useState(
    'Feria Soberana Municipal'
  );

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFormError(null);
    if (initialRecord) {
      setFecha(initialRecord.fecha);
      setEspecie(initialRecord.especie);
      setMunicipio(initialRecord.municipio);
      setParroquia(initialRecord.parroquia);
      setComuna(initialRecord.comuna || '');
      setTipoPesca(initialRecord.tipoPesca);
      setToneladas(String(initialRecord.toneladas));
      setFamiliasBeneficiadas(String(initialRecord.familiasBeneficiadas));
      setPuntoDistribucion(initialRecord.puntoDistribucion);
    } else {
      setFecha(new Date().toISOString().slice(0, 10));
      setEspecie('Cachama Negra');
      setMunicipio('Barinas');
      setParroquia('Alto Barinas');
      setComuna('');
      setTipoPesca('Feria / Jornada Social');
      setToneladas('3.50');
      setFamiliasBeneficiadas('875');
      setPuntoDistribucion('Punto Soberano Comunal');
    }
  }, [initialRecord, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fecha.trim()) {
      setFormError('Debes indicar una fecha válida para la jornada.');
      return;
    }

    const parsedTons = Number(toneladas);
    if (!Number.isFinite(parsedTons) || parsedTons <= 0) {
      setFormError(
        'El volumen en toneladas debe ser un valor numérico positivo mayor a 0.'
      );
      return;
    }

    const parsedFamilias = Number(familiasBeneficiadas);
    if (!Number.isFinite(parsedFamilias) || parsedFamilias < 0) {
      setFormError(
        'Las familias beneficiadas deben ser un número entero igual o mayor a 0.'
      );
      return;
    }

    onSave(
      {
        fecha,
        especie: especie.trim() || 'Cachama Negra',
        municipio,
        parroquia: parroquia.trim() || `Casco Central ${municipio}`,
        comuna: comuna.trim() || '-',
        tipoPesca,
        toneladas: +parsedTons.toFixed(4),
        familiasBeneficiadas: Math.round(parsedFamilias),
        puntoDistribucion:
          puntoDistribucion.trim() || `Jornada Soberana ${municipio}`,
      },
      initialRecord?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">
              {initialRecord
                ? 'Editar Registro Pesquero'
                : 'Registrar Nueva Jornada / Captura'}
            </h3>
            <p className="text-xs text-slate-300">
              Observatorio de Pesca y Acuicultura · Región Barinas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {formError && (
            <div
              role="alert"
              className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-800 font-medium"
            >
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fecha de la Jornada
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono tabular-nums text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Especie Hidrobiológica
              </label>
              <input
                type="text"
                list="especies-list"
                required
                value={especie}
                onChange={(e) => setEspecie(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              />
              <datalist id="especies-list">
                {ESPECIES_SUGERIDAS.map((esp) => (
                  <option key={esp} value={esp} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Municipio
              </label>
              <select
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              >
                {MUNICIPIOS_BARINAS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Parroquia
              </label>
              <input
                type="text"
                required
                value={parroquia}
                onChange={(e) => setParroquia(e.target.value)}
                placeholder="Ej. Alto Barinas"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Comuna / Sector
              </label>
              <input
                type="text"
                value={comuna}
                onChange={(e) => setComuna(e.target.value)}
                placeholder="Ej. Comuna Chávez Frías"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Modalidad / Tipo de Pesca
              </label>
              <select
                value={tipoPesca}
                onChange={(e) => setTipoPesca(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              >
                {MODALIDADES_PESCA.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Volumen (Toneladas Métricas)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={toneladas}
                onChange={(e) => setToneladas(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono tabular-nums text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Familias Beneficiadas
              </label>
              <input
                type="number"
                min="0"
                required
                value={familiasBeneficiadas}
                onChange={(e) => setFamiliasBeneficiadas(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono tabular-nums text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Punto de Distribución / Centro
              </label>
              <input
                type="text"
                required
                value={puntoDistribucion}
                onChange={(e) => setPuntoDistribucion(e.target.value)}
                placeholder="Ej. Plaza Bolívar / CONPPA"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{initialRecord ? 'Guardar Cambios' : 'Agregar al Consolidado'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
