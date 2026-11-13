import * as XLSX from 'xlsx';
import { FisheryRecord } from '../types/fishery';

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
 * Parses numbers accurately across Spanish (1.250,50) and English (1,250.50) formats
 */
export function parseLocaleNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }

  let str = String(val).trim();
  if (!str) return null;

  // Strip currency symbols, unit suffixes, and spaces
  str = str
    .replace(/^(bs\.?|ves|usd|\$)/i, '')
    .replace(/(kg|kilos|kilogramos|tm|toneladas|ton|bs\.?|usd|\$)$/i, '')
    .replace(/\s+/g, '')
    .trim();

  // Keep only digits, dots, commas, and leading minus
  str = str.replace(/[^0-9.,-]/g, '');
  if (!str || str === '-' || str === '.' || str === ',') return null;

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
      // If exactly 3 digits after comma and integer part != 0 (e.g. "4,500"), treat as thousands unless small decimal?
      // Actually in Spanish Excel strings, comma is usually decimal unless 3 digits with >0 int part like "1,500"
      if (decimals.length === 3 && parts[0] !== '0' && parts[0].length <= 3) {
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
    // Single dot: keep as decimal separator (standard float), e.g., 4.5 or 1.250
  }

  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Converts Excel serial date or date string to YYYY-MM-DD. Returns '' if invalid/empty.
 */
function parseExcelDate(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }

  if (typeof val === 'number' && val > 20000 && val < 80000) {
    // Use SheetJS built-in Excel date code parser to avoid timezone drift
    const parsedCode = XLSX.SSF?.parse_date_code?.(val);
    if (parsedCode && parsedCode.y && parsedCode.m && parsedCode.d) {
      const y = String(parsedCode.y).padStart(4, '0');
      const m = String(parsedCode.m).padStart(2, '0');
      const d = String(parsedCode.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const utcDays = Math.floor(val - 25569);
    const dateInfo = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateInfo.getTime())) {
      return dateInfo.toISOString().slice(0, 10);
    }
  }

  const str = String(val).trim();
  if (!str) return '';

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const yearStr =
      dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    // Handle MM/DD/YYYY if month > 12
    if (month > 12 && day <= 12) {
      return `${yearStr}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
    }
    return `${yearStr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Match YYYY-MM-DD (optionally with time)
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  return str;
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

  const records: FisheryRecord[] = [];
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

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;

    // Skip empty rows
    const nonEmptyCount = colIndexMap.filter(
      (c) => row[c.index] !== null && row[c.index] !== undefined && String(row[c.index]).trim() !== ''
    ).length;
    if (nonEmptyCount === 0) continue;

    // Skip summary/total rows (check first 4 columns so merged/indented TOTAL rows are caught)
    let isSummaryRow = false;
    for (let checkIdx = 0; checkIdx < Math.min(4, colIndexMap.length); checkIdx++) {
      const cellStr = String(row[colIndexMap[checkIdx].index] ?? '')
        .trim()
        .toLowerCase();
      if (
        summaryRowKeywords.has(cellStr) ||
        cellStr.startsWith('total ') ||
        cellStr.startsWith('subtotal ')
      ) {
        isSummaryRow = true;
        break;
      }
    }
    if (isSummaryRow) continue;

    const rawFields: Record<string, string> = {};
    const numericFields: Record<string, number> = {};

    colIndexMap.forEach((c) => {
      const cellVal = row[c.index];
      let strVal =
        cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '';

      // Format Excel serial dates ONLY for actual date columns
      if (colFecha && c.index === colFecha.index && strVal !== '') {
        strVal = parseExcelDate(cellVal);
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
    let familias = 0;
    if (colFamilias) {
      const famVal = parseLocaleNumber(row[colFamilias.index]);
      if (famVal !== null && famVal >= 0) {
        familias = Math.round(famVal);
      }
    }

    const fecha = colFecha ? parseExcelDate(row[colFecha.index]) : '';

    const especie = colEspecie
      ? String(rawFields[colEspecie.name] || '').trim() || 'Sin Especificar'
      : 'Sin Especificar';

    const rawMunStr = colMunicipio
      ? String(rawFields[colMunicipio.name] || '').trim()
      : '';
    const municipio = rawMunStr
      ? normalizeMunicipioBarinas(rawMunStr)
      : 'No especificado';

    const parroquia = colParroquia
      ? String(rawFields[colParroquia.name] || '').trim() || '-'
      : '-';

    const comuna = colComuna
      ? String(rawFields[colComuna.name] || '').trim() || '-'
      : '-';

    const tipoPesca = colTipo
      ? String(rawFields[colTipo.name] || '').trim() || 'No especificado'
      : 'No especificado';

    const puntoDistribucion = colPunto
      ? String(rawFields[colPunto.name] || '').trim() || '-'
      : comuna !== '-'
      ? comuna
      : parroquia !== '-'
      ? parroquia
      : '-';

    records.push({
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
    });
  }

  // Identify columns that are genuinely numeric (>= 60% numeric rows)
  const numericColumns = colIndexMap
    .filter((c) => {
      const st = numericColumnCounts.get(c.name);
      return st && st.nonEmpty > 0 && st.numeric / st.nonEmpty >= 0.6;
    })
    .map((c) => c.name);

  const detectedWeightColumn =
    colKg?.name || colTm?.name || colGenericWeight?.name;
  const detectedWeightUnit: 'kg' | 'tm' | 'none' = colKg || colGenericWeight
    ? 'kg'
    : colTm
    ? 'tm'
    : 'none';

  return {
    records,
    columns,
    numericColumns,
    detectedWeightColumn,
    detectedWeightUnit,
  };
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
