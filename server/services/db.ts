import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { ScanRecord, QualityMetrics, CalibrationResult, ColorData } from '../types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'opticycle.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Failed reading existing SQLite DB, initializing fresh:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Create tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      title TEXT NOT NULL,
      raw_r INTEGER NOT NULL,
      raw_g INTEGER NOT NULL,
      raw_b INTEGER NOT NULL,
      raw_hex TEXT NOT NULL,
      raw_lab TEXT NOT NULL,
      raw_hsv TEXT NOT NULL,
      calibrated_r INTEGER,
      calibrated_g INTEGER,
      calibrated_b INTEGER,
      calibrated_hex TEXT,
      calibrated_lab TEXT,
      calibrated_hsv TEXT,
      is_calibrated INTEGER NOT NULL DEFAULT 0,
      calibration_result TEXT,
      quality_status TEXT NOT NULL,
      quality_metrics TEXT NOT NULL,
      patch_thumbnail TEXT NOT NULL,
      patch_coordinates TEXT NOT NULL,
      is_simulated INTEGER NOT NULL DEFAULT 0,
      simulated_interpretation TEXT NOT NULL,
      notes TEXT
    );
  `);

  saveDb();
  seedIfEmpty();

  return dbInstance;
}

function saveDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function seedIfEmpty() {
  if (!dbInstance) return;
  const res = dbInstance.exec('SELECT COUNT(*) as count FROM scans');
  const count = res[0]?.values[0]?.[0] as number || 0;

  if (count === 0) {
    console.log('Seeding initial benchmark simulated scans...');
    const seedScans: ScanRecord[] = [
      {
        id: 'seed-scan-001',
        timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        title: 'Cycle Day 08 - Baseline Patch Reference',
        rawColor: {
          r: 228,
          g: 178,
          b: 195,
          hex: '#E4B2C3',
          lab: { l: 76.2, a: 22.4, b: 3.1 },
          hsv: { h: 340, s: 22, v: 89 },
        },
        calibratedColor: {
          r: 232,
          g: 172,
          b: 191,
          hex: '#E8ACBF',
          lab: { l: 75.1, a: 24.8, b: 3.9 },
          hsv: { h: 341, s: 26, v: 91 },
        },
        hexCode: '#E8ACBF',
        isCalibrated: true,
        calibrationResult: {
          success: true,
          matrix: [
            [1.02, -0.01, 0.01],
            [-0.03, 0.98, 0.02],
            [0.01, -0.02, 1.01],
            [4.1, -2.3, 1.5],
          ],
          rmse: 4.8,
          status: 'calibrated',
          message: '6-point affine calibration verified (RMSE: 4.8).',
          targets: [],
        },
        qualityMetrics: {
          blurScore: 182,
          blurStatus: 'pass',
          brightnessScore: 142,
          brightnessStatus: 'pass',
          exposureScore: 1.2,
          exposureStatus: 'pass',
          dimensionsScore: { width: 1280, height: 960 },
          dimensionsStatus: 'pass',
          glareScore: 0.8,
          glareStatus: 'pass',
          overallStatus: 'pass',
          retakeRecommended: false,
          retakeMessage: null,
        },
        patchThumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23E8ACBF"/><circle cx="40" cy="40" r="26" fill="%23E09CB3" stroke="%23fff" stroke-width="2"/></svg>',
        patchCoordinates: { x: 0.42, y: 0.38, width: 0.16, height: 0.24 },
        isSimulated: true,
        simulatedInterpretation: {
          chromaticIndex: 0.28,
          relativeBandIntensity: 'Low',
          confidenceInterval: '±0.05 OD',
          researchNote: 'Baseline chromatic reflectivity. Consistent with early follicular observation.',
          cyclePhaseHypothesis: 'Early Follicular (Hypothesized)',
          clinicalDisclaimer: 'Research prototype. Results are experimental and not clinically validated. Not for diagnosis or treatment.',
        },
        notes: 'Simulated reference scan for diffuse indoor lighting validation.',
      },
      {
        id: 'seed-scan-002',
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        title: 'Cycle Day 11 - Mid-Phase Test Strip',
        rawColor: {
          r: 215,
          g: 130,
          b: 165,
          hex: '#D782A5',
          lab: { l: 63.4, a: 39.1, b: 2.8 },
          hsv: { h: 335, s: 40, v: 84 },
        },
        calibratedColor: {
          r: 219,
          g: 124,
          b: 160,
          hex: '#DB7CA0',
          lab: { l: 62.1, a: 42.0, b: 3.5 },
          hsv: { h: 337, s: 43, v: 86 },
        },
        hexCode: '#DB7CA0',
        isCalibrated: true,
        calibrationResult: {
          success: true,
          matrix: [
            [1.01, -0.02, 0.01],
            [-0.02, 0.99, 0.01],
            [0.00, -0.01, 1.02],
            [2.5, -3.1, 0.8],
          ],
          rmse: 5.2,
          status: 'calibrated',
          message: 'Affine matrix fitted with residual error RMSE: 5.2.',
          targets: [],
        },
        qualityMetrics: {
          blurScore: 165,
          blurStatus: 'pass',
          brightnessScore: 138,
          brightnessStatus: 'pass',
          exposureScore: 2.1,
          exposureStatus: 'pass',
          dimensionsScore: { width: 1280, height: 960 },
          dimensionsStatus: 'pass',
          glareScore: 1.4,
          glareStatus: 'pass',
          overallStatus: 'pass',
          retakeRecommended: false,
          retakeMessage: null,
        },
        patchThumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23DB7CA0"/><circle cx="40" cy="40" r="26" fill="%23C96288" stroke="%23fff" stroke-width="2"/></svg>',
        patchCoordinates: { x: 0.45, y: 0.40, width: 0.15, height: 0.22 },
        isSimulated: true,
        simulatedInterpretation: {
          chromaticIndex: 0.54,
          relativeBandIntensity: 'Moderate',
          confidenceInterval: '±0.04 OD',
          researchNote: 'Increased green-light absorption indicates stronger colorimetric test band saturation.',
          cyclePhaseHypothesis: 'Mid-Cycle Rise (Hypothesized)',
          clinicalDisclaimer: 'Research prototype. Results are experimental and not clinically validated. Not for diagnosis or treatment.',
        },
        notes: 'Simulated progressive color transition under 5000K illuminant.',
      },
      {
        id: 'seed-scan-003',
        timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        title: 'Cycle Day 13 - Simulated Peak Surge Band',
        rawColor: {
          r: 202,
          g: 68,
          b: 128,
          hex: '#CA4480',
          lab: { l: 47.8, a: 57.2, b: 7.6 },
          hsv: { h: 333, s: 66, v: 79 },
        },
        calibratedColor: {
          r: 204,
          g: 62,
          b: 122,
          hex: '#CC3E7A',
          lab: { l: 46.5, a: 59.8, b: 8.4 },
          hsv: { h: 335, s: 70, v: 80 },
        },
        hexCode: '#CC3E7A',
        isCalibrated: true,
        calibrationResult: {
          success: true,
          matrix: [
            [1.00, -0.01, 0.02],
            [-0.03, 0.97, 0.03],
            [0.01, -0.02, 1.00],
            [3.0, -1.8, 1.2],
          ],
          rmse: 6.1,
          status: 'calibrated',
          message: 'Affine matrix fitted with residual error RMSE: 6.1.',
          targets: [],
        },
        qualityMetrics: {
          blurScore: 195,
          blurStatus: 'pass',
          brightnessScore: 145,
          brightnessStatus: 'pass',
          exposureScore: 0.9,
          exposureStatus: 'pass',
          dimensionsScore: { width: 1280, height: 960 },
          dimensionsStatus: 'pass',
          glareScore: 0.6,
          glareStatus: 'pass',
          overallStatus: 'pass',
          retakeRecommended: false,
          retakeMessage: null,
        },
        patchThumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="%23CC3E7A"/><circle cx="40" cy="40" r="26" fill="%23B32862" stroke="%23fff" stroke-width="2"/></svg>',
        patchCoordinates: { x: 0.44, y: 0.39, width: 0.16, height: 0.23 },
        isSimulated: true,
        simulatedInterpretation: {
          chromaticIndex: 0.82,
          relativeBandIntensity: 'Peak Indicator (Simulated)',
          confidenceInterval: '±0.03 OD',
          researchNote: 'Pronounced dye aggregation observed. Optical density index reaches simulated peak threshold.',
          cyclePhaseHypothesis: 'LH Surge Candidate (Hypothesized)',
          clinicalDisclaimer: 'Research prototype. Results are experimental and not clinically validated. Not for diagnosis or treatment.',
        },
        notes: 'Simulated high-density colloidal gold lateral flow capture.',
      },
    ];

    for (const scan of seedScans) {
      insertScanDirect(scan);
    }
  }
}

function insertScanDirect(scan: ScanRecord) {
  if (!dbInstance) return;
  const stmt = dbInstance.prepare(`
    INSERT INTO scans (
      id, timestamp, title,
      raw_r, raw_g, raw_b, raw_hex, raw_lab, raw_hsv,
      calibrated_r, calibrated_g, calibrated_b, calibrated_hex, calibrated_lab, calibrated_hsv,
      is_calibrated, calibration_result,
      quality_status, quality_metrics,
      patch_thumbnail, patch_coordinates,
      is_simulated, simulated_interpretation, notes
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?
    )
  `);

  stmt.run([
    scan.id,
    scan.timestamp,
    scan.title,
    scan.rawColor.r,
    scan.rawColor.g,
    scan.rawColor.b,
    scan.rawColor.hex,
    JSON.stringify(scan.rawColor.lab),
    JSON.stringify(scan.rawColor.hsv),
    scan.calibratedColor ? scan.calibratedColor.r : null,
    scan.calibratedColor ? scan.calibratedColor.g : null,
    scan.calibratedColor ? scan.calibratedColor.b : null,
    scan.calibratedColor ? scan.calibratedColor.hex : null,
    scan.calibratedColor ? JSON.stringify(scan.calibratedColor.lab) : null,
    scan.calibratedColor ? JSON.stringify(scan.calibratedColor.hsv) : null,
    scan.isCalibrated ? 1 : 0,
    scan.calibrationResult ? JSON.stringify(scan.calibrationResult) : null,
    scan.qualityMetrics.overallStatus,
    JSON.stringify(scan.qualityMetrics),
    scan.patchThumbnail,
    JSON.stringify(scan.patchCoordinates),
    scan.isSimulated ? 1 : 0,
    JSON.stringify(scan.simulatedInterpretation),
    scan.notes || '',
  ]);
  stmt.free();
  saveDb();
}

export async function insertScan(scan: ScanRecord): Promise<void> {
  await getDb();
  insertScanDirect(scan);
}

export async function getAllScans(): Promise<ScanRecord[]> {
  const db = await getDb();
  const res = db.exec('SELECT * FROM scans ORDER BY timestamp DESC');
  if (!res || !res.length) return [];

  const columns = res[0].columns;
  const values = res[0].values;

  return values.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    const rawColor: ColorData = {
      r: obj.raw_r,
      g: obj.raw_g,
      b: obj.raw_b,
      hex: obj.raw_hex,
      lab: JSON.parse(obj.raw_lab || '{"l":0,"a":0,"b":0}'),
      hsv: JSON.parse(obj.raw_hsv || '{"h":0,"s":0,"v":0}'),
    };

    let calibratedColor: ColorData | null = null;
    if (obj.calibrated_r !== null) {
      calibratedColor = {
        r: obj.calibrated_r,
        g: obj.calibrated_g,
        b: obj.calibrated_b,
        hex: obj.calibrated_hex,
        lab: JSON.parse(obj.calibrated_lab || '{"l":0,"a":0,"b":0}'),
        hsv: JSON.parse(obj.calibrated_hsv || '{"h":0,"s":0,"v":0}'),
      };
    }

    return {
      id: obj.id,
      timestamp: obj.timestamp,
      title: obj.title,
      rawColor,
      calibratedColor,
      hexCode: calibratedColor ? calibratedColor.hex : rawColor.hex,
      isCalibrated: Boolean(obj.is_calibrated),
      calibrationResult: obj.calibration_result ? JSON.parse(obj.calibration_result) : null,
      qualityMetrics: JSON.parse(obj.quality_metrics),
      patchThumbnail: obj.patch_thumbnail,
      patchCoordinates: JSON.parse(obj.patch_coordinates),
      isSimulated: Boolean(obj.is_simulated),
      simulatedInterpretation: JSON.parse(obj.simulated_interpretation),
      notes: obj.notes || '',
    };
  });
}

export async function getScanById(id: string): Promise<ScanRecord | null> {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM scans WHERE id = ?');
  stmt.bind([id]);

  if (!stmt.step()) {
    stmt.free();
    return null;
  }

  const row = stmt.getAsObject();
  stmt.free();

  const rawColor: ColorData = {
    r: row.raw_r as number,
    g: row.raw_g as number,
    b: row.raw_b as number,
    hex: row.raw_hex as string,
    lab: JSON.parse((row.raw_lab as string) || '{"l":0,"a":0,"b":0}'),
    hsv: JSON.parse((row.raw_hsv as string) || '{"h":0,"s":0,"v":0}'),
  };

  let calibratedColor: ColorData | null = null;
  if (row.calibrated_r !== null) {
    calibratedColor = {
      r: row.calibrated_r as number,
      g: row.calibrated_g as number,
      b: row.calibrated_b as number,
      hex: row.calibrated_hex as string,
      lab: JSON.parse((row.calibrated_lab as string) || '{"l":0,"a":0,"b":0}'),
      hsv: JSON.parse((row.calibrated_hsv as string) || '{"h":0,"s":0,"v":0}'),
    };
  }

  return {
    id: row.id as string,
    timestamp: row.timestamp as string,
    title: row.title as string,
    rawColor,
    calibratedColor,
    hexCode: calibratedColor ? calibratedColor.hex : rawColor.hex,
    isCalibrated: Boolean(row.is_calibrated),
    calibrationResult: row.calibration_result ? JSON.parse(row.calibration_result as string) : null,
    qualityMetrics: JSON.parse(row.quality_metrics as string),
    patchThumbnail: row.patch_thumbnail as string,
    patchCoordinates: JSON.parse(row.patch_coordinates as string),
    isSimulated: Boolean(row.is_simulated),
    simulatedInterpretation: JSON.parse(row.simulated_interpretation as string),
    notes: (row.notes as string) || '',
  };
}

export async function deleteScan(id: string): Promise<boolean> {
  const db = await getDb();
  const stmt = db.prepare('DELETE FROM scans WHERE id = ?');
  stmt.run([id]);
  stmt.free();
  saveDb();
  return true;
}
