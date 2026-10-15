import { CalibrationResult, CalibrationTarget, ColorData } from '../types.ts';

// Standard 6-target calibration card values (sRGB)
export const STANDARD_REFERENCE_TARGETS: Omit<CalibrationTarget, 'measuredRgb' | 'box'>[] = [
  { name: 'White Reference', expectedRgb: [240, 240, 240] },
  { name: 'Neutral Gray', expectedRgb: [128, 128, 128] },
  { name: 'Black Reference', expectedRgb: [32, 32, 36] },
  { name: 'Opti-Cyan', expectedRgb: [0, 168, 204] },
  { name: 'Opti-Magenta', expectedRgb: [214, 51, 132] },
  { name: 'Opti-Yellow', expectedRgb: [255, 204, 0] },
];

/**
 * Solve 4x4 linear system A * X = B using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], B: number[][]): number[][] | null {
  const n = A.length;
  const m = B[0].length;

  // Augmented matrix [A | B]
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M[i] = [...A[i], ...B[i]];
  }

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-7) {
      // Singular or near-singular matrix
      return null;
    }

    // Swap maxRow with col
    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    // Eliminate below and above
    const pivot = M[col][col];
    for (let j = col; j < n + m; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = M[row][col];
        for (let j = col; j < n + m; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }
  }

  // Extract solution X from right side of augmented matrix
  const X: number[][] = [];
  for (let i = 0; i < n; i++) {
    X[i] = M[i].slice(n);
  }
  return X;
}

/**
 * Documented Least-Squares Affine Color Calibration
 *
 * Models color shift as:
 * [R_cal, G_cal, B_cal]^T = M_3x3 * [R_raw, G_raw, B_raw]^T + b_3x1
 *
 * Expressed as:
 * Y = X * W
 * where X = [R, G, B, 1] (N x 4), Y = [R_target, G_target, B_target] (N x 3)
 * W is solved via regularized normal equations:
 * (X^T * X + lambda * I) * W = X^T * Y
 */
export function calculateAffineCalibration(targets: CalibrationTarget[]): CalibrationResult {
  const validTargets = targets.filter((t) => t.measuredRgb && t.measuredRgb.length === 3);

  if (validTargets.length < 3) {
    return {
      success: false,
      matrix: null,
      rmse: 999,
      status: 'failed',
      message: `Insufficient calibration targets. Minimum 3 required, found ${validTargets.length}.`,
      targets,
    };
  }

  const N = validTargets.length;
  // Construct X (N x 4) and Y (N x 3)
  const X: number[][] = [];
  const Y: number[][] = [];

  for (const t of validTargets) {
    const [rm, gm, bm] = t.measuredRgb!;
    const [re, ge, be] = t.expectedRgb;
    X.push([rm, gm, bm, 1]);
    Y.push([re, ge, be]);
  }

  // Check color diversity (bounding volume of measured colors)
  let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
  for (const row of X) {
    minR = Math.min(minR, row[0]); maxR = Math.max(maxR, row[0]);
    minG = Math.min(minG, row[1]); maxG = Math.max(maxG, row[1]);
    minB = Math.min(minB, row[2]); maxB = Math.max(maxB, row[2]);
  }
  const colorRangeProduct = (maxR - minR) * (maxG - minG) * (maxB - minB);
  if (colorRangeProduct < 500) {
    return {
      success: false,
      matrix: null,
      rmse: 999,
      status: 'failed',
      message: 'Degenerate color distribution. Sampled reference card patches lack chromatic variation.',
      targets,
    };
  }

  // Compute X^T * X (4 x 4)
  const XtX: number[][] = Array(4).fill(0).map(() => Array(4).fill(0));
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < N; k++) {
        sum += X[k][i] * X[k][j];
      }
      // Ridge regularization for numerical stability
      if (i === j) {
        sum += 1e-4;
      }
      XtX[i][j] = sum;
    }
  }

  // Compute X^T * Y (4 x 3)
  const XtY: number[][] = Array(4).fill(0).map(() => Array(3).fill(0));
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < N; k++) {
        sum += X[k][i] * Y[k][j];
      }
      XtY[i][j] = sum;
    }
  }

  // Solve (X^T * X) * W = X^T * Y
  const W = solveLinearSystem(XtX, XtY);

  if (!W) {
    return {
      success: false,
      matrix: null,
      rmse: 999,
      status: 'failed',
      message: 'Singular matrix encountered during affine calibration regression.',
      targets,
    };
  }

  // Calculate Residual Error (RMSE)
  let totalSquaredError = 0;
  for (let k = 0; k < N; k++) {
    const raw = X[k]; // [r, g, b, 1]
    const target = Y[k]; // [r, g, b]

    // Predicted: W has 4 rows, 3 columns
    const predR = raw[0] * W[0][0] + raw[1] * W[1][0] + raw[2] * W[2][0] + raw[3] * W[3][0];
    const predG = raw[0] * W[0][1] + raw[1] * W[1][1] + raw[2] * W[2][1] + raw[3] * W[3][1];
    const predB = raw[0] * W[0][2] + raw[1] * W[1][2] + raw[2] * W[2][2] + raw[3] * W[3][2];

    const errSq = Math.pow(predR - target[0], 2) + Math.pow(predG - target[1], 2) + Math.pow(predB - target[2], 2);
    totalSquaredError += errSq;
  }

  const rmse = Math.round(Math.sqrt(totalSquaredError / N) * 100) / 100;

  // Strict residual error threshold: if RMSE > 38.0, reject calibration
  if (rmse > 38.0) {
    return {
      success: false,
      matrix: W,
      rmse,
      status: 'failed',
      message: `Calibration residual error (RMSE: ${rmse}) exceeded acceptable precision threshold (38.0). Falling back to raw RGB to avoid misleading data.`,
      targets,
    };
  }

  return {
    success: true,
    matrix: W,
    rmse,
    status: 'calibrated',
    message: `Affine transformation converged successfully with residual RMSE of ${rmse}.`,
    targets,
  };
}

/**
 * Apply calibration matrix to raw RGB
 */
export function applyCalibrationMatrix(
  rawRgb: [number, number, number],
  matrix: number[][]
): [number, number, number] {
  const [r, g, b] = rawRgb;
  // W is 4x3: [ [m11, m21, m31], [m12, m22, m32], [m13, m23, m33], [b1, b2, b3] ]
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
 * Convert RGB to Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert RGB to CIE L*a*b* (standard D65 illuminant, 2 deg observer)
 */
export function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  // Normalize sRGB to [0, 1] and apply sRGB gamma inverse
  let sR = r / 255;
  let sG = g / 255;
  let sB = b / 255;

  sR = sR > 0.04045 ? Math.pow((sR + 0.055) / 1.055, 2.4) : sR / 12.92;
  sG = sG > 0.04045 ? Math.pow((sG + 0.055) / 1.055, 2.4) : sG / 12.92;
  sB = sB > 0.04045 ? Math.pow((sB + 0.055) / 1.055, 2.4) : sB / 12.92;

  // Forward to XYZ
  let x = (sR * 0.4124 + sG * 0.3576 + sB * 0.1805) * 100;
  let y = (sR * 0.2126 + sG * 0.7152 + sB * 0.0722) * 100;
  let z = (sR * 0.0193 + sG * 0.1192 + sB * 0.9505) * 100;

  // D65 reference white
  const xn = 95.047;
  const yn = 100.0;
  const zn = 108.883;

  x /= xn;
  y /= yn;
  z /= zn;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  const l = Math.round((116 * fy - 16) * 10) / 10;
  const aVal = Math.round((500 * (fx - fy)) * 10) / 10;
  const bVal = Math.round((200 * (fy - fz)) * 10) / 10;

  return { l, a: aVal, b: bVal };
}

/**
 * Convert RGB to HSV
 */
export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const normR = r / 255;
  const normG = g / 255;
  const normB = b / 255;

  const max = Math.max(normR, normG, normB);
  const min = Math.min(normR, normG, normB);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === normR) {
      h = ((normG - normB) / delta) % 6;
    } else if (max === normG) {
      h = (normB - normR) / delta + 2;
    } else {
      h = (normR - normG) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

export function buildColorData(r: number, g: number, b: number): ColorData {
  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    hex: rgbToHex(r, g, b),
    lab: rgbToLab(r, g, b),
    hsv: rgbToHsv(r, g, b),
  };
}
