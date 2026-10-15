import { QualityMetrics, CalibrationTarget, CalibrationResult, ScanRecord } from '../types';
import {
  clientCheckImageQuality,
  clientCalculateCalibration,
  clientApplyCalibration,
  clientBuildColorData,
  STANDARD_REFERENCE_TARGETS,
} from './clientImageProcessor';

const STORAGE_KEY = 'opticycle_local_scans';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source?: 'backend' | 'client-fallback';
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const json = await res.json();
    return json.status === 'ok';
  } catch (e) {
    return false;
  }
}

export async function apiCheckQuality(
  imageSource: Blob | File | string
): Promise<QualityMetrics> {
  try {
    const formData = new FormData();
    if (typeof imageSource === 'string') {
      const res = await fetch('/api/scans/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageSource }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.metrics;
    } else {
      formData.append('image', imageSource);
      const res = await fetch('/api/scans/quality-check', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.metrics;
    }
  } catch (err) {
    console.warn('Backend quality-check unreachable, running client-side analysis:', err);
    // Client fallback
    const img = new Image();
    const dataUrl = typeof imageSource === 'string'
      ? imageSource
      : await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageSource as Blob);
        });

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    return await clientCheckImageQuality(img);
  }
}

export async function apiCalibrate(targets: CalibrationTarget[]): Promise<CalibrationResult> {
  try {
    const res = await fetch('/api/scans/calibrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Backend calibration unreachable, running client affine regression:', err);
    return clientCalculateCalibration(targets);
  }
}

export async function apiAnalyzeScan(params: {
  image: Blob | File | string;
  patchCoordinates: { x: number; y: number; width: number; height: number };
  calibrationMatrix?: number[][] | null;
  calibrationResult?: CalibrationResult | null;
  title?: string;
  isSimulated?: boolean;
  notes?: string;
}): Promise<ScanRecord> {
  try {
    if (typeof params.image === 'string') {
      const res = await fetch('/api/scans/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: params.image,
          patchCoordinates: JSON.stringify(params.patchCoordinates),
          calibrationMatrix: params.calibrationMatrix ? JSON.stringify(params.calibrationMatrix) : undefined,
          calibrationResult: params.calibrationResult ? JSON.stringify(params.calibrationResult) : undefined,
          title: params.title,
          isSimulated: params.isSimulated,
          notes: params.notes,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.scan;
    } else {
      const formData = new FormData();
      formData.append('image', params.image);
      formData.append('patchCoordinates', JSON.stringify(params.patchCoordinates));
      if (params.calibrationMatrix) {
        formData.append('calibrationMatrix', JSON.stringify(params.calibrationMatrix));
      }
      if (params.calibrationResult) {
        formData.append('calibrationResult', JSON.stringify(params.calibrationResult));
      }
      if (params.title) formData.append('title', params.title);
      if (params.isSimulated !== undefined) formData.append('isSimulated', String(params.isSimulated));
      if (params.notes) formData.append('notes', params.notes);

      const res = await fetch('/api/scans/analyze', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.scan;
    }
  } catch (err) {
    console.warn('Backend analyze unreachable, running client analysis fallback:', err);
    return runClientAnalyzeFallback(params);
  }
}

async function runClientAnalyzeFallback(params: {
  image: Blob | File | string;
  patchCoordinates: { x: number; y: number; width: number; height: number };
  calibrationMatrix?: number[][] | null;
  calibrationResult?: CalibrationResult | null;
  title?: string;
  isSimulated?: boolean;
  notes?: string;
}): Promise<ScanRecord> {
  const dataUrl = typeof params.image === 'string'
    ? params.image
    : await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(params.image as Blob);
      });

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  const quality = await clientCheckImageQuality(img);

  // Extract patch color using canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);

  const px = params.patchCoordinates.x <= 1 ? params.patchCoordinates.x * img.width : params.patchCoordinates.x;
  const py = params.patchCoordinates.y <= 1 ? params.patchCoordinates.y * img.height : params.patchCoordinates.y;
  const pw = params.patchCoordinates.width <= 1 ? params.patchCoordinates.width * img.width : params.patchCoordinates.width;
  const ph = params.patchCoordinates.height <= 1 ? params.patchCoordinates.height * img.height : params.patchCoordinates.height;

  const cropped = ctx.getImageData(Math.floor(px), Math.floor(py), Math.floor(pw), Math.floor(ph));
  const rawRgb = getTrimmedMeanRgb(cropped.data);
  const rawColor = clientBuildColorData(rawRgb.r, rawRgb.g, rawRgb.b);

  let calibratedColor = null;
  let isCalibrated = false;
  if (params.calibrationMatrix && params.calibrationMatrix.length === 4) {
    const cal = clientApplyCalibration([rawColor.r, rawColor.g, rawColor.b], params.calibrationMatrix);
    calibratedColor = clientBuildColorData(cal[0], cal[1], cal[2]);
    isCalibrated = true;
  }

  // Thumbnail
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 120;
  thumbCanvas.height = 120;
  const tCtx = thumbCanvas.getContext('2d')!;
  tCtx.drawImage(canvas, px, py, pw, ph, 0, 0, 120, 120);
  const patchThumbnail = thumbCanvas.toDataURL('image/jpeg', 0.85);

  const activeColor = calibratedColor || rawColor;
  const greenAbs = 1 - (activeColor.g / 255);
  const chromaticIndex = Math.round(Math.min(1, Math.max(0, greenAbs * 0.7 + (activeColor.r > 160 ? 0.25 : 0.05))) * 100) / 100;

  const scan: ScanRecord = {
    id: `local-${Date.now()}`,
    timestamp: new Date().toISOString(),
    title: params.title || `Opti-Scan ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    rawColor,
    calibratedColor,
    hexCode: calibratedColor ? calibratedColor.hex : rawColor.hex,
    isCalibrated,
    calibrationResult: params.calibrationResult,
    qualityMetrics: quality,
    patchThumbnail,
    patchCoordinates: params.patchCoordinates,
    isSimulated: Boolean(params.isSimulated),
    simulatedInterpretation: {
      chromaticIndex,
      relativeBandIntensity: chromaticIndex > 0.65 ? 'Peak Indicator (Simulated)' : chromaticIndex > 0.35 ? 'Moderate' : 'Low',
      confidenceInterval: `±${(0.04 + (1 - chromaticIndex) * 0.03).toFixed(2)} OD`,
      researchNote: 'Optical density calculated from client-side sensor sampling.',
      cyclePhaseHypothesis: chromaticIndex > 0.65 ? 'Elevated Chromatic Signal (Experimental)' : 'Standard Basal Response',
      clinicalDisclaimer: 'Research prototype. Results are experimental and not clinically validated. Not for diagnosis or treatment.',
    },
    notes: params.notes || '',
  };

  // Save to localStorage
  saveToLocalStorage(scan);
  return scan;
}

function getTrimmedMeanRgb(data: Uint8ClampedArray): { r: number; g: number; b: number } {
  const pixels: { r: number; g: number; b: number; lum: number }[] = [];
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

function saveToLocalStorage(scan: ScanRecord) {
  try {
    const list = getFromLocalStorage();
    list.unshift(scan);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function getFromLocalStorage(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function apiGetScans(filterSimulated?: boolean): Promise<ScanRecord[]> {
  try {
    let url = '/api/scans';
    if (filterSimulated !== undefined) {
      url += `?simulated=${filterSimulated}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.scans;
  } catch (err) {
    console.warn('Backend getScans unreachable, fetching from localStorage:', err);
    const local = getFromLocalStorage();
    if (filterSimulated !== undefined) {
      return local.filter((s) => s.isSimulated === filterSimulated);
    }
    return local;
  }
}

export async function apiGetScanById(id: string): Promise<ScanRecord | null> {
  try {
    const res = await fetch(`/api/scans/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.scan;
  } catch (err) {
    const local = getFromLocalStorage();
    return local.find((s) => s.id === id) || null;
  }
}

export async function apiDeleteScan(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/scans/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.warn('Backend delete error, removing from local storage:', err);
  }

  // Also remove from localStorage
  try {
    const local = getFromLocalStorage().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
  } catch (e) {}

  return true;
}
