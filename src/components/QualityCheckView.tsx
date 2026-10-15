import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ArrowRight,
  Sun,
  Eye,
  Sliders,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { QualityMetrics } from '../types';

interface QualityCheckViewProps {
  metrics: QualityMetrics;
  imagePreview: string;
  onRetake: () => void;
  onProceed: () => void;
}

export const QualityCheckView: React.FC<QualityCheckViewProps> = ({
  metrics,
  imagePreview,
  onRetake,
  onProceed,
}) => {
  const getStatusBadge = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 leading-none">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Pass</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200 leading-none">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Suboptimal</span>
          </span>
        );
      case 'fail':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-rose-50 text-rose-800 border border-rose-200 leading-none">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Failed</span>
          </span>
        );
    }
  };

  const isFailed = metrics.overallStatus === 'fail';

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-8 max-w-4xl mx-auto shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3.5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              Pre-Analytical Image Quality Audit
            </h2>
            {getStatusBadge(metrics.overallStatus)}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-normal">
            Validating sharpness, exposure dynamics, specular reflections, and sensor resolution
          </p>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="text-xs text-slate-500 tracking-wide">Dimensions: </span>
          <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">
            {metrics.dimensionsScore.width} × {metrics.dimensionsScore.height} px
          </span>
        </div>
      </div>

      {/* Retake Notice Callout if Failed or Warning */}
      {metrics.retakeRecommended && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-4 ${
            isFailed
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {isFailed ? (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs sm:text-sm leading-relaxed">
            <p className="font-bold text-sm sm:text-base mb-1 tracking-normal text-slate-900">
              {isFailed ? 'Retake Required for Reliable Analysis' : 'Image Quality Advisory'}
            </p>
            <p className="text-slate-700 leading-relaxed">{metrics.retakeMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Preview & 5 Quality Meters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Image Preview */}
        <div className="space-y-3">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm">
            <img
              src={imagePreview}
              alt="Quality audit target"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-2.5 left-2.5 px-3 py-1 rounded-md bg-white/90 backdrop-blur-md text-[11px] text-slate-800 font-mono tracking-wide leading-none shadow-xs">
              Raw Camera Frame
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            Ensure both the lateral flow strip and reference color blocks are visible and free of glare.
          </p>
        </div>

        {/* Right: Metrics Meters */}
        <div className="space-y-4">
          {/* 1. Blur & Focus (Laplacian Variance) */}
          <div className="p-4 rounded-2xl bg-[#faf8fb] border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-pink-600 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-normal">Focus & Edge Sharpness</span>
              </div>
              {getStatusBadge(metrics.blurStatus)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="tracking-wide">Laplacian Variance</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">{metrics.blurScore} / 300+</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  metrics.blurStatus === 'pass'
                    ? 'bg-emerald-500'
                    : metrics.blurStatus === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, (metrics.blurScore / 250) * 100)}%` }}
              />
            </div>
          </div>

          {/* 2. Mean Brightness */}
          <div className="p-4 rounded-2xl bg-[#faf8fb] border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-normal">Mean Luminance (Illuminance)</span>
              </div>
              {getStatusBadge(metrics.brightnessStatus)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="tracking-wide">Perceived Luminance</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">{metrics.brightnessScore} / 255</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  metrics.brightnessStatus === 'pass'
                    ? 'bg-emerald-500'
                    : metrics.brightnessStatus === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${(metrics.brightnessScore / 255) * 100}%` }}
              />
            </div>
          </div>

          {/* 3. Exposure Clipping */}
          <div className="p-4 rounded-2xl bg-[#faf8fb] border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-600 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-normal">Exposure Dynamic Range</span>
              </div>
              {getStatusBadge(metrics.exposureStatus)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="tracking-wide">Clipped Highlights/Shadows</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">{metrics.exposureScore}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  metrics.exposureStatus === 'pass'
                    ? 'bg-emerald-500'
                    : metrics.exposureStatus === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, metrics.exposureScore * 3)}%` }}
              />
            </div>
          </div>

          {/* 4. Glare Hotspot Detection */}
          <div className="p-4 rounded-2xl bg-[#faf8fb] border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-normal">Specular Glare Detection</span>
              </div>
              {getStatusBadge(metrics.glareStatus)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="tracking-wide">Specular Hotspot Fraction</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">{metrics.glareScore}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  metrics.glareStatus === 'pass'
                    ? 'bg-emerald-500'
                    : metrics.glareStatus === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, metrics.glareScore * 5)}%` }}
              />
            </div>
          </div>

          {/* 5. Image Resolution Dimensions */}
          <div className="p-4 rounded-2xl bg-[#faf8fb] border border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-normal">Sensor Frame Resolution</span>
              </div>
              {getStatusBadge(metrics.dimensionsStatus)}
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Diagnostic threshold: min 320×320. Captured: <strong className="font-mono text-slate-800 tabular-nums">{metrics.dimensionsScore.width}×{metrics.dimensionsScore.height}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <button
          onClick={onRetake}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors shadow-xs leading-none"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Retake Photo</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isFailed ? (
            <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold leading-normal">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Unreliable measurement blocked. Please retake photo.</span>
            </div>
          ) : (
            <button
              onClick={onProceed}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-bold tracking-wide shadow-md shadow-pink-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 leading-none"
            >
              <span>Proceed to Calibration & Sampling</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
