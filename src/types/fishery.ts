export interface FisheryRecord {
  id: string;
  fecha: string; // YYYY-MM-DD or '' if no date column in Excel
  especie: string;
  municipio: string;
  parroquia: string;
  comuna: string;
  tipoPesca: string;
  toneladas: number; // Exact metric tons (without premature rounding)
  kilogramos: number; // Exact kilograms (without premature rounding)
  familiasBeneficiadas: number; // 0 if not present in Excel (never fabricated)
  puntoDistribucion: string;
  archivoOrigen: string;
  /** Exact key-value pairs of all columns from the uploaded Excel row */
  rawFields?: Record<string, string>;
  /** Exact numeric values parsed from every numeric column in the Excel row */
  numericFields?: Record<string, number>;
}

export interface UploadedFileMeta {
  id: string;
  name: string;
  uploadedAt: string;
  recordCount: number;
  totalToneladas: number;
  totalKilogramos: number;
  sizeKB: number;
  columns: string[];
  numericColumns: string[];
  detectedWeightColumn?: string;
  detectedWeightUnit?: 'kg' | 'tm' | 'none';
}

export interface FilterState {
  search: string;
  searchColumn: string;
  especie: string;
  municipio: string;
  parroquia: string;
  comuna: string;
  tipoPesca: string[];
  fechaInicio: string;
  fechaFin: string;
  archivoOrigen: string;
  /** Dynamic filters keyed by exact Excel column header name */
  customFields: Record<string, string>;
}

export type ValidationIssueCode =
  | 'missing_date'
  | 'invalid_date'
  | 'negative_toneladas'
  | 'negative_kilogramos'
  | 'negative_families'
  | 'negative_numeric'
  | 'text_in_numeric_field'
  | 'missing_municipio'
  | 'missing_especie'
  | 'zero_weight';

export type ValidationSeverity = 'error' | 'warning';

export interface RecordValidationIssue {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  field: string;
  rawValue: string;
  message: string;
}

export interface ValidatedRecordItem {
  record: FisheryRecord;
  rowNumber: number;
  fileName: string;
  issues: RecordValidationIssue[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

export interface BatchValidationSummary {
  totalRowsEvaluated: number;
  emptyRowsSkipped: number;
  summaryRowsSkipped: number;
  cleanCount: number;
  warningOnlyCount: number;
  errorCount: number;
  issueCounts: Record<ValidationIssueCode, number>;
  itemsWithIssues: ValidatedRecordItem[];
  cleanRecords: FisheryRecord[];
  safeRecordsWithoutErrors: FisheryRecord[];
  pendingFilesMeta: UploadedFileMeta[];
}

