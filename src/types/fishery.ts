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
}

export interface UploadedFileMeta {
  id: string;
  name: string;
  uploadedAt: string;
  recordCount: number;
  totalToneladas: number;
  sizeKB: number;
}

export interface FilterState {
  search: string;
  especie: string;
  municipio: string;
  tipoPesca: string[];
  fechaInicio: string;
  fechaFin: string;
  archivoOrigen: string;
}
