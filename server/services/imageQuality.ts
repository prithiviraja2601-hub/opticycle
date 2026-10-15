import sharp from 'sharp';
import { QualityMetrics } from '../types.ts';

export async function analyzeImageQuality(imageBuffer: Buffer): Promise<QualityMetrics> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // 1. Dimensions check
  let dimensionsStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (width < 320 || height < 320) {
    dimensionsStatus = 'fail';
  } else if (width < 640 || height < 480) {
    dimensionsStatus = 'warning';
  }

  // Resize to standard analysis size for consistent fast processing
  const analysisSize = 400;
  const resized = await image
    .clone()
    .resize(analysisSize, analysisSize, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const pixelCount = info.width * info.height;
  const channels = info.channels;

  // 2. Brightness & Exposure & Glare calculation
  let totalLuminance = 0;
  let shadowClipped = 0;
  let highlightClipped = 0;
  let glarePixels = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Standard perceived luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuminance += lum;

    if (lum < 15) {
      shadowClipped++;
    }
    if (lum > 245) {
      highlightClipped++;
      // Glare check: high brightness and low color variance (specular reflection)
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

  // Brightness Status
  let brightnessStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (meanBrightness < 45 || meanBrightness > 230) {
    brightnessStatus = 'fail';
  } else if (meanBrightness < 75 || meanBrightness > 200) {
    brightnessStatus = 'warning';
  }

  // Exposure Status
  let exposureStatus: 'pass' | 'warning' | 'fail' = 'pass';
  const totalClipped = shadowPercent + highlightPercent;
  if (totalClipped > 25 || highlightPercent > 18) {
    exposureStatus = 'fail';
  } else if (totalClipped > 12 || highlightPercent > 8) {
    exposureStatus = 'warning';
  }

  // Glare Status
  let glareStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (glarePercent > 12) {
    glareStatus = 'fail';
  } else if (glarePercent > 4) {
    glareStatus = 'warning';
  }

  // 3. Blur detection via Laplacian Variance
  // Convolve grayscale image with 3x3 discrete Laplacian operator
  const grayResized = await sharp(imageBuffer)
    .resize(300, 300, { fit: 'inside' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const gData = grayResized.data;
  const gWidth = grayResized.info.width;
  const gHeight = grayResized.info.height;

  // Laplacian kernel: [0, 1, 0], [1, -4, 1], [0, 1, 0]
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let laplacianCount = 0;

  for (let y = 1; y < gHeight - 1; y++) {
    for (let x = 1; x < gWidth - 1; x++) {
      const idx = y * gWidth + x;
      const center = gData[idx];
      const up = gData[(y - 1) * gWidth + x];
      const down = gData[(y + 1) * gWidth + x];
      const left = gData[y * gWidth + (x - 1)];
      const right = gData[y * gWidth + (x + 1)];

      const lap = Math.abs(up + down + left + right - 4 * center);
      laplacianSum += lap;
      laplacianSqSum += lap * lap;
      laplacianCount++;
    }
  }

  const laplacianMean = laplacianSum / (laplacianCount || 1);
  const laplacianVariance = (laplacianSqSum / (laplacianCount || 1)) - (laplacianMean * laplacianMean);
  const blurScore = Math.max(0, Math.round(laplacianVariance));

  let blurStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (blurScore < 45) {
    blurStatus = 'fail';
  } else if (blurScore < 95) {
    blurStatus = 'warning';
  }

  // Overall status evaluation
  const statuses = [dimensionsStatus, brightnessStatus, exposureStatus, glareStatus, blurStatus];
  let overallStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let retakeRecommended = false;
  let retakeMessage: string | null = null;

  if (statuses.includes('fail')) {
    overallStatus = 'fail';
    retakeRecommended = true;

    if (blurStatus === 'fail') {
      retakeMessage = 'Image is too blurry for accurate optical densitometry. Hold device steady and ensure good focus at 15-20cm distance.';
    } else if (brightnessStatus === 'fail') {
      retakeMessage = meanBrightness < 45
        ? 'Lighting is too dark. Increase ambient light or use diffuse illumination.'
        : 'Image is significantly over-illuminated. Avoid direct bright spot lighting.';
    } else if (glareStatus === 'fail') {
      retakeMessage = 'Specular glare detected on test area. Tilt phone slightly to reduce direct reflections.';
    } else if (dimensionsStatus === 'fail') {
      retakeMessage = 'Image resolution is too low. Move camera closer to fill the guide frame.';
    } else {
      retakeMessage = 'Image exposure is unbalanced. Adjust lighting and capture again.';
    }
  } else if (statuses.includes('warning')) {
    overallStatus = 'warning';
    if (blurStatus === 'warning') {
      retakeMessage = 'Slight blur detected. Results may have higher variance. Consider stabilizing camera.';
    } else if (glareStatus === 'warning') {
      retakeMessage = 'Minor glare detected near test zone. Consider checking alignment.';
    } else {
      retakeMessage = 'Lighting conditions are suboptimal but acceptable for experimental estimation.';
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
