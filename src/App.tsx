import React, { useState, useEffect, useMemo } from 'react';
import { FilterState, FisheryRecord, UploadedFileMeta } from './types/fishery';
import { DEMO_RECORDS, parseExcelBuffer } from './data/demoData';
import { HeroLanding } from './components/HeroLanding';
import { DashboardView } from './components/DashboardView';
import { StickyFooter } from './components/StickyFooter';

const STORAGE_RECORDS_KEY = 'vcp_barinas_uploaded_records_v1';
const STORAGE_FILES_KEY = 'vcp_barinas_uploaded_files_v1';
const STORAGE_GOAL_KEY = 'vcp_barinas_goal_tons_v1';

const INITIAL_FILTERS: FilterState = {
  search: '',
  especie: 'Todas',
  municipio: 'Todos',
  tipoPesca: [],
  fechaInicio: '',
  fechaFin: '',
  archivoOrigen: 'Todos',
};

export default function App() {
  const [currentView, setCurrentView] = useState<'hero' | 'dashboard'>('hero');

  // Persisted cumulative uploaded records
  const [uploadedRecords, setUploadedRecords] = useState<FisheryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECORDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
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
    return 120;
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

  // If no Excel files or custom records have been saved yet, show realistic Barinas demo data
  const isUsingDemoData =
    uploadedFiles.length === 0 && uploadedRecords.length === 0;
  const activeRecords = useMemo(() => {
    return isUsingDemoData ? DEMO_RECORDS : uploadedRecords;
  }, [isUsingDemoData, uploadedRecords]);

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

        const parsedRecords = parseExcelBuffer(buffer, effectiveFileName);

        if (parsedRecords.length > 0) {
          const fileToneladas = parsedRecords.reduce(
            (sum, r) => sum + r.toneladas,
            0
          );
          const nowStr = new Date().toLocaleTimeString('es-VE', {
            hour: '2-digit',
            minute: '2-digit',
          });

          newRecordsBatch.push(...parsedRecords);
          newFilesBatch.push({
            id: `file-${Date.now()}-${i}`,
            name: effectiveFileName,
            uploadedAt: nowStr,
            recordCount: parsedRecords.length,
            totalToneladas: +fileToneladas.toFixed(2),
            sizeKB: Math.max(1, Math.round(file.size / 1024)),
          });
        }
      }

      if (newRecordsBatch.length === 0) {
        setUploadFeedback({
          type: 'error',
          message:
            'No se encontraron filas válidas en el archivo seleccionado. Verifica que contenga datos.',
        });
      } else {
        setUploadedRecords((prev) => [...prev, ...newRecordsBatch]);
        setUploadedFiles((prev) => [...prev, ...newFilesBatch]);

        const addedTons = newRecordsBatch.reduce((s, r) => s + r.toneladas, 0);
        setUploadFeedback({
          type: 'success',
          message: `Se acumularon +${newRecordsBatch.length} registros (+${addedTons.toFixed(
            2
          )} TM) de ${newFilesBatch.length} ${
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
    data: Omit<FisheryRecord, 'id' | 'archivoOrigen'>,
    existingId?: string
  ) => {
    const basePool = isUsingDemoData ? [...DEMO_RECORDS] : [...uploadedRecords];

    if (existingId) {
      const updated = basePool.map((rec) =>
        rec.id === existingId ? { ...rec, ...data } : rec
      );
      setUploadedRecords(updated);
      setUploadFeedback({
        type: 'success',
        message: `Registro actualizado (${data.especie} · ${data.municipio}).`,
      });
    } else {
      const newRec: FisheryRecord = {
        ...data,
        id: `manual-${Date.now()}`,
        archivoOrigen: 'Registro Manual',
      };
      setUploadedRecords([newRec, ...basePool]);
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
    const basePool = isUsingDemoData ? [...DEMO_RECORDS] : [...uploadedRecords];
    const nextPool = basePool.filter((r) => r.id !== id);
    setUploadedRecords(nextPool);
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

  // Clear all uploaded files history and return to demo dataset
  const handleClearAllHistory = () => {
    setUploadedFiles([]);
    setUploadedRecords([]);
    setFilters(INITIAL_FILTERS);
    localStorage.removeItem(STORAGE_RECORDS_KEY);
    localStorage.removeItem(STORAGE_FILES_KEY);
    setUploadFeedback({
      type: 'success',
      message:
        'Historial de archivos limpiado. Mostrando datos de demostración de Barinas.',
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
          records={activeRecords}
          uploadedFiles={uploadedFiles}
          isUsingDemoData={isUsingDemoData}
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
