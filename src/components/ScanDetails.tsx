import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Printer,
  Download,
  Trash2,
  ShieldAlert,
  Sliders,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { ScanRecord } from '../types';

interface ScanDetailsProps {
  scan: ScanRecord;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export const ScanDetails: React.FC<ScanDetailsProps> = ({ scan, onBack, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const activeColor = scan.calibratedColor || scan.rawColor;

  const handlePrint = () => {
    window.print();
  };

  const exportSingleRecordJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scan, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `${scan.id}_report.json`);
    dl.click();
    dl.remove();
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-8 max-w-5xl mx-auto shadow-sm space-y-8 pb-12">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-pink-600 transition-colors tracking-wide leading-none"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Back to History</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold tracking-wide flex items-center gap-1.5 transition-colors shadow-xs leading-none"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>Print Report</span>
          </button>

          <button
            onClick={exportSingleRecordJson}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold tracking-wide flex items-center gap-1.5 transition-colors shadow-xs leading-none"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>JSON</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Delete this scan record permanently?')) {
                onDelete(scan.id);
                onBack();
              }
            }}
            className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors shadow-xs"
            title="Delete scan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">{scan.title}</h1>
            {scan.isSimulated && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-bold tracking-wider uppercase leading-none">
                Simulated Record
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 mt-1.5 flex-wrap leading-normal">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(scan.timestamp).toLocaleString()}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-700 tabular-nums font-semibold">ID: {scan.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase leading-none ${
              scan.qualityMetrics.overallStatus === 'pass'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            Quality: {scan.qualityMetrics.overallStatus.toUpperCase()}
          </span>

          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase leading-none ${
              scan.isCalibrated
                ? 'bg-pink-50 text-pink-700 border border-pink-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {scan.isCalibrated ? 'Affine Calibrated' : 'Raw RGB Mode'}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
          <p className="font-bold text-slate-900 tracking-normal mb-0.5">Prototype Research Documentation</p>
          <p className="text-amber-800">
            Results are experimental and not clinically validated. Not for medical diagnosis or treatment.
          </p>
        </div>
      </div>

      {/* Two Column Grid: Patch Preview & Color Coordinates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Patch Thumbnail & Region Coordinates */}
        <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">
            Sampled Optical Test Region
          </h3>

          <div className="flex items-center gap-4">
            <div className="w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shrink-0 relative shadow-sm">
              {scan.patchThumbnail ? (
                <img
                  src={scan.patchThumbnail}
                  alt="Cropped Patch"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: activeColor.hex }}
                />
              )}
            </div>

            <div className="text-xs space-y-1.5 font-mono text-slate-700 tabular-nums">
              <p className="font-sans font-bold text-slate-900 text-sm tracking-normal">Spatial Sampling Bounds</p>
              <p className="text-slate-500">
                X: {scan.patchCoordinates.x.toFixed(2)} | Y: {scan.patchCoordinates.y.toFixed(2)}
              </p>
              <p className="text-slate-500">
                W: {scan.patchCoordinates.width.toFixed(2)} | H: {scan.patchCoordinates.height.toFixed(2)}
              </p>
              <p className="text-pink-600 text-xs font-sans font-bold pt-1">
                Representative Trimmed Mean
              </p>
            </div>
          </div>

          {/* Colorimetric Readout */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">Raw Camera RGB</span>
              <p className="font-mono text-base font-black text-slate-900 tabular-nums">
                {scan.rawColor.hex}
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                ({scan.rawColor.r}, {scan.rawColor.g}, {scan.rawColor.b})
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-pink-700 uppercase font-bold tracking-wider block">
                Calibrated RGB
              </span>
              <p className="font-mono text-base font-black text-slate-900 tabular-nums">
                {scan.calibratedColor ? scan.calibratedColor.hex : 'Raw Fallback'}
              </p>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {scan.calibratedColor
                  ? `(${scan.calibratedColor.r}, ${scan.calibratedColor.g}, ${scan.calibratedColor.b})`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: CIE L*a*b* & Densitometry */}
        <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-5 sm:p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">
            Colorimetric Space & Optical Density
          </h3>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">CIE L*</span>
              <p className="font-mono text-base font-bold text-slate-800 tabular-nums">{activeColor.lab.l}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">CIE a*</span>
              <p className="font-mono text-base font-bold text-pink-600 tabular-nums">{activeColor.lab.a}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">CIE b*</span>
              <p className="font-mono text-base font-bold text-amber-600 tabular-nums">{activeColor.lab.b}</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-700 font-bold tracking-normal">Optical Density (OD):</span>
              <span className="font-mono font-black text-pink-600 text-base tabular-nums">
                {scan.simulatedInterpretation.chromaticIndex.toFixed(2)} OD
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
              <span>Band Contrast:</span>
              <span className="text-slate-900 font-bold">
                {scan.simulatedInterpretation.relativeBandIntensity}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
              <span>Hypothesized Phase Model:</span>
              <span className="text-pink-700 font-bold">
                {scan.simulatedInterpretation.cyclePhaseHypothesis}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Quality Breakdown */}
      <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-5 sm:p-6 space-y-3.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">
          Recorded Quality Audit Metrics
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-slate-500 font-medium tracking-normal block">Focus Sharpness</span>
            <p className="font-mono text-base font-bold text-slate-800 tabular-nums">
              {scan.qualityMetrics.blurScore} / 300+
            </p>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
              {scan.qualityMetrics.blurStatus.toUpperCase()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-slate-500 font-medium tracking-normal block">Mean Luminance</span>
            <p className="font-mono text-base font-bold text-slate-800 tabular-nums">
              {scan.qualityMetrics.brightnessScore} / 255
            </p>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
              {scan.qualityMetrics.brightnessStatus.toUpperCase()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-slate-500 font-medium tracking-normal block">Clipped Range</span>
            <p className="font-mono text-base font-bold text-slate-800 tabular-nums">
              {scan.qualityMetrics.exposureScore}%
            </p>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
              {scan.qualityMetrics.exposureStatus.toUpperCase()}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-slate-500 font-medium tracking-normal block">Specular Glare</span>
            <p className="font-mono text-base font-bold text-slate-800 tabular-nums">
              {scan.qualityMetrics.glareScore}%
            </p>
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
              {scan.qualityMetrics.glareStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Affine Matrix if calibrated */}
      {scan.calibrationResult && scan.calibrationResult.matrix && (
        <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">
              Affine Transformation Parameters
            </h3>
            <span className="text-xs text-slate-500 font-mono tracking-wide">
              Residual RMSE: <strong className="text-slate-900 font-bold tabular-nums">{scan.calibrationResult.rmse}</strong>
            </span>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 font-mono text-xs text-slate-700 space-y-2 tabular-nums shadow-xs">
            {scan.calibrationResult.matrix.map((row, idx) => (
              <div key={idx} className="flex gap-4 items-center">
                <span className="w-20 text-slate-500 uppercase font-bold text-[11px] tracking-wider">{idx === 3 ? 'Bias:' : `Row ${idx}:`}</span>
                <span className="text-pink-600 font-semibold w-24">R: {row[0].toFixed(3).padStart(6, ' ')}</span>
                <span className="text-emerald-700 font-semibold w-24">G: {row[1].toFixed(3).padStart(6, ' ')}</span>
                <span className="text-cyan-700 font-semibold w-24">B: {row[2].toFixed(3).padStart(6, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-5 sm:p-6 space-y-2.5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider leading-none">
          Researcher Field Notes
        </h3>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          {scan.notes || 'No specific field notes recorded for this measurement.'}
        </p>
      </div>
    </div>
  );
};
