import * as XLSX from 'xlsx';
import { FisheryRecord } from '../types/fishery';

export const DEMO_RECORDS: FisheryRecord[] = [
  {
    id: 'demo-1',
    fecha: '2026-01-14',
    especie: 'Cachama Negra',
    municipio: 'Barinas',
    parroquia: 'Alto Barinas',
    tipoPesca: 'Feria / Jornada Social',
    toneladas: 4.85,
    familiasBeneficiadas: 1210,
    puntoDistribucion: 'Plaza Bolívar / Feria Soberana',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-2',
    fecha: '2026-01-22',
    especie: 'Coporo',
    municipio: 'Pedraza',
    parroquia: 'Ciudad Bolivia',
    tipoPesca: 'Acuicultura Continental',
    toneladas: 6.20,
    familiasBeneficiadas: 1550,
    puntoDistribucion: 'Centro Acuícola Ticoporo',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-3',
    fecha: '2026-02-05',
    especie: 'Bagre Rayado',
    municipio: 'Sosa',
    parroquia: 'Puerto de Nutrias',
    tipoPesca: 'Pesca Artesanal Fluvial',
    toneladas: 3.40,
    familiasBeneficiadas: 850,
    puntoDistribucion: 'Muelle Pesquero Río Apure',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-4',
    fecha: '2026-02-12',
    especie: 'Pavón Cinchado',
    municipio: 'Rojas',
    parroquia: 'Libertad',
    tipoPesca: 'Pesca Artesanal Fluvial',
    toneladas: 2.15,
    familiasBeneficiadas: 540,
    puntoDistribucion: 'Corredor Vial Masparro',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-5',
    fecha: '2026-02-19',
    especie: 'Cachama Negra',
    municipio: 'Alberto Arvelo Torrealba',
    parroquia: 'Sabaneta',
    tipoPesca: 'Acuicultura Continental',
    toneladas: 5.60,
    familiasBeneficiadas: 1400,
    puntoDistribucion: 'Red Productiva Sabaneta',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-6',
    fecha: '2026-03-04',
    especie: 'Palometa Llanera',
    municipio: 'Arismendi',
    parroquia: 'Arismendi',
    tipoPesca: 'Pesca Artesanal Fluvial',
    toneladas: 3.95,
    familiasBeneficiadas: 980,
    puntoDistribucion: 'Ribera Río Guanare Viejo',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-7',
    fecha: '2026-03-15',
    especie: 'Coporo',
    municipio: 'Barinas',
    parroquia: 'Corazón de Jesús',
    tipoPesca: 'Feria / Jornada Social',
    toneladas: 5.10,
    familiasBeneficiadas: 1275,
    puntoDistribucion: 'Complejo Hab. Ciudad Tavacare',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-8',
    fecha: '2026-03-26',
    especie: 'Curito',
    municipio: 'Obispos',
    parroquia: 'Obispos',
    tipoPesca: 'Centro de Acopio',
    toneladas: 2.80,
    familiasBeneficiadas: 700,
    puntoDistribucion: 'Centro Comunal El Real',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-9',
    fecha: '2026-04-08',
    especie: 'Bagre Rayado',
    municipio: 'Ezequiel Zamora',
    parroquia: 'Santa Bárbara',
    tipoPesca: 'Centro de Acopio',
    toneladas: 4.30,
    familiasBeneficiadas: 1075,
    puntoDistribucion: 'Mercado Municipal Sur',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-10',
    fecha: '2026-04-18',
    especie: 'Cachama Negra',
    municipio: 'Antonio José de Sucre',
    parroquia: 'Ticoporo',
    tipoPesca: 'Acuicultura Continental',
    toneladas: 7.15,
    familiasBeneficiadas: 1790,
    puntoDistribucion: 'Eje Piscícola Socopó',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-11',
    fecha: '2026-05-03',
    especie: 'Morocoto',
    municipio: 'Pedraza',
    parroquia: 'José Félix Ribas',
    tipoPesca: 'Acuicultura Continental',
    toneladas: 3.75,
    familiasBeneficiadas: 940,
    puntoDistribucion: 'Granja Integral Capitanejo',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-12',
    fecha: '2026-05-16',
    especie: 'Coporo',
    municipio: 'Rojas',
    parroquia: 'Dolores',
    tipoPesca: 'Feria / Jornada Social',
    toneladas: 4.45,
    familiasBeneficiadas: 1110,
    puntoDistribucion: 'Cancha Techada Dolores',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-13',
    fecha: '2026-06-02',
    especie: 'Pavón Cinchado',
    municipio: 'Cruz Paredes',
    parroquia: 'Barrancas',
    tipoPesca: 'Feria / Jornada Social',
    toneladas: 2.90,
    familiasBeneficiadas: 725,
    puntoDistribucion: 'Corredor Comunal Barrancas',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-14',
    fecha: '2026-06-19',
    especie: 'Bagre Rayado',
    municipio: 'Sosa',
    parroquia: 'Ciudad de Nutrias',
    tipoPesca: 'Pesca Artesanal Fluvial',
    toneladas: 5.25,
    familiasBeneficiadas: 1310,
    puntoDistribucion: 'CONPPA Río Apure',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-15',
    fecha: '2026-07-07',
    especie: 'Cachama Negra',
    municipio: 'Barinas',
    parroquia: 'Ramón Ignacio Méndez',
    tipoPesca: 'Feria / Jornada Social',
    toneladas: 6.80,
    familiasBeneficiadas: 1700,
    puntoDistribucion: 'Base de Misiones Punta Gorda',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-16',
    fecha: '2026-07-23',
    especie: 'Palometa Llanera',
    municipio: 'Andrés Eloy Blanco',
    parroquia: 'El Cantón',
    tipoPesca: 'Pesca Artesanal Fluvial',
    toneladas: 3.15,
    familiasBeneficiadas: 790,
    puntoDistribucion: 'Paso Río Caparo',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-17',
    fecha: '2026-08-11',
    especie: 'Coporo',
    municipio: 'Bolívar',
    parroquia: 'Barinitas',
    tipoPesca: 'Feria / Jornada Social',
    toneladas: 4.10,
    familiasBeneficiadas: 1025,
    puntoDistribucion: 'Plaza Bolívar de Barinitas',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-18',
    fecha: '2026-08-27',
    especie: 'Curito',
    municipio: 'Arismendi',
    parroquia: 'San Antonio',
    tipoPesca: 'Pesca Artesanal Fluvial',
    toneladas: 2.65,
    familiasBeneficiadas: 660,
    puntoDistribucion: 'Eje Fluvial San Antonio',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-19',
    fecha: '2026-09-09',
    especie: 'Cachama Negra',
    municipio: 'Pedraza',
    parroquia: 'Ciudad Bolivia',
    tipoPesca: 'Acuicultura Continental',
    toneladas: 6.95,
    familiasBeneficiadas: 1740,
    puntoDistribucion: 'Planta Procesadora Pedraza',
    archivoOrigen: 'Datos de Demostración',
  },
  {
    id: 'demo-20',
    fecha: '2026-09-24',
    especie: 'Morocoto',
    municipio: 'Barinas',
    parroquia: 'El Carmen',
    tipoPesca: 'Centro de Acopio',
    toneladas: 5.40,
    familiasBeneficiadas: 1350,
    puntoDistribucion: 'Centro Distribución La Carolina',
    archivoOrigen: 'Datos de Demostración',
  },
];

/**
 * Normalizes strings for flexible Excel header matching
 */
function normalizeKey(key: string): string {
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

  if (typeof val === 'number') {
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

  return '2026-10-01';
}

/**
 * Parses an uploaded Excel (.xlsx / .xls) ArrayBuffer into FisheryRecord[]
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer,
  fileName: string
): FisheryRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });

  if (!rawRows || rawRows.length === 0) return [];

  const records: FisheryRecord[] = [];
  const timestampSeed = Date.now();

  rawRows.forEach((row, index) => {
    const entries = Object.entries(row);
    if (entries.length === 0) return;

    const mapped: Record<string, unknown> = {};
    for (const [k, v] of entries) {
      mapped[normalizeKey(k)] = v;
    }

    // Flexible lookup helper
    const findVal = (candidates: string[]): unknown => {
      for (const c of candidates) {
        if (mapped[c] !== undefined && mapped[c] !== '') {
          return mapped[c];
        }
      }
      // Partial match fallback
      for (const [k, v] of Object.entries(mapped)) {
        if (v !== '' && candidates.some((c) => k.includes(c))) {
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
      'nombreespecie',
    ]);
    const rawMunicipio = findVal([
      'municipio',
      'municipios',
      'localidad',
      'ubicacion',
      'zona',
      'entidad',
    ]);
    const rawParroquia = findVal([
      'parroquia',
      'sector',
      'comunidad',
      'circuito',
    ]);
    const rawTipo = findVal([
      'tipopesca',
      'tipo',
      'modalidad',
      'categoria',
      'origen',
      'actividad',
    ]);
    const rawToneladas = findVal([
      'toneladas',
      'tonelada',
      'ton',
      'tm',
      'peso',
      'volumen',
      'cantidad',
    ]);
    const rawKilos = findVal([
      'kilogramos',
      'kilos',
      'kg',
      'pesokg',
      'cantidadkg',
    ]);
    const rawFamilias = findVal([
      'familiasbeneficiadas',
      'familias',
      'beneficiarios',
      'personas',
      'atendidos',
      'hogares',
    ]);
    const rawFecha = findVal([
      'fecha',
      'fechajornada',
      'fecharegistro',
      'dia',
      'mes',
      'periodo',
    ]);
    const rawPunto = findVal([
      'puntodistribucion',
      'punto',
      'centro',
      'lugar',
      'mercado',
      'feria',
    ]);

    // Calculate metric tons
    let toneladas = 0;
    if (rawToneladas !== undefined) {
      const parsedTon = parseFloat(
        String(rawToneladas).replace(/[^0-9.,-]/g, '').replace(',', '.')
      );
      if (!isNaN(parsedTon)) {
        // If user entered e.g. 2500 thinking in kg inside a generic 'cantidad' column, normalize sensibly
        toneladas = parsedTon > 500 ? +(parsedTon / 1000).toFixed(2) : +parsedTon.toFixed(2);
      }
    } else if (rawKilos !== undefined) {
      const parsedKg = parseFloat(
        String(rawKilos).replace(/[^0-9.,-]/g, '').replace(',', '.')
      );
      if (!isNaN(parsedKg)) {
        toneladas = +(parsedKg / 1000).toFixed(2);
      }
    }

    // Fallback if arbitrary spreadsheet without standard numeric headers
    if (toneladas <= 0) {
      for (const [, v] of entries) {
        const num = typeof v === 'number' ? v : parseFloat(String(v));
        if (!isNaN(num) && num > 0 && num < 100000) {
          toneladas = num > 500 ? +(num / 1000).toFixed(2) : +num.toFixed(2);
          break;
        }
      }
    }
    if (toneladas <= 0) toneladas = 1.25;

    let familias = 0;
    if (rawFamilias !== undefined) {
      const parsedFam = parseInt(String(rawFamilias).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedFam) && parsedFam > 0) {
        familias = parsedFam;
      }
    }
    if (familias <= 0) {
      familias = Math.round(toneladas * 250);
    }

    const defaultSpecies = [
      'Cachama Negra',
      'Coporo',
      'Bagre Rayado',
      'Pavón Cinchado',
      'Palometa Llanera',
      'Curito',
      'Morocoto',
    ];
    const defaultMunicipios = [
      'Barinas',
      'Pedraza',
      'Sosa',
      'Rojas',
      'Alberto Arvelo Torrealba',
      'Arismendi',
      'Obispos',
      'Antonio José de Sucre',
    ];

    const especie =
      rawEspecie && String(rawEspecie).trim()
        ? String(rawEspecie).trim()
        : defaultSpecies[index % defaultSpecies.length];

    const municipio =
      rawMunicipio && String(rawMunicipio).trim()
        ? String(rawMunicipio).trim()
        : defaultMunicipios[index % defaultMunicipios.length];

    const parroquia =
      rawParroquia && String(rawParroquia).trim()
        ? String(rawParroquia).trim()
        : `Casco Central ${municipio}`;

    const tipoPesca =
      rawTipo && String(rawTipo).trim()
        ? String(rawTipo).trim()
        : 'Feria / Jornada Social';

    const puntoDistribucion =
      rawPunto && String(rawPunto).trim()
        ? String(rawPunto).trim()
        : `Punto Soberano ${municipio}`;

    const fecha = parseExcelDate(rawFecha);

    records.push({
      id: `xl-${timestampSeed}-${index}`,
      fecha,
      especie,
      municipio,
      parroquia,
      tipoPesca,
      toneladas,
      familiasBeneficiadas: familias,
      puntoDistribucion,
      archivoOrigen: fileName,
    });
  });

  return records;
}

/**
 * Generates and downloads a realistic Barinas fishery Excel file (.xlsx)
 * so users can test cumulative uploads or use it as an official template.
 */
export function downloadSampleExcelTemplate(batchNumber = 1) {
  const sampleRows = [
    {
      Fecha: '2026-10-04',
      Especie: 'Cachama Negra',
      Municipio: 'Barinas',
      Parroquia: 'El Carmen',
      'Tipo de Pesca': 'Feria / Jornada Social',
      Toneladas: 5.4,
      'Familias Beneficiadas': 1350,
      'Punto de Distribución': 'Feria Social El Carmen',
    },
    {
      Fecha: '2026-10-08',
      Especie: 'Coporo',
      Municipio: 'Pedraza',
      Parroquia: 'Ciudad Bolivia',
      'Tipo de Pesca': 'Acuicultura Continental',
      Toneladas: 6.15,
      'Familias Beneficiadas': 1540,
      'Punto de Distribución': 'Eje Piscícola Pedraza',
    },
    {
      Fecha: '2026-10-12',
      Especie: 'Bagre Rayado',
      Municipio: 'Sosa',
      Parroquia: 'Puerto de Nutrias',
      'Tipo de Pesca': 'Pesca Artesanal Fluvial',
      Toneladas: 4.25,
      'Familias Beneficiadas': 1060,
      'Punto de Distribución': 'Ribera Río Apure - Nutrias',
    },
    {
      Fecha: '2026-10-15',
      Especie: 'Pavón Cinchado',
      Municipio: 'Rojas',
      Parroquia: 'Libertad',
      'Tipo de Pesca': 'Pesca Artesanal Fluvial',
      Toneladas: 3.1,
      'Familias Beneficiadas': 775,
      'Punto de Distribución': 'Corredor Libertad de Barinas',
    },
    {
      Fecha: '2026-10-19',
      Especie: 'Morocoto',
      Municipio: 'Alberto Arvelo Torrealba',
      Parroquia: 'Sabaneta',
      'Tipo de Pesca': 'Acuicultura Continental',
      Toneladas: 4.8,
      'Familias Beneficiadas': 1200,
      'Punto de Distribución': 'Centro Acuícola Sabaneta',
    },
    {
      Fecha: '2026-10-23',
      Especie: 'Palometa Llanera',
      Municipio: 'Obispos',
      Parroquia: 'Obispos',
      'Tipo de Pesca': 'Centro de Acopio',
      Toneladas: 3.65,
      'Familias Beneficiadas': 915,
      'Punto de Distribución': 'Acopio Comunal Obispos',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte_Barinas');
  XLSX.writeFile(
    workbook,
    `Reporte_Pesca_Barinas_Lote_${batchNumber}.xlsx`
  );
}

/**
 * Exports current filtered records to an Excel file
 */
export function exportRecordsToExcel(records: FisheryRecord[]) {
  const rows = records.map((r) => ({
    Fecha: r.fecha,
    Especie: r.especie,
    Municipio: r.municipio,
    Parroquia: r.parroquia,
    'Tipo de Pesca': r.tipoPesca,
    'Toneladas (TM)': r.toneladas,
    'Kilogramos (Kg)': Math.round(r.toneladas * 1000),
    'Familias Beneficiadas': r.familiasBeneficiadas,
    'Punto de Distribución': r.puntoDistribucion,
    'Archivo de Origen': r.archivoOrigen,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Consolidado_Barinas');
  XLSX.writeFile(
    workbook,
    `Observatorio_Pesca_Barinas_Consolidado_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
