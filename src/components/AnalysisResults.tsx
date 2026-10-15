import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  Download,
  Share2,
  ShieldAlert,
  Sliders,
  Layers,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { ScanRecord } from '../types';

interface AnalysisResultsProps {
  scan: ScanRecord;
  onRetake: () => void;
  onSaveToHistory: (scan: ScanRecord) => void;
  onViewAllHistory: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  scan,
  onRetake,
  onSaveToHistory,
  onViewAllHistory,
}) => {
  const [copiedHex, setCopiedHex] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeColor = scan.calibratedColor || scan.rawColor;

  const copyHexToClipboard = () => {
    navigator.clipboard.writeText(activeColor.hex);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  const handleSave = () => {
    onSaveToHistory(scan);
    setSaved(true);
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${scan.id}_opticycle_analysis.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCsv = () => {
    const headers = [
      'ScanID',
      'Timestamp',
      'IsCalibrated',
      'Raw_R',
      'Raw_G',
      'Raw_B',
      'Raw_Hex',
      'Calibrated_R',
      'Calibrated_G',
      'Calibrated_B',
      'Calibrated_Hex',
      'CIE_L',
      'CIE_A',
      'CIE_B',
      'OpticalDensity_OD',
      'SimulatedInterpretation',
      'BlurScore',
      'Luminance',
      'QualityStatus',
    ];
    const row = [
      scan.id,
      scan.timestamp,
      scan.isCalibrated ? 'TRUE' : 'FALSE',
      scan.rawColor.r,
      scan.rawColor.g,
      scan.rawColor.b,
      scan.rawColor.hex,
      scan.calibratedColor ? scan.calibratedColor.r : 'N/A',
      scan.calibratedColor ? scan.calibratedColor.g : 'N/A',
      scan.calibratedColor ? scan.calibratedColor.hex : 'N/A',
      activeColor.lab.l,
      activeColor.lab.a,
      activeColor.lab.b,
      scan.simulatedInterpretation.chromaticIndex,
      `"${scan.simulatedInterpretation.cyclePhaseHypothesis}"`,
      scan.qualityMetrics.blurScore,
      scan.qualityMetrics.brightnessScore,
      scan.qualityMetrics.overallStatus,
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `${scan.id}_opticycle_data.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-8 max-w-5xl mx-auto shadow-sm space-y-8">
      {/* Mandatory Non-Diagnostic Clinical Disclaimer */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed">
          <p className="font-bold text-sm sm:text-base text-slate-900 tracking-normal mb-1">
            Research Prototype Notice: Non-Diagnostic Optical Tool
          </p>
          <p className="text-rose-900/90 leading-relaxed">
            Research prototype. Results are experimental and not clinically validated. Not for diagnosis or treatment. RGB and colorimetry measurements do not directly quantify hormone concentration, confirm ovulation, determine fertility status, or predict menstrual cycle phases.
          </p>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">{scan.title}</h2>
            {scan.isSimulated && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-bold tracking-wider uppercase leading-none">
                Simulated Record
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 flex items-center gap-2.5 flex-wrap leading-normal">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Captured: {new Date(scan.timestamp).toLocaleString()}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-700 tabular-nums font-semibold">ID: {scan.id}</span>
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quality Badge */}
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 leading-none ${
              scan.qualityMetrics.overallStatus === 'pass'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {scan.qualityMetrics.overallStatus === 'pass' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <span>Quality: {scan.qualityMetrics.overallStatus.toUpperCase()}</span>
          </span>

          {/* Calibration Badge */}
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 leading-none ${
              scan.isCalibrated
                ? 'bg-pink-50 text-pink-700 border border-pink-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>{scan.isCalibrated ? 'Affine Calibrated' : 'Raw RGB Mode'}</span>
          </span>
        </div>
      </div>

      {/* Main Analysis Section: Colorimetric Measurements & Swatches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cropped Patch Thumbnail with Pixel Swatch */}
        <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-5 sm:p-6 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 leading-none">
            Sampled Test Band Zone
          </span>

          <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md mb-4 bg-slate-950 flex items-center justify-center">
            {scan.patchThumbnail ? (
              <img
                src={scan.patchThumbnail}
                alt="Cropped Patch thumbnail"
                className="w-full h-full object-contain"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ backgroundColor: activeColor.hex }}
              />
            )}
            <div className="absolute inset-0 border border-pink-500/40 pointer-events-none" />
          </div>

          <span className="text-xs text-slate-500 leading-relaxed">
            Representative Trimmed Mean Pixel Sampling (10% two-sided outlier rejection)
          </span>
        </div>

        {/* Center: Color Swatch Comparison (Raw vs Calibrated) */}
        <div className="lg:col-span-2 bg-[#faf8fb] rounded-2xl border border-slate-150 p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Chrominance & Coordinates</h3>
            <button
              onClick={copyHexToClipboard}
              className="flex items-center gap-1.5 text-xs text-pink-700 hover:text-pink-800 font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-xs transition-colors leading-none tracking-wide"
            >
              {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedHex ? 'Copied!' : 'Copy Hex'}</span>
            </button>
          </div>

          {/* Color Blocks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Raw Camera Color */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl shadow-inner border border-slate-200 shrink-0"
                style={{ backgroundColor: scan.rawColor.hex }}
              />
              <div className="space-y-1">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block leading-none">
                  Raw Sensor RGB
                </span>
                <p className="font-mono text-base font-black text-slate-900 tracking-wide tabular-nums leading-snug">
                  {scan.rawColor.hex}
                </p>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  R: {scan.rawColor.r}  G: {scan.rawColor.g}  B: {scan.rawColor.b}
                </p>
              </div>
            </div>

            {/* Calibrated Color */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl shadow-inner border border-slate-200 shrink-0 relative overflow-hidden"
                style={{
                  backgroundColor: scan.calibratedColor ? scan.calibratedColor.hex : scan.rawColor.hex,
                }}
              >
                {scan.isCalibrated && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-tl-md flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase font-bold tracking-wider text-pink-700 block leading-none">
                  {scan.isCalibrated ? 'Affine Normalized Color' : 'Calibrated Color (Pending)'}
                </span>
                <p className="font-mono text-base font-black text-slate-900 tracking-wide tabular-nums leading-snug">
                  {scan.calibratedColor ? scan.calibratedColor.hex : 'Raw Fallback'}
                </p>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  {scan.calibratedColor
                    ? `R: ${scan.calibratedColor.r}  G: ${scan.calibratedColor.g}  B: ${scan.calibratedColor.b}`
                    : 'Awaiting reference card'}
                </p>
              </div>
            </div>
          </div>

          {/* Color Space Coordinates (Lab, HSV) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">CIE L*</span>
              <p className="font-mono text-sm font-bold text-slate-800 tabular-nums leading-tight">{activeColor.lab.l}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">CIE a* (Red)</span>
              <p className="font-mono text-sm font-bold text-pink-600 tabular-nums leading-tight">{activeColor.lab.a}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">CIE b* (Yellow)</span>
              <p className="font-mono text-sm font-bold text-amber-600 tabular-nums leading-tight">{activeColor.lab.b}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs text-center space-y-1">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider block">HSV Hue / Sat</span>
              <p className="font-mono text-sm font-bold text-slate-800 tabular-nums leading-tight">
                {activeColor.hsv.h}° / {activeColor.hsv.s}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Experimental Interpretation Box (Simulated Prototype Only) */}
      <div className="bg-[#faf8fb] rounded-2xl border border-slate-150 p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-pink-600 shrink-0" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Experimental Densitometry Readout (Simulated Model)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Confidence: <strong className="text-slate-800 font-mono tabular-nums">{scan.simulatedInterpretation.confidenceInterval}</strong>
          </span>
        </div>

        {/* Optical Density Gauge */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-700 font-semibold tracking-normal">Relative Optical Density (OD)</span>
            <span className="font-mono font-bold text-pink-600 text-sm sm:text-base tabular-nums">
              {scan.simulatedInterpretation.chromaticIndex.toFixed(2)} / 1.00 OD
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-200 p-0.5 border border-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-400 via-rose-500 to-rose-600 transition-all"
              style={{ width: `${Math.min(100, scan.simulatedInterpretation.chromaticIndex * 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
            <span>0.00 (Blank / Faint)</span>
            <span>0.50 (Moderate Contrast)</span>
            <span>1.00 (High Dye Saturation)</span>
          </div>
        </div>

        {/* Qualitative Findings & Prototype Boundaries */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center gap-3 text-xs sm:text-sm flex-wrap">
            <span className="font-semibold text-slate-500">Band Intensity:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md leading-normal">
              {scan.simulatedInterpretation.relativeBandIntensity}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-500">Hypothesized Phase Model:</span>
            <span className="text-pink-700 font-bold">
              {scan.simulatedInterpretation.cyclePhaseHypothesis}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
            {scan.simulatedInterpretation.researchNote}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <button
          onClick={onRetake}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors shadow-xs leading-none"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>New / Retake Scan</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={exportCsv}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold tracking-wide flex items-center gap-1.5 transition-colors shadow-xs leading-none"
            title="Download CSV dataset"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>CSV</span>
          </button>

          <button
            onClick={exportJson}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold tracking-wide flex items-center gap-1.5 transition-colors shadow-xs leading-none"
            title="Download JSON record"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saved}
            className={`px-6 py-2.5 rounded-2xl font-bold text-xs tracking-wide flex items-center gap-2 transition-all leading-none ${
              saved
                ? 'bg-emerald-600 text-white cursor-default shadow-xs'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white shadow-md shadow-pink-500/25 active:scale-95'
            }`}
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{saved ? 'Saved to History' : 'Save to History'}</span>
          </button>

          <button
            onClick={onViewAllHistory}
            className="px-4 py-2.5 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold tracking-wide transition-colors leading-none"
          >
            View History
          </button>
        </div>
      </div>
    </div>
  );
};
