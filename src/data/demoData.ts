import * as XLSX from 'xlsx';
import {
  BatchValidationSummary,
  FisheryRecord,
  RecordValidationIssue,
  UploadedFileMeta,
  ValidatedRecordItem,
  ValidationIssueCode,
} from '../types/fishery';

/**
 * Normalizes strings for flexible Excel header matching (lowercase, no accents, alphanumeric only)
 */
export function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Accent-insensitive lowercase normalizer for search and filter matching
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Strips regular and invisible Excel whitespace characters (\u00A0, \u200B, \uFEFF)
 */
export function cleanCellText(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BLANK_PLACEHOLDER_VALUES = new Set([
  '',
  '-',
  '--',
  '—',
  'n/a',
  'na',
  's/n',
  'sin especificar',
  'no especificado',
  'sin dato',
  'sin datos',
  'sin informacion',
  'sin información',
  'null',
  'undefined',
]);

/**
 * Returns true if a value is empty, whitespace-only, or a placeholder string
 */
export function isBlankIndicatorValue(val: string | undefined | null): boolean {
  if (!val) return true;
  const cleaned = cleanCellText(val).toLowerCase();
  return BLANK_PLACEHOLDER_VALUES.has(cleaned);
}

/**
 * Verifies a record contains valid non-negative metrics and at least one non-blank meaningful field or positive numeric metric
 */
export function isValidFisheryRecord(rec: FisheryRecord): boolean {
  if (!rec) return false;
  if (
    !Number.isFinite(rec.toneladas) ||
    rec.toneladas < 0 ||
    !Number.isFinite(rec.kilogramos ?? 0) ||
    (rec.kilogramos ?? 0) < 0 ||
    !Number.isFinite(rec.familiasBeneficiadas) ||
    rec.familiasBeneficiadas < 0
  ) {
    return false;
  }
  if (
    rec.toneladas > 0 ||
    (rec.kilogramos ?? 0) > 0 ||
    rec.familiasBeneficiadas > 0
  ) {
    return true;
  }
  return (
    !isBlankIndicatorValue(rec.especie) ||
    !isBlankIndicatorValue(rec.municipio) ||
    !isBlankIndicatorValue(rec.parroquia) ||
    !isBlankIndicatorValue(rec.comuna) ||
    !isBlankIndicatorValue(rec.puntoDistribucion)
  );
}

/**
 * Tokenizes a header into clean lowercase alphanumeric words (no accents)
 */
function tokenizeHeader(key: string): string[] {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Canonical mapping for the 12 municipalities of Barinas State
 */
const BARINAS_MUNICIPIO_ALIASES: Record<string, string> = {
  barinas: 'Barinas',
  altobarinas: 'Barinas',
  pedraza: 'Pedraza',
  ciudadbolivia: 'Pedraza',
  sosa: 'Sosa',
  ciudaddenutrias: 'Sosa',
  puertodenutrias: 'Sosa',
  nutrias: 'Sosa',
  rojas: 'Rojas',
  libertad: 'Rojas',
  libertaddebarinas: 'Rojas',
  albertoarvelotorrealba: 'Alberto Arvelo Torrealba',
  arvelotorrealba: 'Alberto Arvelo Torrealba',
  torrealba: 'Alberto Arvelo Torrealba',
  sabaneta: 'Alberto Arvelo Torrealba',
  arismendi: 'Arismendi',
  obispos: 'Obispos',
  antoniojosedesucre: 'Antonio José de Sucre',
  sucre: 'Antonio José de Sucre',
  socopo: 'Antonio José de Sucre',
  ticoporo: 'Antonio José de Sucre',
  ezequielzamora: 'Ezequiel Zamora',
  zamora: 'Ezequiel Zamora',
  santabarbara: 'Ezequiel Zamora',
  bolivar: 'Bolívar',
  barinitas: 'Bolívar',
  cruzparedes: 'Cruz Paredes',
  barrancas: 'Cruz Paredes',
  andreseloyblanco: 'Andrés Eloy Blanco',
  elcanton: 'Andrés Eloy Blanco',
  canton: 'Andrés Eloy Blanco',
};

export function normalizeMunicipioBarinas(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const cleaned = normalizeKey(
    trimmed.replace(/^municipio\s+/i, '').replace(/^mun\.?\s+/i, '')
  );
  if (BARINAS_MUNICIPIO_ALIASES[cleaned]) {
    return BARINAS_MUNICIPIO_ALIASES[cleaned];
  }
  return trimmed;
}

/**
 * Parses numbers accurately across Spanish (1.250,50) and English (1,250.50) formats.
 * Rejects cells containing unexpected text (e.g. "cuatro", "10 cajas", "N/A", dates).
 */
export function parseLocaleNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }

  let str = cleanCellText(val);
  if (!str || isBlankIndicatorValue(str)) return null;

  // Strip valid leading currency symbols and trailing unit/currency suffixes
  str = str
    .replace(/^(bs\.?|ves|usd|\$)\s*/i, '')
    .replace(/\s*(kg|kilos|kilogramos|tm|toneladas|tonelada|ton|bs\.?|usd|\$)$/i, '')
    .replace(/\s+/g, '')
    .trim();

  if (!str) return null;

  // Reject if any alphabetic or invalid non-numeric characters remain (e.g. "10cajas", "cuatro", "error")
  if (/[^0-9.,-]/.test(str)) {
    return null;
  }

  // Reject malformed minus placement (only single leading '-' allowed)
  if ((str.match(/-/g) || []).length > 1 || (str.includes('-') && !str.startsWith('-'))) {
    return null;
  }

  if (str === '-' || str === '.' || str === ',' || str === '-.') return null;

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Spanish format: 1.234,56 -> remove dots, replace comma with dot
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // English format: 1,234.56 -> remove commas
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = str.split(',');
    if (parts.length > 2) {
      // Multiple commas = thousands separators: 1,234,567
      str = str.replace(/,/g, '');
    } else {
      const decimals = parts[1] ?? '';
      if (decimals.length === 3 && parts[0] !== '0' && parts[0].replace('-', '').length <= 3) {
        str = str.replace(/,/g, '');
      } else {
        str = str.replace(',', '.');
      }
    }
  } else if (hasDot) {
    const parts = str.split('.');
    if (parts.length > 2) {
      // Multiple dots = thousands separators: 1.234.567
      str = str.replace(/\./g, '');
    }
  }

  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Validates that a YYYY-MM-DD string represents an actual calendar date
 */
export function isValidIsoDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1950 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() + 1 === month &&
    dt.getUTCDate() === day
  );
}

/**
 * Converts Excel serial date or date string to YYYY-MM-DD. Returns '' if invalid/empty.
 */
function parseExcelDate(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';

  if (val instanceof Date && !isNaN(val.getTime())) {
    const iso = val.toISOString().slice(0, 10);
    return isValidIsoDate(iso) ? iso : '';
  }

  if (typeof val === 'number' && val > 20000 && val < 80000) {
    // Use SheetJS built-in Excel date code parser to avoid timezone drift
    const parsedCode = XLSX.SSF?.parse_date_code?.(val);
    if (parsedCode && parsedCode.y && parsedCode.m && parsedCode.d) {
      const y = String(parsedCode.y).padStart(4, '0');
      const m = String(parsedCode.m).padStart(2, '0');
      const d = String(parsedCode.d).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      return isValidIsoDate(iso) ? iso : '';
    }
    const utcDays = Math.floor(val - 25569);
    const dateInfo = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateInfo.getTime())) {
      const iso = dateInfo.toISOString().slice(0, 10);
      return isValidIsoDate(iso) ? iso : '';
    }
  }

  const str = cleanCellText(val);
  if (!str || isBlankIndicatorValue(str)) return '';

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const yearStr =
      dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    // Handle MM/DD/YYYY if month > 12
    const candidate =
      month > 12 && day <= 12
        ? `${yearStr}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`
        : `${yearStr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return isValidIsoDate(candidate) ? candidate : '';
  }

  // Match YYYY-MM-DD (optionally with time)
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const candidate = `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
    return isValidIsoDate(candidate) ? candidate : '';
  }

  return '';
}

interface ColInfo {
  index: number;
  name: string;
  norm: string;
  tokens: string[];
}

/**
 * Matches a semantic column once at the header level using exact matches first,
 * then token-based matching (avoiding dangerous partial substrings like 'dia' or 'tm').
 */
function findColumnIndex(
  cols: ColInfo[],
  exactNorms: string[],
  tokenCandidates: string[],
  excludeTokens: string[] = []
): ColInfo | undefined {
  // 1. Exact normalized match in priority order
  for (const target of exactNorms) {
    const found = cols.find(
      (c) =>
        c.norm === target &&
        !c.tokens.some((t) => excludeTokens.includes(t))
    );
    if (found) return found;
  }

  // 2. Token match in priority order
  for (const tok of tokenCandidates) {
    const found = cols.find(
      (c) =>
        c.tokens.includes(tok) &&
        !c.tokens.some((t) => excludeTokens.includes(t))
    );
    if (found) return found;
  }

  return undefined;
}

export interface ParsedExcelResult {
  records: FisheryRecord[];
  validatedItems: ValidatedRecordItem[];
  emptyRowsSkipped: number;
  summaryRowsSkipped: number;
  columns: string[];
  numericColumns: string[];
  detectedWeightColumn?: string;
  detectedWeightUnit: 'kg' | 'tm' | 'none';
}

/**
 * Parses an uploaded Excel (.xlsx / .xls / .csv) ArrayBuffer into FisheryRecord[]
 * accurately preserving all values, totals, units (Kg vs TM), and columns.
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer,
  fileName: string
): ParsedExcelResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

  // Choose the sheet with the largest tabular dataset (instead of failing on a cover sheet)
  let targetSheet: XLSX.WorkSheet | null = null;
  let bestMatrix: unknown[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;
    const mat = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: true,
    });
    const nonEmptyRows = mat.filter(
      (r) =>
        Array.isArray(r) &&
        r.some((c) => c !== null && c !== undefined && String(c).trim() !== '')
    ).length;

    if (nonEmptyRows > bestMatrix.length) {
      targetSheet = sheet;
      bestMatrix = mat;
    }
  }

  if (!targetSheet || bestMatrix.length === 0) {
    return {
      records: [],
      validatedItems: [],
      emptyRowsSkipped: 0,
      summaryRowsSkipped: 0,
      columns: [],
      numericColumns: [],
      detectedWeightUnit: 'none',
    };
  }

  // Clone matrix and resolve vertical merges in data rows so merged Municipio/Fecha cells don't become blank
  const matrix = bestMatrix.map((row) => (Array.isArray(row) ? [...row] : []));

  // Locate the header row in the first 15 rows (maximize count of text header labels)
  let headerRowIndex = 0;
  let bestHeaderScore = -1;
  const scanLimit = Math.min(15, matrix.length);

  for (let r = 0; r < scanLimit; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    let textLabels = 0;
    let nonEmpty = 0;
    row.forEach((cell) => {
      const s = String(cell ?? '').trim();
      if (!s) return;
      nonEmpty++;
      if (isNaN(Number(s))) {
        textLabels++;
      }
    });

    // Prefer rows with >= 2 text headers
    const score = textLabels * 2 + nonEmpty;
    if (nonEmpty >= 2 && textLabels >= 2 && score > bestHeaderScore) {
      bestHeaderScore = score;
      headerRowIndex = r;
    }
  }

  // Expand vertical merges ONLY below headerRowIndex (and only single-column vertical merges)
  const merges = targetSheet['!merges'] || [];
  for (const merge of merges) {
    if (
      merge.s.c === merge.e.c &&
      merge.s.r > headerRowIndex &&
      merge.e.r > merge.s.r
    ) {
      const topVal = matrix[merge.s.r]?.[merge.s.c];
      if (topVal !== undefined && String(topVal).trim() !== '') {
        for (let r = merge.s.r + 1; r <= merge.e.r; r++) {
          if (matrix[r] && (matrix[r][merge.s.c] === '' || matrix[r][merge.s.c] === undefined)) {
            matrix[r][merge.s.c] = topVal;
          }
        }
      }
    }
  }

  const rawHeaders = matrix[headerRowIndex] || [];
  const columns: string[] = [];
  const colIndexMap: ColInfo[] = [];

  rawHeaders.forEach((h, idx) => {
    const cleanName = String(h ?? '').trim();
    if (cleanName && !cleanName.startsWith('__EMPTY')) {
      const uniqueName = columns.includes(cleanName)
        ? `${cleanName} (${idx + 1})`
        : cleanName;
      columns.push(uniqueName);
      colIndexMap.push({
        index: idx,
        name: uniqueName,
        norm: normalizeKey(uniqueName),
        tokens: tokenizeHeader(uniqueName),
      });
    }
  });

  if (colIndexMap.length === 0) {
    return {
      records: [],
      validatedItems: [],
      emptyRowsSkipped: 0,
      summaryRowsSkipped: 0,
      columns: [],
      numericColumns: [],
      detectedWeightUnit: 'none',
    };
  }

  // Classify semantic columns ONCE per sheet
  const excludedFinancialOrCountTokens = [
    'precio',
    'costo',
    'monto',
    'bs',
    'bolivar',
    'bolivares',
    'usd',
    'dolar',
    'dolares',
    'divisa',
    'valor',
    'familia',
    'familias',
    'persona',
    'personas',
    'beneficiario',
    'beneficiarios',
    'hogar',
    'hogares',
    'cedula',
    'telefono',
    'nro',
    'num',
    'numero',
    'codigo',
    'id',
    'item',
    'ano',
    'mes',
    'fecha',
    'edad',
  ];

  const colTm = findColumnIndex(
    colIndexMap,
    ['toneladas', 'tonelada', 'toneladastm', 'tm', 'ton', 'pesotm', 'volumentm', 'canttm'],
    ['toneladas', 'tonelada', 'tm', 'ton'],
    excludedFinancialOrCountTokens
  );

  const colKg = findColumnIndex(
    colIndexMap,
    [
      'kilogramos',
      'kilogramo',
      'kilogramoskg',
      'kilos',
      'kilo',
      'kg',
      'pesokg',
      'pesoneto',
      'cantkg',
      'cantidadkg',
      'volumenkg',
      'kilosdistribuidos',
      'kgdistribuidos',
      'kilosvendidos',
      'kgvendidos',
      'totalKg',
      'totalkg',
      'totalkilos',
    ],
    ['kilogramos', 'kilogramo', 'kilos', 'kilo', 'kg'],
    excludedFinancialOrCountTokens
  );

  // Secondary generic weight column (only if neither TM nor Kg explicit column exists)
  const colGenericWeight =
    !colTm && !colKg
      ? findColumnIndex(
          colIndexMap,
          ['peso', 'volumen', 'cantidad', 'distribuido', 'captura', 'produccion', 'despacho'],
          ['peso', 'volumen', 'cantidad', 'distribuido', 'captura', 'produccion', 'despachado'],
          excludedFinancialOrCountTokens
        )
      : undefined;

  const colFecha = findColumnIndex(
    colIndexMap,
    ['fecha', 'fechajornada', 'fecharegistro', 'fechaoperativo', 'date', 'dia'],
    ['fecha', 'date', 'dia'],
    ['mediador', 'intermediario', 'subsidiado', 'diario', 'estadio']
  );

  const colEspecie = findColumnIndex(
    colIndexMap,
    ['especie', 'especies', 'pescado', 'rubro', 'producto', 'variedad', 'proteina', 'nombreespecie'],
    ['especie', 'especies', 'pescado', 'rubro', 'producto', 'variedad', 'proteina'],
    ['precio', 'kg', 'tm', 'cantidad', 'peso']
  );

  const colMunicipio = findColumnIndex(
    colIndexMap,
    ['municipio', 'municipios', 'localidad', 'territorio', 'entidad'],
    ['municipio', 'municipios', 'localidad', 'territorio'],
    ['parroquia', 'punto', 'codigo']
  );

  const colParroquia = findColumnIndex(
    colIndexMap,
    ['parroquia', 'parroquias'],
    ['parroquia', 'parroquias'],
    ['municipio', 'comuna', 'sector']
  );

  const colComuna = findColumnIndex(
    colIndexMap,
    [
      'comuna',
      'comunas',
      'circuitocomunal',
      'circuito',
      'consejocomunal',
      'comunidad',
      'sector',
    ],
    ['comuna', 'comunas', 'comunal', 'circuito', 'consejo', 'comunidad', 'sector'],
    ['municipio', 'parroquia']
  );

  const colTipo = findColumnIndex(
    colIndexMap,
    ['tipopesca', 'modalidad', 'modalidadoperativo', 'categoria', 'origen', 'actividad', 'operativo', 'programa', 'tipooperativo', 'tipojornada'],
    ['modalidad', 'categoria', 'origen', 'actividad', 'operativo', 'programa']
  );

  const colFamilias = findColumnIndex(
    colIndexMap,
    ['familiasbeneficiadas', 'familiasatendidas', 'familias', 'familia', 'hogares', 'beneficiarios', 'personasatendidas'],
    ['familias', 'familia', 'hogares', 'beneficiarios', 'atendidos', 'personas'],
    ['kg', 'tm', 'peso', 'precio']
  );

  const colPunto = findColumnIndex(
    colIndexMap,
    ['puntodistribucion', 'puntodeventa', 'punto', 'centro', 'lugar', 'mercado', 'direccion', 'conppa', 'feria'],
    ['punto', 'centro', 'lugar', 'mercado', 'direccion', 'conppa', 'feria'],
    ['fecha', 'tipo', 'modalidad']
  );

  const numericColumnCounts = new Map<string, { numeric: number; nonEmpty: number }>();
  colIndexMap.forEach((c) => numericColumnCounts.set(c.name, { numeric: 0, nonEmpty: 0 }));

  interface CandidateRowEntry {
    record: FisheryRecord;
    rowNumber: number;
    rawFechaCell: string;
    rawCellsByColName: Record<string, string>;
    rawValuesByColName: Record<string, unknown>;
    tmVal: number | null;
    kgVal: number | null;
    genericVal: number | null;
    famVal: number | null;
  }

  const candidateEntries: CandidateRowEntry[] = [];
  let emptyRowsSkipped = 0;
  let summaryRowsSkipped = 0;
  const timestampSeed = Date.now();

  const summaryRowKeywords = new Set([
    'total',
    'totales',
    'total general',
    'gran total',
    'subtotal',
    'sub-total',
    'sub total',
    'resumen',
    'suma',
    'promedio',
  ]);

  const indexOnlyColTokens = new Set([
    'nro',
    'no',
    'num',
    'numero',
    'item',
    'id',
    'correlativo',
    'indice',
  ]);
  const nonIndexCols = colIndexMap.filter(
    (c) =>
      c.name !== '#' &&
      !(c.tokens.length > 0 && c.tokens.every((t) => indexOnlyColTokens.has(t)))
  );
  const meaningfulColsToCheck = nonIndexCols.length > 0 ? nonIndexCols : colIndexMap;

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;

    // Skip rows where all meaningful (non-index) columns are empty or whitespace-only
    const meaningfulNonEmptyCount = meaningfulColsToCheck.filter((c) => {
      const cleaned = cleanCellText(row[c.index]);
      return cleaned !== '' && cleaned !== '-';
    }).length;
    if (meaningfulNonEmptyCount === 0) {
      const hasAnyCellAtAll = colIndexMap.some(
        (c) => cleanCellText(row[c.index]) !== ''
      );
      if (hasAnyCellAtAll) emptyRowsSkipped++;
      continue;
    }

    // Skip summary/total rows (check first 4 columns so merged/indented TOTAL rows are caught)
    let isSummaryRow = false;
    for (let checkIdx = 0; checkIdx < Math.min(4, colIndexMap.length); checkIdx++) {
      const cellStr = cleanCellText(row[colIndexMap[checkIdx].index]).toLowerCase();
      if (
        summaryRowKeywords.has(cellStr) ||
        cellStr.startsWith('total ') ||
        cellStr.startsWith('subtotal ')
      ) {
        isSummaryRow = true;
        break;
      }
    }
    if (isSummaryRow) {
      summaryRowsSkipped++;
      continue;
    }

    const rawFields: Record<string, string> = {};
    const numericFields: Record<string, number> = {};
    const rawCellsByColName: Record<string, string> = {};
    const rawValuesByColName: Record<string, unknown> = {};

    colIndexMap.forEach((c) => {
      const cellVal = row[c.index];
      const cleanedRaw = cleanCellText(cellVal);
      rawCellsByColName[c.name] = cleanedRaw;
      rawValuesByColName[c.name] = cellVal;

      let strVal = cleanedRaw;

      // Format Excel serial dates ONLY for actual date columns
      if (colFecha && c.index === colFecha.index && strVal !== '') {
        const parsedFecha = parseExcelDate(cellVal);
        strVal = parsedFecha || cleanedRaw;
      }

      rawFields[c.name] = strVal;

      if (strVal !== '' && (!colFecha || c.index !== colFecha.index)) {
        const stats = numericColumnCounts.get(c.name)!;
        stats.nonEmpty++;
        const parsedNum = parseLocaleNumber(cellVal);
        if (parsedNum !== null) {
          stats.numeric++;
          numericFields[c.name] = parsedNum;
        }
      }
    });

    // Compute exact kilogramos and toneladas from the detected weight columns
    const tmVal = colTm ? parseLocaleNumber(row[colTm.index]) : null;
    const kgVal = colKg ? parseLocaleNumber(row[colKg.index]) : null;
    const genericVal = colGenericWeight
      ? parseLocaleNumber(row[colGenericWeight.index])
      : null;

    let kilogramos = 0;
    let toneladas = 0;

    if (kgVal !== null && tmVal !== null) {
      kilogramos = kgVal;
      toneladas = tmVal;
    } else if (tmVal !== null) {
      toneladas = tmVal;
      kilogramos = tmVal * 1000;
    } else if (kgVal !== null) {
      kilogramos = kgVal;
      toneladas = kgVal / 1000;
    } else if (genericVal !== null) {
      // Generic weight/cantidad column without explicit unit: assume Kg (consistent across all rows)
      kilogramos = genericVal;
      toneladas = genericVal / 1000;
    }

    // Parse familias ONLY if the Excel has a families/beneficiaries column (never fabricate)
    const famVal = colFamilias ? parseLocaleNumber(row[colFamilias.index]) : null;
    let familias = 0;
    if (famVal !== null) {
      familias = Math.round(famVal);
    }

    const rawFechaCell = colFecha ? cleanCellText(row[colFecha.index]) : '';
    const fecha = colFecha ? parseExcelDate(row[colFecha.index]) : '';

    const rawEsp = colEspecie ? cleanCellText(rawFields[colEspecie.name]) : '';
    const especie = !isBlankIndicatorValue(rawEsp) ? rawEsp : 'Sin Especificar';

    const rawMunStr = colMunicipio
      ? cleanCellText(rawFields[colMunicipio.name])
      : '';
    const municipio = !isBlankIndicatorValue(rawMunStr)
      ? normalizeMunicipioBarinas(rawMunStr)
      : 'No especificado';

    const rawPar = colParroquia
      ? cleanCellText(rawFields[colParroquia.name])
      : '';
    const parroquia = !isBlankIndicatorValue(rawPar) ? rawPar : '-';

    const rawCom = colComuna ? cleanCellText(rawFields[colComuna.name]) : '';
    const comuna = !isBlankIndicatorValue(rawCom) ? rawCom : '-';

    const rawTipo = colTipo ? cleanCellText(rawFields[colTipo.name]) : '';
    const tipoPesca = !isBlankIndicatorValue(rawTipo)
      ? rawTipo
      : 'No especificado';

    const rawPunto = colPunto ? cleanCellText(rawFields[colPunto.name]) : '';
    const puntoDistribucion = !isBlankIndicatorValue(rawPunto)
      ? rawPunto
      : comuna !== '-'
      ? comuna
      : parroquia !== '-'
      ? parroquia
      : '-';

    const candidateRecord: FisheryRecord = {
      id: `xl-${timestampSeed}-${r}`,
      fecha,
      especie,
      municipio,
      parroquia,
      comuna,
      tipoPesca,
      toneladas,
      kilogramos,
      familiasBeneficiadas: familias,
      puntoDistribucion,
      archivoOrigen: fileName,
      rawFields,
      numericFields,
    };

    candidateEntries.push({
      record: candidateRecord,
      rowNumber: r + 1, // 1-indexed spreadsheet row number
      rawFechaCell,
      rawCellsByColName,
      rawValuesByColName,
      tmVal,
      kgVal,
      genericVal,
      famVal,
    });
  }

  // Identify columns that are genuinely numeric (>= 60% numeric rows)
  const numericColumns = colIndexMap
    .filter((c) => {
      const st = numericColumnCounts.get(c.name);
      return st && st.nonEmpty > 0 && st.numeric / st.nonEmpty >= 0.6;
    })
    .map((c) => c.name);

  // Build strict set of columns expected to contain numeric values (for text-in-numeric detection)
  const expectedNumericHeaderTokens = new Set([
    'kg',
    'kilo',
    'kilos',
    'kilogramo',
    'kilogramos',
    'tm',
    'ton',
    'tonelada',
    'toneladas',
    'familia',
    'familias',
    'beneficiario',
    'beneficiarios',
    'hogar',
    'hogares',
    'cantidad',
    'peso',
    'volumen',
    'precio',
    'monto',
    'subtotal',
    'total',
    'bs',
    'usd',
  ]);
  const nonNumericModifierTokens = new Set([
    'unidad',
    'tipo',
    'modalidad',
    'observacion',
    'observaciones',
    'comentario',
    'comentarios',
    'nota',
    'notas',
    'descripcion',
    'fecha',
    'cedula',
    'telefono',
    'codigo',
    'nro',
    'numero',
    'id',
  ]);

  const expectedNumericColNames = new Set<string>(numericColumns);
  [colTm, colKg, colGenericWeight, colFamilias].forEach((c) => {
    if (c) expectedNumericColNames.add(c.name);
  });
  colIndexMap.forEach((c) => {
    if (colFecha && c.index === colFecha.index) return;
    if (
      c.tokens.some((t) => expectedNumericHeaderTokens.has(t)) &&
      !c.tokens.some((t) => nonNumericModifierTokens.has(t))
    ) {
      expectedNumericColNames.add(c.name);
    }
  });

  // Remove date/identifier columns even if mostly numeric (e.g. Nro, Item, Año, Cedula)
  const idOrCodeTokens = new Set([
    'nro',
    'no',
    'num',
    'numero',
    'item',
    'id',
    'codigo',
    'cedula',
    'telefono',
    'correlativo',
    'indice',
    'fecha',
    'ano',
    'mes',
    'dia',
  ]);
  colIndexMap.forEach((c) => {
    if (
      c.name === '#' ||
      (c.tokens.length > 0 && c.tokens.every((t) => idOrCodeTokens.has(t))) ||
      c.tokens.includes('cedula') ||
      c.tokens.includes('telefono') ||
      c.tokens.includes('codigo')
    ) {
      expectedNumericColNames.delete(c.name);
    }
  });

  const validatedItems: ValidatedRecordItem[] = [];
  const validRecords: FisheryRecord[] = [];
  const hasWeightColumn = Boolean(colTm || colKg || colGenericWeight);

  for (const entry of candidateEntries) {
    const { record, rowNumber, rawFechaCell, rawCellsByColName, rawValuesByColName, tmVal, kgVal, genericVal, famVal } =
      entry;
    const issues: RecordValidationIssue[] = [];
    const flaggedNegativeCols = new Set<string>();
    const flaggedTextNumericCols = new Set<string>();

    // 1. Validate Date
    if (colFecha) {
      if (!rawFechaCell || isBlankIndicatorValue(rawFechaCell)) {
        issues.push({
          code: 'missing_date',
          severity: 'warning',
          field: colFecha.name,
          rawValue: rawFechaCell || '(vacío)',
          message: `Registro sin fecha en columna "${colFecha.name}".`,
        });
      } else if (!isValidIsoDate(record.fecha)) {
        issues.push({
          code: 'invalid_date',
          severity: 'warning',
          field: colFecha.name,
          rawValue: rawFechaCell,
          message: `Fecha con formato inválido o inexistente ("${rawFechaCell}").`,
        });
      }
    } else {
      issues.push({
        code: 'missing_date',
        severity: 'warning',
        field: 'Fecha',
        rawValue: '(sin columna)',
        message: 'El archivo no posee columna de fecha; registro sin fecha.',
      });
    }

    // 2. Validate Negative Toneladas / Kilogramos / Familias
    if (tmVal !== null && tmVal < 0) {
      const colName = colTm?.name || 'Toneladas (TM)';
      flaggedNegativeCols.add(colName);
      issues.push({
        code: 'negative_toneladas',
        severity: 'error',
        field: colName,
        rawValue: rawCellsByColName[colName] || String(tmVal),
        message: `Toneladas negativas (${tmVal} TM) en "${colName}".`,
      });
    }
    if (kgVal !== null && kgVal < 0) {
      const colName = colKg?.name || 'Kilogramos (Kg)';
      flaggedNegativeCols.add(colName);
      issues.push({
        code: 'negative_kilogramos',
        severity: 'error',
        field: colName,
        rawValue: rawCellsByColName[colName] || String(kgVal),
        message: `Kilogramos negativos (${kgVal} Kg) en "${colName}".`,
      });
    }
    if (genericVal !== null && genericVal < 0 && !colKg && !colTm) {
      const colName = colGenericWeight?.name || 'Peso / Cantidad';
      flaggedNegativeCols.add(colName);
      issues.push({
        code: 'negative_kilogramos',
        severity: 'error',
        field: colName,
        rawValue: rawCellsByColName[colName] || String(genericVal),
        message: `Volumen negativo (${genericVal}) en "${colName}".`,
      });
    }
    if (colFamilias && famVal !== null && famVal < 0) {
      flaggedNegativeCols.add(colFamilias.name);
      issues.push({
        code: 'negative_families',
        severity: 'error',
        field: colFamilias.name,
        rawValue: rawCellsByColName[colFamilias.name] || String(famVal),
        message: `Familias beneficiadas negativas (${famVal}) en "${colFamilias.name}".`,
      });
    }

    // 3. Validate Text in Numeric Fields & Other Negative Numeric Columns
    expectedNumericColNames.forEach((colName) => {
      const rawText = rawCellsByColName[colName] ?? '';
      const rawVal = rawValuesByColName[colName];
      if (!rawText) return;

      const parsed = parseLocaleNumber(rawVal);
      if (parsed === null) {
        flaggedTextNumericCols.add(colName);
        issues.push({
          code: 'text_in_numeric_field',
          severity: 'error',
          field: colName,
          rawValue: rawText,
          message: `Valor de texto ("${rawText}") en campo numérico "${colName}".`,
        });
      } else if (parsed < 0 && !flaggedNegativeCols.has(colName)) {
        flaggedNegativeCols.add(colName);
        issues.push({
          code: 'negative_numeric',
          severity: 'error',
          field: colName,
          rawValue: rawText,
          message: `Valor negativo (${rawText}) en campo numérico "${colName}".`,
        });
      }
    });

    // 4. Validate Zero Weight (only if weight columns didn't already trigger text/negative error)
    if (hasWeightColumn && record.toneladas === 0 && record.kilogramos === 0) {
      const weightColNames = [colTm?.name, colKg?.name, colGenericWeight?.name].filter(
        Boolean
      ) as string[];
      const alreadyFlaggedWeight = weightColNames.some(
        (n) => flaggedTextNumericCols.has(n) || flaggedNegativeCols.has(n)
      );
      if (!alreadyFlaggedWeight) {
        issues.push({
          code: 'zero_weight',
          severity: 'warning',
          field: colKg?.name || colTm?.name || colGenericWeight?.name || 'Peso',
          rawValue: '0',
          message: 'Peso total en cero (0 Kg / 0 TM) o celda de peso vacía.',
        });
      }
    }

    // 5. Validate Incomplete Territory & Species
    if (isBlankIndicatorValue(record.municipio)) {
      issues.push({
        code: 'missing_municipio',
        severity: 'warning',
        field: colMunicipio?.name || 'Municipio',
        rawValue: colMunicipio ? rawCellsByColName[colMunicipio.name] || '(vacío)' : '(sin columna)',
        message: 'Registro sin municipio especificado.',
      });
    }

    if (isBlankIndicatorValue(record.especie)) {
      issues.push({
        code: 'missing_especie',
        severity: 'warning',
        field: colEspecie?.name || 'Especie',
        rawValue: colEspecie ? rawCellsByColName[colEspecie.name] || '(vacío)' : '(sin columna)',
        message: 'Registro sin especie especificada.',
      });
    }

    const hasErrors = issues.some((i) => i.severity === 'error');
    const hasWarnings = issues.some((i) => i.severity === 'warning');

    // Clamp negative numbers out of validRecords so corrupt weights never enter clean state
    const canEnterSafePool = !hasErrors && isValidFisheryRecord(record);
    if (canEnterSafePool) {
      validRecords.push(record);
    }

    validatedItems.push({
      record,
      rowNumber,
      fileName,
      issues,
      hasErrors,
      hasWarnings,
    });
  }

  const detectedWeightColumn =
    colKg?.name || colTm?.name || colGenericWeight?.name;
  const detectedWeightUnit: 'kg' | 'tm' | 'none' = colKg || colGenericWeight
    ? 'kg'
    : colTm
    ? 'tm'
    : 'none';

  return {
    records: validRecords,
    validatedItems,
    emptyRowsSkipped,
    summaryRowsSkipped,
    columns,
    numericColumns,
    detectedWeightColumn,
    detectedWeightUnit,
  };
}

/**
 * Validates an individual FisheryRecord (for manual entries or storage checks)
 */
export function validateFisheryRecord(
  rec: FisheryRecord
): RecordValidationIssue[] {
  const issues: RecordValidationIssue[] = [];
  if (!rec.fecha || !isValidIsoDate(rec.fecha)) {
    issues.push({
      code: rec.fecha ? 'invalid_date' : 'missing_date',
      severity: 'warning',
      field: 'Fecha',
      rawValue: rec.fecha || '(vacío)',
      message: rec.fecha
        ? `Fecha con formato inválido ("${rec.fecha}").`
        : 'Registro sin fecha asignada.',
    });
  }
  if (!Number.isFinite(rec.toneladas) || rec.toneladas < 0) {
    issues.push({
      code: 'negative_toneladas',
      severity: 'error',
      field: 'Toneladas (TM)',
      rawValue: String(rec.toneladas),
      message: `Toneladas inválidas o negativas (${rec.toneladas} TM).`,
    });
  }
  if (!Number.isFinite(rec.kilogramos) || rec.kilogramos < 0) {
    issues.push({
      code: 'negative_kilogramos',
      severity: 'error',
      field: 'Kilogramos (Kg)',
      rawValue: String(rec.kilogramos),
      message: `Kilogramos inválidos o negativos (${rec.kilogramos} Kg).`,
    });
  }
  if (!Number.isFinite(rec.familiasBeneficiadas) || rec.familiasBeneficiadas < 0) {
    issues.push({
      code: 'negative_families',
      severity: 'error',
      field: 'Familias Beneficiadas',
      rawValue: String(rec.familiasBeneficiadas),
      message: `Familias beneficiadas inválidas o negativas (${rec.familiasBeneficiadas}).`,
    });
  }
  if (isBlankIndicatorValue(rec.municipio)) {
    issues.push({
      code: 'missing_municipio',
      severity: 'warning',
      field: 'Municipio',
      rawValue: rec.municipio || '(vacío)',
      message: 'Registro sin municipio especificado.',
    });
  }
  if (isBlankIndicatorValue(rec.especie)) {
    issues.push({
      code: 'missing_especie',
      severity: 'warning',
      field: 'Especie',
      rawValue: rec.especie || '(vacío)',
      message: 'Registro sin especie especificada.',
    });
  }
  return issues;
}

/**
 * Aggregates validation findings across one or more uploaded Excel files
 * before adding records to global state.
 */
export function buildBatchValidationSummary(
  items: ValidatedRecordItem[],
  pendingFilesMeta: UploadedFileMeta[],
  emptyRowsSkipped: number,
  summaryRowsSkipped: number
): BatchValidationSummary {
  const issueCounts: Record<ValidationIssueCode, number> = {
    missing_date: 0,
    invalid_date: 0,
    negative_toneladas: 0,
    negative_kilogramos: 0,
    negative_families: 0,
    negative_numeric: 0,
    text_in_numeric_field: 0,
    missing_municipio: 0,
    missing_especie: 0,
    zero_weight: 0,
  };

  const cleanRecords: FisheryRecord[] = [];
  const safeRecordsWithoutErrors: FisheryRecord[] = [];
  const itemsWithIssues: ValidatedRecordItem[] = [];

  let cleanCount = 0;
  let warningOnlyCount = 0;
  let errorCount = 0;

  for (const item of items) {
    item.issues.forEach((issue) => {
      issueCounts[issue.code] = (issueCounts[issue.code] || 0) + 1;
    });

    if (item.hasErrors || item.hasWarnings) {
      itemsWithIssues.push(item);
    }

    if (item.hasErrors) {
      errorCount++;
    } else if (item.hasWarnings) {
      warningOnlyCount++;
      if (isValidFisheryRecord(item.record)) {
        safeRecordsWithoutErrors.push(item.record);
      }
    } else {
      cleanCount++;
      if (isValidFisheryRecord(item.record)) {
        cleanRecords.push(item.record);
        safeRecordsWithoutErrors.push(item.record);
      }
    }
  }

  return {
    totalRowsEvaluated: items.length,
    emptyRowsSkipped,
    summaryRowsSkipped,
    cleanCount,
    warningOnlyCount,
    errorCount,
    issueCounts,
    itemsWithIssues,
    cleanRecords,
    safeRecordsWithoutErrors,
    pendingFilesMeta,
  };
}

/**
 * Exports detected validation issues to an Excel file for quick correction
 */
export function exportValidationReportToExcel(items: ValidatedRecordItem[]) {
  const rows: Record<string, string | number>[] = [];

  items.forEach((item) => {
    item.issues.forEach((issue) => {
      rows.push({
        Archivo: item.fileName,
        'Fila Excel': item.rowNumber,
        Severidad: issue.severity === 'error' ? 'Error Crítico' : 'Dato Incompleto',
        Campo: issue.field,
        'Valor Detectado': issue.rawValue,
        Observación: issue.message,
        Municipio: item.record.municipio,
        Especie: item.record.especie,
        Fecha: item.record.fecha || '(Sin fecha)',
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte_Validacion');
  XLSX.writeFile(
    workbook,
    `Reporte_Validacion_Pesca_Barinas_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

/**
 * Generates and downloads a template Excel file (.xlsx)
 */
export function downloadSampleExcelTemplate(batchNumber = 1) {
  const sampleRows = [
    {
      Fecha: '2026-11-01',
      Municipio: 'Barinas',
      Parroquia: 'El Carmen',
      Comuna: 'Comuna Chávez Frías',
      Especie: 'Cachama Negra',
      'Modalidad / Operativo': 'Feria Venezuela Come Pescado',
      'Punto de Distribución': 'Plaza Bolívar',
      'Kilogramos (Kg)': 4500,
      'Toneladas (TM)': 4.5,
      'Familias Beneficiadas': 1125,
    },
    {
      Fecha: '2026-11-03',
      Municipio: 'Pedraza',
      Parroquia: 'Ciudad Bolivia',
      Comuna: 'Comuna Ticoporo Productivo',
      Especie: 'Coporo',
      'Modalidad / Operativo': 'Acuicultura Continental',
      'Punto de Distribución': 'Eje Piscícola Pedraza',
      'Kilogramos (Kg)': 6200,
      'Toneladas (TM)': 6.2,
      'Familias Beneficiadas': 1550,
    },
    {
      Fecha: '2026-11-05',
      Municipio: 'Sosa',
      Parroquia: 'Puerto de Nutrias',
      Comuna: 'Comuna Ribereña Apure',
      Especie: 'Bagre Rayado',
      'Modalidad / Operativo': 'Pesca Artesanal Fluvial',
      'Punto de Distribución': 'Ribera Río Apure',
      'Kilogramos (Kg)': 3800,
      'Toneladas (TM)': 3.8,
      'Familias Beneficiadas': 950,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Formato_Pesca_Barinas');
  XLSX.writeFile(
    workbook,
    `Formato_Venezuela_Come_Pescado_Barinas_${batchNumber}.xlsx`
  );
}

/**
 * Exports current filtered records to an Excel file preserving custom Excel columns
 */
export function exportRecordsToExcel(records: FisheryRecord[]) {
  const rows = records.map((r) => {
    if (r.rawFields && Object.keys(r.rawFields).length > 0) {
      return {
        ...r.rawFields,
        'Archivo Origen': r.archivoOrigen,
      };
    }
    return {
      Fecha: r.fecha,
      Especie: r.especie,
      Municipio: r.municipio,
      Parroquia: r.parroquia,
      Comuna: r.comuna || '-',
      Modalidad: r.tipoPesca,
      'Toneladas (TM)': +r.toneladas.toFixed(4),
      'Kilogramos (Kg)': +r.kilogramos.toFixed(2),
      'Familias Beneficiadas': r.familiasBeneficiadas,
      'Punto de Distribución': r.puntoDistribucion,
      'Archivo de Origen': r.archivoOrigen,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidado_Barinas');
  XLSX.writeFile(
    workbook,
    `Consolidado_Venezuela_Come_Pescado_Barinas_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
