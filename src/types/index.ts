export interface QualityMetrics {
  blurScore: number;
  blurStatus: 'pass' | 'warning' | 'fail';
  brightnessScore: number;
  brightnessStatus: 'pass' | 'warning' | 'fail';
  exposureScore: number;
  exposureStatus: 'pass' | 'warning' | 'fail';
  dimensionsScore: { width: number; height: number };
  dimensionsStatus: 'pass' | 'warning' | 'fail';
  glareScore: number;
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
  matrix: number[][] | null;
  rmse: number;
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
  patchThumbnail: string;
  fullImageThumbnail?: string;
  patchCoordinates: { x: number; y: number; width: number; height: number };
  isSimulated: boolean;
  simulatedInterpretation: {
    chromaticIndex: number;
    relativeBandIntensity: string;
    confidenceInterval: string;
    researchNote: string;
    cyclePhaseHypothesis: string;
    clinicalDisclaimer: string;
  };
  notes?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'cycle'
  | 'scanner'
  | 'quality'
  | 'calibration'
  | 'analysis'
  | 'history'
  | 'details'
  | 'about'
  | 'privacy';

export type MenstrualPhase = 'Menstrual' | 'Follicular' | 'Ovulation Window' | 'Luteal';

export interface PastPeriodRecord {
  id: string;
  startDate: string; // "YYYY-MM-DD"
  durationDays: number;
  cycleLengthDays?: number;
  flowIntensity?: 'light' | 'medium' | 'heavy';
  notes?: string;
}

export interface CycleSettings {
  lastPeriodStartDate: string; // "YYYY-MM-DD"
  averageCycleLength: number; // e.g. 28
  periodDuration: number; // e.g. 5
  history: PastPeriodRecord[];
}

export interface TimelineDay {
  dayNumber: number;
  dateStr: string; // e.g. "Oct 15"
  isoDate: string; // "YYYY-MM-DD"
  phase: MenstrualPhase;
  isToday: boolean;
  isPeakDay: boolean;
  status: 'past' | 'today' | 'upcoming';
}

export interface PhaseInfo {
  phase: MenstrualPhase;
  name: string;
  dayRangeLabel: string;
  dateRangeLabel: string;
  startDay: number;
  endDay: number;
  status: 'past' | 'current' | 'upcoming';
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  hormoneBasis: string;
}

export interface CycleCalculationResult {
  hasData: boolean;
  currentCycleDay: number;
  cycleLength: number;
  periodDuration: number;
  currentPhase: MenstrualPhase;
  phaseInfo: PhaseInfo;
  nextPeriodEstimate: {
    dateFormatted: string;
    isoDate: string;
    daysRemaining: number;
    uncertaintyText: string;
  };
  basisForEstimate: string;
  timelineDays: TimelineDay[];
  allPhases: PhaseInfo[];
}

