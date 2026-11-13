import React, { useState, useEffect } from 'react';
import {
  BatchValidationSummary,
  FilterState,
  FisheryRecord,
  UploadedFileMeta,
  ValidatedRecordItem,
} from './types/fishery';
import {
  buildBatchValidationSummary,
  isValidFisheryRecord,
  parseExcelBuffer,
  validateFisheryRecord,
} from './data/demoData';
import { HeroLanding } from './components/HeroLanding';
import { DashboardView } from './components/DashboardView';
import { StickyFooter } from './components/StickyFooter';
import { ValidationReportModal } from './components/ValidationReportModal';

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
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [pendingValidation, setPendingValidation] =
    useState<BatchValidationSummary | null>(null);

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

  // Commits a validated subset of records and updates file metadata accordingly
  const commitValidatedBatch = (
    recordsToCommit: FisheryRecord[],
    candidateFilesMeta: UploadedFileMeta[],
    summary: BatchValidationSummary
  ) => {
    if (recordsToCommit.length === 0) {
      setPendingValidation(null);
      setUploadFeedback({
        type: 'error',
        message:
          'No se agregaron registros al estado global porque no quedaron filas válidas tras la validación.',
      });
      return;
    }

    const recordsByFile = new Map<string, FisheryRecord[]>();
    recordsToCommit.forEach((rec) => {
      const list = recordsByFile.get(rec.archivoOrigen) || [];
      list.push(rec);
      recordsByFile.set(rec.archivoOrigen, list);
    });

    const finalFilesMeta: UploadedFileMeta[] = [];
    candidateFilesMeta.forEach((meta) => {
      const fileRecs = recordsByFile.get(meta.name);
      if (!fileRecs || fileRecs.length === 0) return;
      const fileToneladas = fileRecs.reduce((sum, r) => sum + r.toneladas, 0);
      const fileKilogramos = fileRecs.reduce((sum, r) => sum + r.kilogramos, 0);
      finalFilesMeta.push({
        ...meta,
        recordCount: fileRecs.length,
        totalToneladas: +fileToneladas.toFixed(3),
        totalKilogramos: +fileKilogramos.toFixed(2),
      });
    });

    setUploadedRecords((prev) => [...prev, ...recordsToCommit]);
    setUploadedFiles((prev) => [...prev, ...finalFilesMeta]);
    setPendingValidation(null);

    const addedKg = recordsToCommit.reduce((s, r) => s + r.kilogramos, 0);
    const addedTons = recordsToCommit.reduce((s, r) => s + r.toneladas, 0);
    const omittedCount = summary.totalRowsEvaluated - recordsToCommit.length;

    if (omittedCount > 0) {
      setUploadFeedback({
        type: 'warning',
        message: `Se cargaron ${recordsToCommit.length} registros válidos (${addedKg.toLocaleString(
          'es-VE',
          { maximumFractionDigits: 2 }
        )} Kg · ${addedTons.toFixed(
          2
        )} TM). Se excluyeron ${omittedCount} ${
          omittedCount === 1 ? 'fila con observaciones' : 'filas con observaciones'
        } detectadas en la validación.`,
      });
    } else {
      setUploadFeedback({
        type: 'success',
        message: `Se cargaron ${recordsToCommit.length} registros exactos (${addedKg.toLocaleString(
          'es-VE',
          { maximumFractionDigits: 2 }
        )} Kg · ${addedTons.toFixed(2)} TM) desde ${finalFilesMeta.length} ${
          finalFilesMeta.length === 1 ? 'archivo' : 'archivos'
        }.`,
      });
    }
  };

  // Cumulative Excel File Upload Handler with Automatic Pre-State Validation
  const handleUploadFiles = async (fileList: FileList) => {
    setIsUploading(true);
    setUploadFeedback(null);

    const allValidatedItems: ValidatedRecordItem[] = [];
    const pendingFilesBatch: UploadedFileMeta[] = [];
    let totalEmptySkipped = 0;
    let totalSummarySkipped = 0;

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const buffer = await file.arrayBuffer();

        const duplicateCount =
          uploadedFiles.filter((f) =>
            f.name.startsWith(file.name.replace(/\.[^/.]+$/, ''))
          ).length +
          pendingFilesBatch.filter((f) =>
            f.name.startsWith(file.name.replace(/\.[^/.]+$/, ''))
          ).length;

        const effectiveFileName =
          duplicateCount > 0
            ? `${file.name.replace(/(\.[^/.]+)$/, '')} (${duplicateCount + 1})${
                file.name.match(/(\.[^/.]+)$/)?.[0] || '.xlsx'
              }`
            : file.name;

        const parsed = parseExcelBuffer(buffer, effectiveFileName);
        totalEmptySkipped += parsed.emptyRowsSkipped;
        totalSummarySkipped += parsed.summaryRowsSkipped;

        if (parsed.validatedItems.length > 0) {
          const nowStr = new Date().toLocaleTimeString('es-VE', {
            hour: '2-digit',
            minute: '2-digit',
          });

          allValidatedItems.push(...parsed.validatedItems);
          pendingFilesBatch.push({
            id: `file-${Date.now()}-${i}`,
            name: effectiveFileName,
            uploadedAt: nowStr,
            recordCount: parsed.records.length,
            totalToneladas: 0,
            totalKilogramos: 0,
            sizeKB: Math.max(1, Math.round(file.size / 1024)),
            columns: parsed.columns,
            numericColumns: parsed.numericColumns,
            detectedWeightColumn: parsed.detectedWeightColumn,
            detectedWeightUnit: parsed.detectedWeightUnit,
          });
        }
      }

      if (allValidatedItems.length === 0) {
        setUploadFeedback({
          type: 'error',
          message:
            'No se encontraron filas válidas en el archivo seleccionado. Verifica que contenga una tabla con encabezados y registros.',
        });
      } else {
        const summary = buildBatchValidationSummary(
          allValidatedItems,
          pendingFilesBatch,
          totalEmptySkipped,
          totalSummarySkipped
        );

        // If any incomplete fields, missing dates, negative values, or text-in-numeric cells are detected,
        // report them automatically BEFORE adding records to global state.
        if (summary.itemsWithIssues.length > 0) {
          setPendingValidation(summary);
          setUploadFeedback({
            type: summary.errorCount > 0 ? 'error' : 'warning',
            message: `Validación previa: se detectaron ${summary.itemsWithIssues.length} filas con datos incompletos o inconsistencias (${summary.errorCount} errores críticos, ${summary.warningOnlyCount} incompletas). Revisa el reporte para confirmar la carga.`,
          });
        } else {
          commitValidatedBatch(summary.cleanRecords, pendingFilesBatch, summary);
        }
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

  // Save a manual record or edit an existing row (with pre-state validation)
  const handleSaveManualRecord = (
    data: Omit<FisheryRecord, 'id' | 'archivoOrigen' | 'kilogramos'>,
    existingId?: string
  ) => {
    const kilogramos = +(data.toneladas * 1000).toFixed(2);
    const candidate: FisheryRecord = {
      ...data,
      kilogramos,
      id: existingId || `manual-${Date.now()}`,
      archivoOrigen: 'Registro Manual',
    };

    const issues = validateFisheryRecord(candidate);
    const blockingErrors = issues.filter((i) => i.severity === 'error');
    if (blockingErrors.length > 0) {
      setUploadFeedback({
        type: 'error',
        message: `Registro rechazado: ${blockingErrors
          .map((e) => e.message)
          .join(' ')}`,
      });
      return;
    }

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
        ...candidate,
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

      {/* Pre-State Automatic Data Validation Report Modal */}
      <ValidationReportModal
        summary={pendingValidation}
        onCancel={() => {
          setPendingValidation(null);
          setUploadFeedback({
            type: 'warning',
            message:
              'Carga cancelada. Ningún registro con inconsistencias fue agregado al estado global.',
          });
        }}
        onCommitCleanOnly={() => {
          if (!pendingValidation) return;
          commitValidatedBatch(
            pendingValidation.cleanRecords,
            pendingValidation.pendingFilesMeta,
            pendingValidation
          );
        }}
        onCommitWithoutErrors={() => {
          if (!pendingValidation) return;
          commitValidatedBatch(
            pendingValidation.safeRecordsWithoutErrors,
            pendingValidation.pendingFilesMeta,
            pendingValidation
          );
        }}
      />

      {/* Cintillo Inferior Global (Sticky Footer Always Visible) */}
      <StickyFooter />
    </div>
  );
}
