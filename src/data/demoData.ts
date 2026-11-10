import * as XLSX from 'xlsx';
import { FisheryRecord } from '../types/fishery';

/**
 * Normalizes strings for flexible Excel header matching
 */
export function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Converts Excel serial date or date string to YYYY-MM-DD
 */
function parseExcelDate(val: unknown): string {
  if (!val) return new Date().toISOString().slice(0, 10);

  if (typeof val === 'number' && val > 20000 && val < 80000) {
    // Excel serial date
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    if (!isNaN(dateInfo.getTime())) {
      return dateInfo.toISOString().slice(0, 10);
    }
  }

  const str = String(val).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return str || new Date().toISOString().slice(0, 10);
}

/**
 * Parses an uploaded Excel (.xlsx / .xls / .csv) ArrayBuffer into FisheryRecord[]
 * and returns the exact list of column headers detected in the Excel format.
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer,
  fileName: string
): { records: FisheryRecord[]; columns: string[] } {
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Find the first non-empty sheet
  let targetSheet: XLSX.WorkSheet | null = null;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (sheet && sheet['!ref']) {
      targetSheet = sheet;
      break;
    }
  }

  if (!targetSheet) return { records: [], columns: [] };

  // Read as 2D array first so we can locate the true header row even if there is an institutional title above it
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(targetSheet, {
    header: 1,
    defval: '',
  });

  if (!matrix || matrix.length === 0) return { records: [], columns: [] };

  // Find the best header row in the first 12 rows (the row with the most non-empty string cells)
  let headerRowIndex = 0;
  let maxNonEmptyCells = 0;

  const scanLimit = Math.min(12, matrix.length);
  for (let r = 0; r < scanLimit; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const nonEmptyCount = row.filter(
      (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''
    ).length;
    if (nonEmptyCount > maxNonEmptyCells && nonEmptyCount >= 2) {
      maxNonEmptyCells = nonEmptyCount;
      headerRowIndex = r;
    }
  }

  const rawHeaders = (matrix[headerRowIndex] || []) as unknown[];
  const columns: string[] = [];
  const colIndexMap: { index: number; name: string; norm: string }[] = [];

  rawHeaders.forEach((h, idx) => {
    const cleanName = String(h ?? '').trim();
    if (cleanName && !cleanName.startsWith('__EMPTY')) {
      // Avoid duplicate header names
      const uniqueName = columns.includes(cleanName)
        ? `${cleanName} (${idx + 1})`
        : cleanName;
      columns.push(uniqueName);
      colIndexMap.push({
        index: idx,
        name: uniqueName,
        norm: normalizeKey(uniqueName),
      });
    }
  });

  const records: FisheryRecord[] = [];
  const timestampSeed = Date.now();

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    // Skip completely empty rows or total/summary footer rows
    const nonEmptyValues = colIndexMap
      .map((c) => row[c.index])
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    if (nonEmptyValues.length === 0) continue;

    const firstCellStr = String(row[colIndexMap[0]?.index] ?? '')
      .trim()
      .toLowerCase();
    if (
      firstCellStr === 'total' ||
      firstCellStr === 'totales' ||
      firstCellStr === 'subtotal'
    ) {
      continue;
    }

    const rawFields: Record<string, string> = {};
    const mappedNorm: Record<string, unknown> = {};

    colIndexMap.forEach((c) => {
      const cellVal = row[c.index];
      const strVal =
        cellVal !== null && cellVal !== undefined ? String(cellVal).trim() : '';
      rawFields[c.name] = strVal;
      mappedNorm[c.norm] = cellVal;
    });

    // Helper to find value by candidate normalized column names
    const findVal = (candidates: string[]): unknown => {
      for (const cand of candidates) {
        if (mappedNorm[cand] !== undefined && mappedNorm[cand] !== '') {
          return mappedNorm[cand];
        }
      }
      for (const [k, v] of Object.entries(mappedNorm)) {
        if (v !== '' && candidates.some((cand) => k.includes(cand))) {
          return v;
        }
      }
      return undefined;
    };

    const rawEspecie = findVal([
      'especie',
      'especies',
      'pescado',
      'rubro',
      'producto',
      'variedad',
      'proteina',
      'tipo',
    ]);
    const rawMunicipio = findVal([
      'municipio',
      'municipios',
      'localidad',
      'ubicacion',
      'zona',
      'entidad',
      'territorio',
    ]);
    const rawParroquia = findVal([
      'parroquia',
      'sector',
      'comunidad',
      'circuito',
      'comuna',
    ]);
    const rawTipo = findVal([
      'tipopesca',
      'modalidad',
      'categoria',
      'origen',
      'actividad',
      'operativo',
      'programa',
      'feria',
    ]);
    const rawToneladas = findVal([
      'toneladas',
      'tonelada',
      'ton',
      'tm',
      'volumen',
      'pesotm',
    ]);
    const rawKilos = findVal([
      'kilogramos',
      'kilos',
      'kg',
      'peso',
      'pesokg',
      'cantidadkg',
      'cantidad',
      'venta',
      'distribuido',
    ]);
    const rawFamilias = findVal([
      'familiasbeneficiadas',
      'familias',
      'beneficiarios',
      'personas',
      'atendidos',
      'hogares',
      'habitantes',
    ]);
    const rawFecha = findVal([
      'fecha',
      'fechajornada',
      'fecharegistro',
      'dia',
      'mes',
      'periodo',
      'semana',
    ]);
    const rawPunto = findVal([
      'puntodistribucion',
      'punto',
      'centro',
      'lugar',
      'mercado',
      'direccion',
      'comunidad',
      'conppa',
    ]);

    // Calculate metric tons
    let toneladas = 0;
    if (rawToneladas !== undefined && String(rawToneladas).trim() !== '') {
      const parsedTon = parseFloat(
        String(rawToneladas).replace(/[^0-9.,-]/g, '').replace(',', '.')
      );
      if (!isNaN(parsedTon) && parsedTon > 0) {
        toneladas = +parsedTon.toFixed(3);
      }
    } else if (rawKilos !== undefined && String(rawKilos).trim() !== '') {
      const parsedKg = parseFloat(
        String(rawKilos).replace(/[^0-9.,-]/g, '').replace(',', '.')
      );
      if (!isNaN(parsedKg) && parsedKg > 0) {
        // If column header explicitly says kg/kilos or number is > 50, convert kg to TM; otherwise keep as TM
        const isExplicitKg = Object.keys(mappedNorm).some(
          (k) => k.includes('kg') || k.includes('kilo')
        );
        toneladas =
          isExplicitKg || parsedKg > 50
            ? +(parsedKg / 1000).toFixed(3)
            : +parsedKg.toFixed(3);
      }
    }

    // Fallback numeric detection if columns have custom names
    if (toneladas <= 0) {
      for (const c of colIndexMap) {
        const v = row[c.index];
        if (
          c.norm.includes('fecha') ||
          c.norm.includes('ano') ||
          c.norm.includes('id') ||
          c.norm.includes('nro') ||
          c.norm.includes('num') ||
          c.norm.includes('familia') ||
          c.norm.includes('beneficiario')
        ) {
          continue;
        }
        const num =
          typeof v === 'number'
            ? v
            : parseFloat(String(v).replace(/[^0-9.,-]/g, '').replace(',', '.'));
        if (!isNaN(num) && num > 0 && num < 500000) {
          toneladas = num > 100 ? +(num / 1000).toFixed(3) : +num.toFixed(3);
          break;
        }
      }
    }

    let familias = 0;
    if (rawFamilias !== undefined && String(rawFamilias).trim() !== '') {
      const parsedFam = parseInt(
        String(rawFamilias).replace(/[^0-9]/g, ''),
        10
      );
      if (!isNaN(parsedFam) && parsedFam >= 0) {
        familias = parsedFam;
      }
    }
    if (familias <= 0 && toneladas > 0) {
      familias = Math.round(toneladas * 250);
    }

    // Pick best text columns for especie & municipio if custom column names are used
    const textColumns = colIndexMap
      .map((c) => ({ norm: c.norm, val: rawFields[c.name] }))
      .filter((x) => x.val && isNaN(Number(x.val)));

    const especie =
      rawEspecie && String(rawEspecie).trim()
        ? String(rawEspecie).trim()
        : textColumns[0]?.val || 'Sin Especificar';

    const municipio =
      rawMunicipio && String(rawMunicipio).trim()
        ? String(rawMunicipio).trim()
        : textColumns[1]?.val || 'Barinas';

    const parroquia =
      rawParroquia && String(rawParroquia).trim()
        ? String(rawParroquia).trim()
        : textColumns[2]?.val || '-';

    const tipoPesca =
      rawTipo && String(rawTipo).trim()
        ? String(rawTipo).trim()
        : 'Jornada Venezuela Come Pescado';

    const puntoDistribucion =
      rawPunto && String(rawPunto).trim()
        ? String(rawPunto).trim()
        : parroquia !== '-'
        ? parroquia
        : municipio;

    const fecha = parseExcelDate(rawFecha);

    // Format date values inside rawFields if they were Excel serial dates
    colIndexMap.forEach((c) => {
      if (c.norm.includes('fecha') || c.norm.includes('dia')) {
        rawFields[c.name] = parseExcelDate(row[c.index]);
      }
    });

    records.push({
      id: `xl-${timestampSeed}-${r}`,
      fecha,
      especie,
      municipio,
      parroquia,
      tipoPesca,
      toneladas,
      familiasBeneficiadas: familias,
      puntoDistribucion,
      archivoOrigen: fileName,
      rawFields,
    });
  }

  return { records, columns };
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
      Modalidad: r.tipoPesca,
      'Toneladas (TM)': r.toneladas,
      'Kilogramos (Kg)': Math.round(r.toneladas * 1000),
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
