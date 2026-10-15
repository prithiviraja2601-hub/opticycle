import sharp from 'sharp';
import { ColorData, ScanRecord, QualityMetrics, CalibrationResult } from '../types.ts';
import { applyCalibrationMatrix, buildColorData } from './calibration.ts';

export interface PatchCoordinates {
  x: number; // 0-1 relative or absolute pixel
  y: number;
  width: number;
  height: number;
}

/**
 * Extract representative color using trimmed mean (10% two-sided truncation)
 * to reject specular reflection, boundary noise, and salt-and-pepper artifacts.
 */
export async function extractPatchColor(
  imageBuffer: Buffer,
  cropBox: PatchCoordinates
): Promise<{ rawColor: ColorData; patchThumbnailBase64: string }> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const imgW = metadata.width || 800;
  const imgH = metadata.height || 600;

  // Convert normalized [0, 1] coords to pixel coords if needed
  let left = Math.round(cropBox.x <= 1 ? cropBox.x * imgW : cropBox.x);
  let top = Math.round(cropBox.y <= 1 ? cropBox.y * imgH : cropBox.y);
  let width = Math.round(cropBox.width <= 1 ? cropBox.width * imgW : cropBox.width);
  let height = Math.round(cropBox.height <= 1 ? cropBox.height * imgH : cropBox.height);

  // Bounds clamping
  left = Math.max(0, Math.min(imgW - 10, left));
  top = Math.max(0, Math.min(imgH - 10, top));
  width = Math.max(10, Math.min(imgW - left, width));
  height = Math.max(10, Math.min(imgH - top, height));

  // Extract patch region
  const patch = image.clone().extract({ left, top, width, height });

  // Generate Base64 thumbnail of cropped patch for preview
  const patchThumbBuffer = await patch
    .clone()
    .resize(160, 160, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer();
  const patchThumbnailBase64 = `data:image/webp;base64,${patchThumbBuffer.toString('base64')}`;

  // Read raw pixels
  const { data, info } = await patch.raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const channels = info.channels;

  // Collect luminance-ordered pixels for trimmed mean
  interface PixelInfo {
    r: number;
    g: number;
    b: number;
    lum: number;
  }
  const pixels: PixelInfo[] = [];

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    pixels.push({ r, g, b, lum });
  }

  // Sort by luminance
  pixels.sort((a, b) => a.lum - b.lum);

  // Trim top and bottom 10%
  const trimAmount = Math.floor(pixels.length * 0.1);
  const trimmed = pixels.slice(trimAmount, pixels.length - trimAmount);
  const sampleCount = trimmed.length || pixels.length;
  const targetArray = trimmed.length ? trimmed : pixels;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (const p of targetArray) {
    sumR += p.r;
    sumG += p.g;
    sumB += p.b;
  }

  const meanR = Math.round(sumR / sampleCount);
  const meanG = Math.round(sumG / sampleCount);
  const meanB = Math.round(sumB / sampleCount);

  const rawColor = buildColorData(meanR, meanG, meanB);

  return { rawColor, patchThumbnailBase64 };
}

/**
 * Generate simulated research interpretation.
 * Explicitly stresses prototype and non-diagnostic boundaries.
 */
export function generateSimulatedInterpretation(color: ColorData) {
  // Approximate colorimetric density index based on green/blue absorption (standard for pink/magenta diazo & colloidal gold assays)
  // Higher optical density corresponds to lower green reflection
  const greenAbsorption = 1 - (color.g / 255);
  const redGreenRatio = color.r / Math.max(1, color.g);
  const chromaticIndex = Math.round(Math.min(1, Math.max(0, greenAbsorption * 0.7 + (redGreenRatio > 1.2 ? 0.3 : 0.1))) * 100) / 100;

  let relativeBandIntensity = 'Low';
  let cyclePhaseHypothesis = 'Baseline / Low Chromatic Response';
  let researchNote = 'Optical density levels are consistent with early or resting test strip reactivity.';

  if (chromaticIndex > 0.65) {
    relativeBandIntensity = 'Peak Indicator (Simulated)';
    cyclePhaseHypothesis = 'Elevated Chromatic Signal (Experimental)';
    researchNote = 'Test band exhibits intense optical reflectance shift. Note: optical density varies with humidity, lighting, and reaction timing.';
  } else if (chromaticIndex > 0.35) {
    relativeBandIntensity = 'Moderate';
    cyclePhaseHypothesis = 'Intermediate Chromatic Response';
    researchNote = 'Color reflectance indicates mid-range test band contrast.';
  }

  return {
    chromaticIndex,
    relativeBandIntensity,
    confidenceInterval: `±${(0.04 + (1 - chromaticIndex) * 0.03).toFixed(2)} OD`,
    researchNote,
    cyclePhaseHypothesis,
    clinicalDisclaimer: 'Research prototype. Results are experimental and not clinically validated. Not for diagnosis or treatment.',
  };
}
