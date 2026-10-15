import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { analyzeImageQuality } from '../services/imageQuality.ts';
import {
  calculateAffineCalibration,
  applyCalibrationMatrix,
  buildColorData,
  STANDARD_REFERENCE_TARGETS,
} from '../services/calibration.ts';
import { extractPatchColor, generateSimulatedInterpretation } from '../services/analysis.ts';
import { getAllScans, getScanById, insertScan, deleteScan } from '../services/db.ts';
import { CalibrationTarget, ScanRecord } from '../types.ts';

const router = Router();

// Configure temporary upload folder
const UPLOAD_DIR = path.resolve(process.cwd(), 'temp_uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `upload_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are permitted.'));
    }
  },
});

// Helper to safely read and remove uploaded file or parse Base64
async function getImageBuffer(
  req: Request
): Promise<{ buffer: Buffer; tempPath: string | null }> {
  if (req.file) {
    const tempPath = req.file.path;
    const buffer = await fs.promises.readFile(tempPath);
    return { buffer, tempPath };
  }

  if (req.body && req.body.imageBase64) {
    const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    return { buffer, tempPath: null };
  }

  throw new Error('No image provided. Upload a file or provide imageBase64 data.');
}

async function cleanupTempFile(tempPath: string | null) {
  if (tempPath) {
    try {
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
    } catch (e) {
      console.warn('Failed to clean up temp file:', tempPath, e);
    }
  }
}

// 1. POST /api/scans/quality-check
router.post('/quality-check', upload.single('image'), async (req: Request, res: Response) => {
  let tempPath: string | null = null;
  try {
    const { buffer, tempPath: tPath } = await getImageBuffer(req);
    tempPath = tPath;

    const metrics = await analyzeImageQuality(buffer);
    res.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Image quality check failed',
    });
  } finally {
    await cleanupTempFile(tempPath);
  }
});

// 2. POST /api/scans/calibrate
const CalibrateBodySchema = z.object({
  targets: z.array(
    z.object({
      name: z.string(),
      expectedRgb: z.tuple([z.number(), z.number(), z.number()]),
      measuredRgb: z.tuple([z.number(), z.number(), z.number()]).optional(),
      box: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
        })
        .optional(),
    })
  ),
});

router.post('/calibrate', (req: Request, res: Response) => {
  try {
    const parsed = CalibrateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid calibration payload: ' + parsed.error.issues.map((i) => i.message).join(', '),
      });
    }

    const calibrationResult = calculateAffineCalibration(parsed.data.targets as CalibrationTarget[]);
    res.json(calibrationResult);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Calibration computation failed',
    });
  }
});

// 3. POST /api/scans/analyze
router.post('/analyze', upload.single('image'), async (req: Request, res: Response) => {
  let tempPath: string | null = null;
  try {
    const { buffer, tempPath: tPath } = await getImageBuffer(req);
    tempPath = tPath;

    // Parse coordinates & calibration matrix from body
    let patchCoordinates = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 };
    if (req.body.patchCoordinates) {
      try {
        patchCoordinates = typeof req.body.patchCoordinates === 'string'
          ? JSON.parse(req.body.patchCoordinates)
          : req.body.patchCoordinates;
      } catch (e) {
        // use default
      }
    }

    let calibrationMatrix: number[][] | null = null;
    if (req.body.calibrationMatrix) {
      try {
        calibrationMatrix = typeof req.body.calibrationMatrix === 'string'
          ? JSON.parse(req.body.calibrationMatrix)
          : req.body.calibrationMatrix;
      } catch (e) {
        // leave null
      }
    }

    let calibrationResult = null;
    if (req.body.calibrationResult) {
      try {
        calibrationResult = typeof req.body.calibrationResult === 'string'
          ? JSON.parse(req.body.calibrationResult)
          : req.body.calibrationResult;
      } catch (e) {
        // leave null
      }
    }

    const title = req.body.title || `Opti-Scan ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const notes = req.body.notes || '';
    const isSimulated = req.body.isSimulated === 'true' || req.body.isSimulated === true;

    // 1. Run genuine image quality checks
    const qualityMetrics = await analyzeImageQuality(buffer);

    // 2. Extract representative patch color (trimmed mean)
    const { rawColor, patchThumbnailBase64 } = await extractPatchColor(buffer, patchCoordinates);

    // 3. Apply calibration if matrix exists
    let calibratedColor = null;
    let isCalibrated = false;

    if (calibrationMatrix && Array.isArray(calibrationMatrix) && calibrationMatrix.length === 4) {
      const calRgb = applyCalibrationMatrix([rawColor.r, rawColor.g, rawColor.b], calibrationMatrix);
      calibratedColor = buildColorData(calRgb[0], calRgb[1], calRgb[2]);
      isCalibrated = true;
    }

    // 4. Simulated research prototype interpretation
    const activeColor = calibratedColor || rawColor;
    const simulatedInterpretation = generateSimulatedInterpretation(activeColor);

    // 5. Build full scan record
    const scanId = `scan-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const scanRecord: ScanRecord = {
      id: scanId,
      timestamp: new Date().toISOString(),
      title,
      rawColor,
      calibratedColor,
      hexCode: calibratedColor ? calibratedColor.hex : rawColor.hex,
      isCalibrated,
      calibrationResult,
      qualityMetrics,
      patchThumbnail: patchThumbnailBase64,
      patchCoordinates,
      isSimulated,
      simulatedInterpretation,
      notes,
    };

    // Save to SQLite
    await insertScan(scanRecord);

    res.status(201).json({
      success: true,
      scan: scanRecord,
    });
  } catch (error: any) {
    console.error('Error during scan analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Image analysis failed',
    });
  } finally {
    await cleanupTempFile(tempPath);
  }
});

// 4. GET /api/scans
router.get('/', async (req: Request, res: Response) => {
  try {
    const allScans = await getAllScans();
    const simulatedFilter = req.query.simulated;

    let filtered = allScans;
    if (simulatedFilter === 'true') {
      filtered = allScans.filter((s) => s.isSimulated);
    } else if (simulatedFilter === 'false') {
      filtered = allScans.filter((s) => !s.isSimulated);
    }

    res.json({
      success: true,
      count: filtered.length,
      scans: filtered,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scans',
    });
  }
});

// 5. GET /api/scans/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const scan = await getScanById(req.params.id);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan record not found',
      });
    }
    res.json({
      success: true,
      scan,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch scan detail',
    });
  }
});

// 6. DELETE /api/scans/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await deleteScan(req.params.id);
    res.json({
      success: deleted,
      message: 'Scan deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete scan',
    });
  }
});

export default router;
