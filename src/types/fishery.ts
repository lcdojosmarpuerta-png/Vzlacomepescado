export interface FisheryRecord {
  id: string;
  fecha: string; // YYYY-MM-DD
  especie: string;
  municipio: string;
  parroquia: string;
  tipoPesca: string;
  toneladas: number;
  familiasBeneficiadas: number;
  puntoDistribucion: string;
  archivoOrigen: string;
  /** Exact key-value pairs of all columns from the uploaded Excel row */
  rawFields?: Record<string, string>;
}

export interface UploadedFileMeta {
  id: string;
  name: string;
  uploadedAt: string;
  recordCount: number;
  totalToneladas: number;
  sizeKB: number;
  columns: string[];
}

export interface FilterState {
  search: string;
  especie: string;
  municipio: string;
  tipoPesca: string[];
  fechaInicio: string;
  fechaFin: string;
  archivoOrigen: string;
  /** Dynamic filters keyed by exact Excel column header name */
  customFields: Record<string, string>;
}
