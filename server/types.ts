export interface QualityMetrics {
  blurScore: number; // Laplacian variance (higher = sharper)
  blurStatus: 'pass' | 'warning' | 'fail';
  brightnessScore: number; // Mean luminance 0-255
  brightnessStatus: 'pass' | 'warning' | 'fail';
  exposureScore: number; // percentage clipped
  exposureStatus: 'pass' | 'warning' | 'fail';
  dimensionsScore: { width: number; height: number };
  dimensionsStatus: 'pass' | 'warning' | 'fail';
  glareScore: number; // percentage glare hotspots
  glareStatus: 'pass' | 'warning' | 'fail';
  overallStatus: 'pass' | 'warning' | 'fail';
  retakeRecommended: boolean;
  retakeMessage: string | null;
}

export interface CalibrationTarget {
  name: string;
  expectedRgb: [number, number, number];
  measuredRgb?: [number, number, number];
  box?: { x: number; y: number; width: number; height: number };
}

export interface CalibrationResult {
  success: boolean;
  matrix: number[][] | null; // 3x3 or 3x4 affine matrix
  rmse: number; // Root Mean Square Error
  status: 'calibrated' | 'failed' | 'raw_fallback';
  message: string;
  targets: CalibrationTarget[];
}

export interface ColorData {
  r: number;
  g: number;
  b: number;
  hex: string;
  lab: { l: number; a: number; b: number };
  hsv: { h: number; s: number; v: number };
}

export interface ScanRecord {
  id: string;
  timestamp: string;
  title: string;
  rawColor: ColorData;
  calibratedColor: ColorData | null;
  hexCode: string;
  isCalibrated: boolean;
  calibrationResult?: CalibrationResult | null;
  qualityMetrics: QualityMetrics;
  patchThumbnail: string; // Base64 data URL
  fullImageThumbnail?: string;
  patchCoordinates: { x: number; y: number; width: number; height: number };
  isSimulated: boolean;
  simulatedInterpretation: {
    chromaticIndex: number; // 0.0 - 1.0 optical density scale
    relativeBandIntensity: string; // 'Low', 'Moderate', 'Peak Indicator (Simulated)'
    confidenceInterval: string;
    researchNote: string;
    cyclePhaseHypothesis: string;
    clinicalDisclaimer: string;
  };
  notes?: string;
}
