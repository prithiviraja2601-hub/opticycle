import { QualityMetrics, CalibrationTarget, CalibrationResult, ColorData } from '../types';

/**
 * Standard 6-target calibration card values (sRGB)
 */
export const STANDARD_REFERENCE_TARGETS: CalibrationTarget[] = [
  { name: 'White Reference', expectedRgb: [240, 240, 240] },
  { name: 'Neutral Gray', expectedRgb: [128, 128, 128] },
  { name: 'Black Reference', expectedRgb: [32, 32, 36] },
  { name: 'Opti-Cyan', expectedRgb: [0, 168, 204] },
  { name: 'Opti-Magenta', expectedRgb: [214, 51, 132] },
  { name: 'Opti-Yellow', expectedRgb: [255, 204, 0] },
];

/**
 * Perform genuine client-side image quality checks using an HTMLImageElement or ImageBitmap
 */
export async function clientCheckImageQuality(imageSource: HTMLImageElement | ImageBitmap): Promise<QualityMetrics> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const width = imageSource.width;
  const height = imageSource.height;

  // 1. Dimensions check
  let dimensionsStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (width < 320 || height < 320) {
    dimensionsStatus = 'fail';
  } else if (width < 640 || height < 480) {
    dimensionsStatus = 'warning';
  }

  // Draw scaled down for fast pixel-level stats
  const analysisSize = 320;
  canvas.width = analysisSize;
  canvas.height = analysisSize;
  ctx.drawImage(imageSource, 0, 0, analysisSize, analysisSize);

  const imgData = ctx.getImageData(0, 0, analysisSize, analysisSize);
  const data = imgData.data;
  const pixelCount = analysisSize * analysisSize;

  let totalLuminance = 0;
  let shadowClipped = 0;
  let highlightClipped = 0;
  let glarePixels = 0;

  // Grayscale buffer for Laplacian blur calculation
  const grayBuffer = new Float32Array(pixelCount);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    grayBuffer[p] = lum;
    totalLuminance += lum;

    if (lum < 15) shadowClipped++;
    if (lum > 245) {
      highlightClipped++;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      if (maxC > 248 && (maxC - minC) < 30) {
        glarePixels++;
      }
    }
  }

  const meanBrightness = Math.round(totalLuminance / pixelCount);
  const shadowPercent = (shadowClipped / pixelCount) * 100;
  const highlightPercent = (highlightClipped / pixelCount) * 100;
  const glarePercent = (glarePixels / pixelCount) * 100;

  // Status assessments
  let brightnessStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (meanBrightness < 45 || meanBrightness > 230) {
    brightnessStatus = 'fail';
  } else if (meanBrightness < 75 || meanBrightness > 200) {
    brightnessStatus = 'warning';
  }

  let exposureStatus: 'pass' | 'warning' | 'fail' = 'pass';
  const totalClipped = shadowPercent + highlightPercent;
  if (totalClipped > 25 || highlightPercent > 18) {
    exposureStatus = 'fail';
  } else if (totalClipped > 12 || highlightPercent > 8) {
    exposureStatus = 'warning';
  }

  let glareStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (glarePercent > 12) {
    glareStatus = 'fail';
  } else if (glarePercent > 4) {
    glareStatus = 'warning';
  }

  // 2. Laplacian Blur Check
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let lapCount = 0;

  for (let y = 1; y < analysisSize - 1; y++) {
    for (let x = 1; x < analysisSize - 1; x++) {
      const idx = y * analysisSize + x;
      const center = grayBuffer[idx];
      const up = grayBuffer[(y - 1) * analysisSize + x];
      const down = grayBuffer[(y + 1) * analysisSize + x];
      const left = grayBuffer[y * analysisSize + (x - 1)];
      const right = grayBuffer[y * analysisSize + (x + 1)];

      const lap = Math.abs(up + down + left + right - 4 * center);
      laplacianSum += lap;
      laplacianSqSum += lap * lap;
      lapCount++;
    }
  }

  const lapMean = laplacianSum / (lapCount || 1);
  const lapVar = (laplacianSqSum / (lapCount || 1)) - (lapMean * lapMean);
  const blurScore = Math.max(0, Math.round(lapVar));

  let blurStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (blurScore < 45) {
    blurStatus = 'fail';
  } else if (blurScore < 95) {
    blurStatus = 'warning';
  }

  // Overall evaluation
  const statuses = [dimensionsStatus, brightnessStatus, exposureStatus, glareStatus, blurStatus];
  let overallStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let retakeRecommended = false;
  let retakeMessage: string | null = null;

  if (statuses.includes('fail')) {
    overallStatus = 'fail';
    retakeRecommended = true;
    if (blurStatus === 'fail') {
      retakeMessage = 'Image is too blurry. Hold device steady at 15-20cm distance and let camera focus.';
    } else if (brightnessStatus === 'fail') {
      retakeMessage = meanBrightness < 45 ? 'Scene is too dark. Increase ambient light.' : 'Image is overexposed to direct light.';
    } else if (glareStatus === 'fail') {
      retakeMessage = 'Specular glare detected on test area. Angle camera to avoid shiny reflection.';
    } else if (dimensionsStatus === 'fail') {
      retakeMessage = 'Resolution is below diagnostic minimum (320x320). Move closer to subject.';
    } else {
      retakeMessage = 'Lighting clipping detected. Re-adjust lighting balance.';
    }
  } else if (statuses.includes('warning')) {
    overallStatus = 'warning';
    if (blurStatus === 'warning') {
      retakeMessage = 'Minor motion blur detected. Stabilize device for best optical accuracy.';
    } else if (glareStatus === 'warning') {
      retakeMessage = 'Slight highlight reflection nearby. Calibration may have higher residual error.';
    } else {
      retakeMessage = 'Suboptimal lighting detected. Measurement will proceed with warning flag.';
    }
  }

  return {
    blurScore,
    blurStatus,
    brightnessScore: meanBrightness,
    brightnessStatus,
    exposureScore: Math.round(totalClipped * 10) / 10,
    exposureStatus,
    dimensionsScore: { width, height },
    dimensionsStatus,
    glareScore: Math.round(glarePercent * 10) / 10,
    glareStatus,
    overallStatus,
    retakeRecommended,
    retakeMessage,
  };
}

/**
 * Solve linear system A * X = B for least-squares calibration
 */
function solveLinearSystem(A: number[][], B: number[][]): number[][] | null {
  const n = A.length;
  const m = B[0].length;
  const M: number[][] = [];
  for (let i = 0; i < n; i++) M[i] = [...A[i], ...B[i]];

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-7) return null;

    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    const pivot = M[col][col];
    for (let j = col; j < n + m; j++) M[col][j] /= pivot;

    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = M[row][col];
        for (let j = col; j < n + m; j++) M[row][j] -= factor * M[col][j];
      }
    }
  }

  const X: number[][] = [];
  for (let i = 0; i < n; i++) X[i] = M[i].slice(n);
  return X;
}

/**
 * Client-side Least-Squares Affine Calibration
 */
export function clientCalculateCalibration(targets: CalibrationTarget[]): CalibrationResult {
  const validTargets = targets.filter((t) => t.measuredRgb && t.measuredRgb.length === 3);

  if (validTargets.length < 3) {
    return {
      success: false,
      matrix: null,
      rmse: 999,
      status: 'failed',
      message: `Minimum 3 valid calibration targets required (found ${validTargets.length}).`,
      targets,
    };
  }

  const N = validTargets.length;
  const X: number[][] = [];
  const Y: number[][] = [];

  for (const t of validTargets) {
    const [rm, gm, bm] = t.measuredRgb!;
    const [re, ge, be] = t.expectedRgb;
    X.push([rm, gm, bm, 1]);
    Y.push([re, ge, be]);
  }

  // XtX (4x4)
  const XtX: number[][] = Array(4).fill(0).map(() => Array(4).fill(0));
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < N; k++) sum += X[k][i] * X[k][j];
      if (i === j) sum += 1e-4;
      XtX[i][j] = sum;
    }
  }

  // XtY (4x3)
  const XtY: number[][] = Array(4).fill(0).map(() => Array(3).fill(0));
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < N; k++) sum += X[k][i] * Y[k][j];
      XtY[i][j] = sum;
    }
  }

  const W = solveLinearSystem(XtX, XtY);
  if (!W) {
    return {
      success: false,
      matrix: null,
      rmse: 999,
      status: 'failed',
      message: 'Ill-conditioned color matrix. Calibration failed to converge.',
      targets,
    };
  }

  // Residual RMSE
  let totalSq = 0;
  for (let k = 0; k < N; k++) {
    const raw = X[k];
    const target = Y[k];
    const predR = raw[0] * W[0][0] + raw[1] * W[1][0] + raw[2] * W[2][0] + raw[3] * W[3][0];
    const predG = raw[0] * W[0][1] + raw[1] * W[1][1] + raw[2] * W[2][1] + raw[3] * W[3][1];
    const predB = raw[0] * W[0][2] + raw[1] * W[1][2] + raw[2] * W[2][2] + raw[3] * W[3][2];
    totalSq += Math.pow(predR - target[0], 2) + Math.pow(predG - target[1], 2) + Math.pow(predB - target[2], 2);
  }

  const rmse = Math.round(Math.sqrt(totalSq / N) * 100) / 100;

  if (rmse > 38.0) {
    return {
      success: false,
      matrix: W,
      rmse,
      status: 'failed',
      message: `Residual error (RMSE: ${rmse}) exceeded reliability threshold (38.0). Falling back to raw RGB measurements.`,
      targets,
    };
  }

  return {
    success: true,
    matrix: W,
    rmse,
    status: 'calibrated',
    message: `Affine calibration fitted successfully (Residual RMSE: ${rmse}).`,
    targets,
  };
}

/**
 * Apply affine transformation
 */
export function clientApplyCalibration(rawRgb: [number, number, number], matrix: number[][]): [number, number, number] {
  const [r, g, b] = rawRgb;
  const calR = r * matrix[0][0] + g * matrix[1][0] + b * matrix[2][0] + 1 * matrix[3][0];
  const calG = r * matrix[0][1] + g * matrix[1][1] + b * matrix[2][1] + 1 * matrix[3][1];
  const calB = r * matrix[0][2] + g * matrix[1][2] + b * matrix[2][2] + 1 * matrix[3][2];

  return [
    Math.min(255, Math.max(0, Math.round(calR))),
    Math.min(255, Math.max(0, Math.round(calG))),
    Math.min(255, Math.max(0, Math.round(calB))),
  ];
}

/**
 * Extract trimmed mean color from region
 */
export function extractTrimmedMeanRgbFromRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): { r: number; g: number; b: number } {
  const safeW = Math.max(2, Math.floor(w));
  const safeH = Math.max(2, Math.floor(h));
  const imgData = ctx.getImageData(Math.floor(x), Math.floor(y), safeW, safeH);
  const data = imgData.data;

  interface Pixel { r: number; g: number; b: number; lum: number; }
  const pixels: Pixel[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    pixels.push({ r, g, b, lum: 0.299 * r + 0.587 * g + 0.114 * b });
  }

  pixels.sort((a, b) => a.lum - b.lum);
  const trim = Math.floor(pixels.length * 0.1);
  const trimmed = pixels.slice(trim, pixels.length - trim);
  const active = trimmed.length ? trimmed : pixels;

  let sumR = 0, sumG = 0, sumB = 0;
  for (const p of active) {
    sumR += p.r;
    sumG += p.g;
    sumB += p.b;
  }

  return {
    r: Math.round(sumR / active.length),
    g: Math.round(sumG / active.length),
    b: Math.round(sumB / active.length),
  };
}

export function clientBuildColorData(r: number, g: number, b: number): ColorData {
  const toHex = (v: number) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();

  // LAB calculation
  let sR = r / 255;
  let sG = g / 255;
  let sB = b / 255;
  sR = sR > 0.04045 ? Math.pow((sR + 0.055) / 1.055, 2.4) : sR / 12.92;
  sG = sG > 0.04045 ? Math.pow((sG + 0.055) / 1.055, 2.4) : sG / 12.92;
  sB = sB > 0.04045 ? Math.pow((sB + 0.055) / 1.055, 2.4) : sB / 12.92;

  let x = (sR * 0.4124 + sG * 0.3576 + sB * 0.1805) * 100;
  let y = (sR * 0.2126 + sG * 0.7152 + sB * 0.0722) * 100;
  let z = (sR * 0.0193 + sG * 0.1192 + sB * 0.9505) * 100;

  x /= 95.047;
  y /= 100.0;
  z /= 108.883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  const l = Math.round((116 * fy - 16) * 10) / 10;
  const aVal = Math.round((500 * (fx - fy)) * 10) / 10;
  const bVal = Math.round((200 * (fy - fz)) * 10) / 10;

  // HSV
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r / 255) h = (((g / 255) - (b / 255)) / delta) % 6;
    else if (max === g / 255) h = ((b / 255) - (r / 255)) / delta + 2;
    else h = ((r / 255) - (g / 255)) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    hex,
    lab: { l, a: aVal, b: bVal },
    hsv: { h, s, v },
  };
}
