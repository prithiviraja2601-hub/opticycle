import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Eye,
  Crosshair,
  ArrowRight,
} from 'lucide-react';
import { CalibrationTarget, CalibrationResult } from '../types';
import { STANDARD_REFERENCE_TARGETS } from '../services/clientImageProcessor';
import { apiCalibrate } from '../services/api';

interface CalibrationViewProps {
  currentCalibration: CalibrationResult | null;
  onCalibrationSaved: (result: CalibrationResult) => void;
  imagePreview?: string | null;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({
  currentCalibration,
  onCalibrationSaved,
  imagePreview,
}) => {
  const [targets, setTargets] = useState<CalibrationTarget[]>(() => {
    if (currentCalibration?.targets && currentCalibration.targets.length >= 3) {
      return currentCalibration.targets;
    }
    // Default simulated measured values under warm fluorescent indoor light (~3200K)
    return [
      { name: 'White Reference', expectedRgb: [240, 240, 240], measuredRgb: [238, 234, 226] },
      { name: 'Neutral Gray', expectedRgb: [128, 128, 128], measuredRgb: [132, 126, 120] },
      { name: 'Black Reference', expectedRgb: [32, 32, 36], measuredRgb: [34, 33, 35] },
      { name: 'Opti-Cyan', expectedRgb: [0, 168, 204], measuredRgb: [12, 162, 198] },
      { name: 'Opti-Magenta', expectedRgb: [214, 51, 132], measuredRgb: [218, 52, 128] },
      { name: 'Opti-Yellow', expectedRgb: [255, 204, 0], measuredRgb: [250, 198, 15] },
    ];
  });

  const [activeTargetIdx, setActiveTargetIdx] = useState<number>(0);
  const [calculationResult, setCalculationResult] = useState<CalibrationResult | null>(
    currentCalibration
  );
  const [isSolving, setIsSolving] = useState(false);
  const [noiseAdded, setNoiseAdded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute calibration on mount or when targets change
  const runCalibrationCalculation = async (currentTargets: CalibrationTarget[]) => {
    setIsSolving(true);
    try {
      const res = await apiCalibrate(currentTargets);
      setCalculationResult(res);
      if (res.success) {
        onCalibrationSaved(res);
      }
    } catch (err) {
      console.error('Calibration calculation failed:', err);
    } finally {
      setIsSolving(false);
    }
  };

  useEffect(() => {
    runCalibrationCalculation(targets);
  }, []);

  // Handle clicking on image preview to sample measured RGB
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Sample 5x5 neighborhood around click
    const sampleSize = 5;
    const startX = Math.max(0, x - 2);
    const startY = Math.max(0, y - 2);
    const imgData = ctx.getImageData(startX, startY, sampleSize, sampleSize);
    const data = imgData.data;

    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      count++;
    }

    const sampledR = Math.round(sumR / count);
    const sampledG = Math.round(sumG / count);
    const sampledB = Math.round(sumB / count);

    // Update active target's measured RGB
    const updated = [...targets];
    updated[activeTargetIdx] = {
      ...updated[activeTargetIdx],
      measuredRgb: [sampledR, sampledG, sampledB],
    };
    setTargets(updated);
    runCalibrationCalculation(updated);

    // Automatically advance to next target
    if (activeTargetIdx < targets.length - 1) {
      setActiveTargetIdx(activeTargetIdx + 1);
    }
  };

  // Draw image on canvas if available
  useEffect(() => {
    if (!imagePreview || !canvasRef.current) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = imagePreview;
  }, [imagePreview]);

  // Simulate degraded/unreliable lighting to test the failure fallback requirement
  const injectExtremeIlluminantDistortion = () => {
    const corrupted = targets.map((t) => ({
      ...t,
      // Severely distort red/blue channels to mimic extreme sodium-vapor or mono-red lamp
      measuredRgb: [
        Math.min(255, t.expectedRgb[0] + 95),
        Math.max(0, t.expectedRgb[1] - 80),
        Math.min(255, t.expectedRgb[2] + 110),
      ] as [number, number, number],
    }));
    setTargets(corrupted);
    setNoiseAdded(true);
    runCalibrationCalculation(corrupted);
  };

  const resetToStandardCardProfile = () => {
    const standard = [
      { name: 'White Reference', expectedRgb: [240, 240, 240], measuredRgb: [238, 234, 226] },
      { name: 'Neutral Gray', expectedRgb: [128, 128, 128], measuredRgb: [132, 126, 120] },
      { name: 'Black Reference', expectedRgb: [32, 32, 36], measuredRgb: [34, 33, 35] },
      { name: 'Opti-Cyan', expectedRgb: [0, 168, 204], measuredRgb: [12, 162, 198] },
      { name: 'Opti-Magenta', expectedRgb: [214, 51, 132], measuredRgb: [218, 52, 128] },
      { name: 'Opti-Yellow', expectedRgb: [255, 204, 0], measuredRgb: [250, 198, 15] },
    ] as CalibrationTarget[];
    setTargets(standard);
    setNoiseAdded(false);
    runCalibrationCalculation(standard);
  };

  const rgbString = (rgb: [number, number, number]) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-8 max-w-5xl mx-auto shadow-sm space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">Reference Card Affine Calibration</h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200/80 font-bold uppercase leading-none">
              ISO 11664 Model
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Normalizes raw smartphone sRGB coordinates to reference values using least-squares affine regression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {calculationResult?.success ? (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold leading-none">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Calibrated (RMSE: {calculationResult.rmse})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold leading-none">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Calibration Unreliable (Raw Mode)</span>
            </div>
          )}
        </div>
      </div>

      {/* Unreliable Calibration Warning if RMSE exceeded */}
      {calculationResult && !calculationResult.success && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold text-sm text-slate-900">Calibration Safety Alert</p>
            <p className="mt-0.5 text-slate-700">{calculationResult.message}</p>
            <p className="mt-1 text-xs text-rose-700 font-medium">
              OptiCycle enforces scientific integrity: instead of presenting false corrected values, the system safely falls back to raw RGB readings.
            </p>
          </div>
        </div>
      )}

      {/* Calibration Target Grid: Expected vs Measured */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>6-Target Reference Standard</span>
            <span className="text-xs text-slate-500 font-normal">
              (Click any target to select for interactive sampling)
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={injectExtremeIlluminantDistortion}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
              title="Test threshold rejection"
            >
              Simulate Severe Distortion
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={resetToStandardCardProfile}
              className="text-xs font-semibold text-pink-600 hover:text-pink-700 underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Standard</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {targets.map((target, idx) => {
            const isSelected = activeTargetIdx === idx;
            const expectedStr = rgbString(target.expectedRgb);
            const measuredStr = target.measuredRgb ? rgbString(target.measuredRgb) : 'Not sampled';

            return (
              <div
                key={target.name}
                onClick={() => setActiveTargetIdx(idx)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-pink-50/80 border-pink-400 ring-2 ring-pink-400/25 shadow-xs'
                    : 'bg-[#faf8fb] hover:bg-pink-50/40 border-slate-150'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 truncate tracking-normal">{target.name}</span>
                  {isSelected && <Crosshair className="w-3.5 h-3.5 text-pink-600 shrink-0" />}
                </div>

                {/* Swatches: Expected vs Measured */}
                <div className="grid grid-cols-2 gap-1.5 h-12 rounded-xl overflow-hidden border border-slate-200 mb-2.5 shadow-xs">
                  <div
                    className="h-full flex items-end p-1.5"
                    style={{ backgroundColor: expectedStr }}
                    title={`Standard Ground Truth: ${target.expectedRgb.join(', ')}`}
                  >
                    <span className="text-[10px] font-bold text-slate-900 bg-white/90 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
                      Exp
                    </span>
                  </div>
                  <div
                    className="h-full flex items-end p-1.5"
                    style={{
                      backgroundColor: target.measuredRgb ? measuredStr : '#e2e8f0',
                    }}
                    title={`Measured: ${target.measuredRgb ? target.measuredRgb.join(', ') : 'Pending'}`}
                  >
                    <span className="text-[10px] font-bold text-slate-900 bg-white/90 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
                      Meas
                    </span>
                  </div>
                </div>

                <div className="text-[11px] space-y-1 text-slate-500 font-mono tabular-nums leading-tight">
                  <div className="truncate">Tgt: [{target.expectedRgb.join(', ')}]</div>
                  <div className="text-slate-800 truncate font-bold">
                    Cam: [{target.measuredRgb ? target.measuredRgb.join(', ') : '---'}]
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Sampler or Mathematical Derivation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interactive Canvas if image provided */}
        <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80 gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 tracking-normal">
              <Crosshair className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Interactive Color Target Sampler</span>
            </h4>
            <span className="text-xs text-pink-700 bg-pink-100 px-2.5 py-1 rounded-full font-bold tracking-wide leading-none">
              Sampling: {targets[activeTargetIdx]?.name}
            </span>
          </div>

          {imagePreview ? (
            <div>
              <p className="text-xs text-slate-500 mb-2.5 leading-relaxed">
                Click directly on the corresponding color patch on the photo to measure RGB coordinates.
              </p>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-200 cursor-crosshair shadow-sm">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2.5 bg-white">
              <Eye className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-900 tracking-normal">Using Pre-Calibrated Standard Profile</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                No active photo preview loaded in calibration view. You can calibrate directly from captured images in the Scanner, or adjust preset targets above.
              </p>
            </div>
          )}
        </div>

        {/* Right: Least Squares Affine Mathematics & Matrix Readout */}
        <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 tracking-normal">
              <Sliders className="w-4 h-4 text-pink-600 shrink-0" />
              <span>Least-Squares Affine Matrix (4×3)</span>
            </h4>
            <span className="text-xs font-mono text-slate-600 tracking-wide">
              Residual RMSE: <strong className="text-slate-900 font-bold tabular-nums">{calculationResult?.rmse || '0.00'}</strong>
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Solves the normal equation <code className="text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded font-mono text-xs border border-pink-100">(X^T X + λI)^(-1) X^T Y</code> to map camera coordinates <code className="text-slate-800 font-mono text-xs">[R, G, B, 1]</code> to standardized reference space.
          </p>

          {calculationResult?.matrix ? (
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 font-mono text-xs overflow-x-auto space-y-1.5 shadow-xs">
              {calculationResult.matrix.map((row, rIdx) => {
                const label = rIdx === 3 ? 'Bias (b)' : `Row ${rIdx}`;
                return (
                  <div key={rIdx} className="flex items-center gap-4 text-slate-700 tabular-nums">
                    <span className="w-20 text-slate-500 text-[11px] uppercase tracking-wider font-bold">{label}:</span>
                    <span className="text-pink-600 font-semibold w-24">R: {row[0].toFixed(3).padStart(6, ' ')}</span>
                    <span className="text-emerald-700 font-semibold w-24">G: {row[1].toFixed(3).padStart(6, ' ')}</span>
                    <span className="text-cyan-700 font-semibold w-24">B: {row[2].toFixed(3).padStart(6, ' ')}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white text-slate-500 text-xs font-mono text-center border border-slate-200">
              Matrix uninitialized
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span>Calibration Quality Threshold:</span>
              <span className="font-bold text-slate-900 font-mono tabular-nums">RMSE ≤ 38.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <span
                className={`font-bold tracking-wide ${
                  calculationResult?.success ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {calculationResult?.success ? 'Accepted & Active' : 'Fallback to Raw RGB'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Confirmation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Calibration matrix is stored locally and applied automatically to subsequent patch analyses.
        </p>

        <button
          onClick={() => {
            if (calculationResult) {
              onCalibrationSaved(calculationResult);
            }
          }}
          disabled={!calculationResult?.success}
          className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs leading-none ${
            calculationResult?.success
              ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white shadow-md shadow-pink-500/25 active:scale-95'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>Apply Active Profile</span>
        </button>
      </div>
    </div>
  );
};
