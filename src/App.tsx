import React, { useState, useEffect } from 'react';
import { FilterState, FisheryRecord, UploadedFileMeta } from './types/fishery';
import { parseExcelBuffer, isValidFisheryRecord } from './data/demoData';
import { HeroLanding } from './components/HeroLanding';
import { DashboardView } from './components/DashboardView';
import { StickyFooter } from './components/StickyFooter';

const STORAGE_RECORDS_KEY = 'vcp_barinas_uploaded_records_v3';
const STORAGE_FILES_KEY = 'vcp_barinas_uploaded_files_v3';
const STORAGE_GOAL_KEY = 'vcp_barinas_goal_tons_v3';

const INITIAL_FILTERS: FilterState = {
  search: '',
  searchColumn: 'Todos',
  especie: 'Todas',
  municipio: 'Todos',
  parroquia: 'Todas',
  comuna: 'Todas',
  tipoPesca: [],
  fechaInicio: '',
  fechaFin: '',
  archivoOrigen: 'Todos',
  customFields: {},
};

export default function App() {
  const [currentView, setCurrentView] = useState<'hero' | 'dashboard'>('hero');

  // Starts at 0 (empty array) until the user attaches an Excel file
  const [uploadedRecords, setUploadedRecords] = useState<FisheryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECORDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(isValidFisheryRecord);
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  // Persisted list of uploaded Excel files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return [];
  });

  // Persisted regional goal in Metric Tons
  const [regionalGoalTons, setRegionalGoalTons] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_GOAL_KEY);
      if (saved) {
        const num = parseFloat(saved);
        if (!isNaN(num) && num > 0) return num;
      }
    } catch {
      // Ignore storage errors
    }
    return 100;
  });

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Sync cumulative state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(uploadedRecords));
      localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(uploadedFiles));
    } catch {
      // Ignore quota errors
    }
  }, [uploadedRecords, uploadedFiles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_GOAL_KEY, String(regionalGoalTons));
    } catch {
      // Ignore storage errors
    }
  }, [regionalGoalTons]);

  // Cumulative Excel File Upload Handler
  const handleUploadFiles = async (fileList: FileList) => {
    setIsUploading(true);
    setUploadFeedback(null);

    const newRecordsBatch: FisheryRecord[] = [];
    const newFilesBatch: UploadedFileMeta[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const buffer = await file.arrayBuffer();

        const duplicateCount =
          uploadedFiles.filter((f) =>
            f.name.startsWith(file.name.replace(/\.[^/.]+$/, ''))
          ).length +
          newFilesBatch.filter((f) =>
            f.name.startsWith(file.name.replace(/\.[^/.]+$/, ''))
          ).length;

        const effectiveFileName =
          duplicateCount > 0
            ? `${file.name.replace(/(\.[^/.]+)$/, '')} (${duplicateCount + 1})${
                file.name.match(/(\.[^/.]+)$/)?.[0] || '.xlsx'
              }`
            : file.name;

        const parsed = parseExcelBuffer(buffer, effectiveFileName);

        if (parsed.records.length > 0) {
          const fileToneladas = parsed.records.reduce(
            (sum, r) => sum + r.toneladas,
            0
          );
          const fileKilogramos = parsed.records.reduce(
            (sum, r) => sum + r.kilogramos,
            0
          );
          const nowStr = new Date().toLocaleTimeString('es-VE', {
            hour: '2-digit',
            minute: '2-digit',
          });

          newRecordsBatch.push(...parsed.records);
          newFilesBatch.push({
            id: `file-${Date.now()}-${i}`,
            name: effectiveFileName,
            uploadedAt: nowStr,
            recordCount: parsed.records.length,
            totalToneladas: +fileToneladas.toFixed(3),
            totalKilogramos: +fileKilogramos.toFixed(2),
            sizeKB: Math.max(1, Math.round(file.size / 1024)),
            columns: parsed.columns,
            numericColumns: parsed.numericColumns,
            detectedWeightColumn: parsed.detectedWeightColumn,
            detectedWeightUnit: parsed.detectedWeightUnit,
          });
        }
      }

      if (newRecordsBatch.length === 0) {
        setUploadFeedback({
          type: 'error',
          message:
            'No se encontraron filas válidas en el archivo seleccionado. Verifica que contenga una tabla con encabezados y registros.',
        });
      } else {
        setUploadedRecords((prev) => [...prev, ...newRecordsBatch]);
        setUploadedFiles((prev) => [...prev, ...newFilesBatch]);

        const addedKg = newRecordsBatch.reduce((s, r) => s + r.kilogramos, 0);
        const addedTons = newRecordsBatch.reduce((s, r) => s + r.toneladas, 0);
        setUploadFeedback({
          type: 'success',
          message: `Se cargaron ${newRecordsBatch.length} registros exactos (${addedKg.toLocaleString(
            'es-VE',
            { maximumFractionDigits: 2 }
          )} Kg · ${addedTons.toFixed(2)} TM) desde ${newFilesBatch.length} ${
            newFilesBatch.length === 1 ? 'archivo' : 'archivos'
          }.`,
        });
      }
    } catch {
      setUploadFeedback({
        type: 'error',
        message:
          'Error al leer el archivo Excel. Asegúrate de subir un formato .xlsx o .xls válido.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Save a manual record or edit an existing row
  const handleSaveManualRecord = (
    data: Omit<FisheryRecord, 'id' | 'archivoOrigen' | 'kilogramos'>,
    existingId?: string
  ) => {
    const kilogramos = +(data.toneladas * 1000).toFixed(2);
    if (existingId) {
      setUploadedRecords((prev) =>
        prev.map((rec) =>
          rec.id === existingId
            ? {
                ...rec,
                ...data,
                kilogramos,
                rawFields: {
                  ...(rec.rawFields || {}),
                  Fecha: data.fecha,
                  Especie: data.especie,
                  Municipio: data.municipio,
                  Parroquia: data.parroquia,
                  Comuna: data.comuna,
                  Modalidad: data.tipoPesca,
                  'Kilogramos (Kg)': String(kilogramos),
                  'Toneladas (TM)': String(data.toneladas),
                  'Familias Beneficiadas': String(data.familiasBeneficiadas),
                  'Punto de Distribución': data.puntoDistribucion,
                },
              }
            : rec
        )
      );
      setUploadFeedback({
        type: 'success',
        message: `Registro actualizado (${data.especie} · ${data.municipio}).`,
      });
    } else {
      const newRec: FisheryRecord = {
        ...data,
        kilogramos,
        id: `manual-${Date.now()}`,
        archivoOrigen: 'Registro Manual',
        rawFields: {
          Fecha: data.fecha,
          Municipio: data.municipio,
          Parroquia: data.parroquia,
          Comuna: data.comuna,
          Especie: data.especie,
          Modalidad: data.tipoPesca,
          'Punto de Distribución': data.puntoDistribucion,
          'Kilogramos (Kg)': String(kilogramos),
          'Toneladas (TM)': String(data.toneladas),
          'Familias Beneficiadas': String(data.familiasBeneficiadas),
        },
        numericFields: {
          'Kilogramos (Kg)': kilogramos,
          'Toneladas (TM)': data.toneladas,
          'Familias Beneficiadas': data.familiasBeneficiadas,
        },
      };
      setUploadedRecords((prev) => [newRec, ...prev]);
      setUploadFeedback({
        type: 'success',
        message: `Jornada registrada manualmente (+${data.toneladas.toFixed(
          2
        )} TM en ${data.municipio}).`,
      });
    }
  };

  // Delete an individual record row
  const handleDeleteRecord = (id: string) => {
    setUploadedRecords((prev) => prev.filter((r) => r.id !== id));
    setUploadFeedback({
      type: 'success',
      message: 'Fila eliminada del registro consolidado.',
    });
  };

  // Remove a single uploaded file from the cumulative pool
  const handleRemoveSingleFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== fileName));
    setUploadedRecords((prev) =>
      prev.filter((r) => r.archivoOrigen !== fileName)
    );
    if (filters.archivoOrigen === fileName) {
      setFilters((prev) => ({ ...prev, archivoOrigen: 'Todos' }));
    }
    setUploadFeedback({
      type: 'success',
      message: `Archivo "${fileName}" removido del consolidado.`,
    });
  };

  // Clear all uploaded files history and return to 0
  const handleClearAllHistory = () => {
    setUploadedFiles([]);
    setUploadedRecords([]);
    setFilters(INITIAL_FILTERS);
    localStorage.removeItem(STORAGE_RECORDS_KEY);
    localStorage.removeItem(STORAGE_FILES_KEY);
    setUploadFeedback({
      type: 'success',
      message: 'Historial limpiado. Todos los indicadores están en cero (0).',
    });
  };

  const handleUpdateFilters = (next: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {currentView === 'hero' ? (
        <HeroLanding
          onEnterDashboard={() => {
            setCurrentView('dashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : (
        <DashboardView
          onBackToHero={() => {
            setCurrentView('hero');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          records={uploadedRecords}
          uploadedFiles={uploadedFiles}
          onUploadFiles={handleUploadFiles}
          onRemoveSingleFile={handleRemoveSingleFile}
          onClearAllHistory={handleClearAllHistory}
          onSaveManualRecord={handleSaveManualRecord}
          onDeleteRecord={handleDeleteRecord}
          regionalGoalTons={regionalGoalTons}
          onUpdateRegionalGoal={setRegionalGoalTons}
          filters={filters}
          onUpdateFilters={handleUpdateFilters}
          onResetFilters={handleResetFilters}
          isUploading={isUploading}
          uploadFeedback={uploadFeedback}
        />
      )}

      {/* Cintillo Inferior Global (Sticky Footer Always Visible) */}
      <StickyFooter />
    </div>
  );
}
