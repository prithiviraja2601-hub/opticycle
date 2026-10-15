import React, { useMemo } from 'react';
import {
  Camera,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Layers,
  Sparkles,
  ShieldAlert,
  Clock,
  CalendarDays,
  Droplet,
  Flame,
} from 'lucide-react';
import { ScanRecord, CalibrationResult } from '../types';
import { getStoredCycleSettings, computeCycleMetrics } from '../services/cycleTracker';

interface DashboardProps {
  scans: ScanRecord[];
  activeCalibration: CalibrationResult | null;
  onOpenScanner: () => void;
  onOpenCalibration: () => void;
  onViewScan: (scan: ScanRecord) => void;
  onViewAllHistory: () => void;
  onOpenCycleTracker?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  scans,
  activeCalibration,
  onOpenScanner,
  onOpenCalibration,
  onViewScan,
  onViewAllHistory,
  onOpenCycleTracker,
}) => {
  const cycleMetrics = useMemo(() => {
    return computeCycleMetrics(getStoredCycleSettings());
  }, []);
  const totalScans = scans.length;
  const calibratedCount = scans.filter((s) => s.isCalibrated).length;
  const calibratedPct = totalScans ? Math.round((calibratedCount / totalScans) * 100) : 0;
  const passCount = scans.filter((s) => s.qualityMetrics.overallStatus === 'pass').length;
  const passRate = totalScans ? Math.round((passCount / totalScans) * 100) : 100;

  const avgOpticalDensity = totalScans
    ? (
        scans.reduce((acc, s) => acc + s.simulatedInterpretation.chromaticIndex, 0) / totalScans
      ).toFixed(2)
    : '0.00';

  const recentScans = scans.slice(0, 4);

  return (
    <div className="space-y-8 pb-12">
      {/* Research Disclaimer Header Banner */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-amber-900 tracking-normal text-sm sm:text-base leading-snug">
            Experimental Biomedical Research Prototype
          </p>
          <p className="text-amber-800/90 mt-1 leading-relaxed text-xs sm:text-sm">
            Results are experimental and not clinically validated. Colorimetry measurements are optical approximations and must not be used for medical diagnosis, ovulation confirmation, fertility decisions, or treatment planning.
          </p>
        </div>
      </div>

      {/* Hero Section with Soft Pink & White Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-50/80 via-rose-50/30 to-white border border-pink-100 shadow-sm p-6 sm:p-10 lg:p-12">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-pink-300/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-pink-700 border border-pink-200/80 text-xs font-bold tracking-wider uppercase mb-5 leading-none shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span>Standardized Optical Densitometry</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Colorimetric Precision for{' '}
            <span className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 bg-clip-text text-transparent">
              Biosensing Patches
            </span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
            OptiCycle normalizes ambient lighting variations using 6-target affine color calibration, providing reliable RGB, CIE L*a*b*, and optical density readouts from smartphone photos.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-sm sm:text-base tracking-wide shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/35 active:scale-95 transition-all leading-none"
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span>Launch Optical Scanner</span>
            </button>

            <button
              onClick={onOpenCalibration}
              className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-white hover:bg-pink-50/40 text-slate-800 border border-slate-200 hover:border-pink-200 font-semibold text-sm sm:text-base tracking-wide shadow-xs transition-all leading-none"
            >
              <Sliders className="w-5 h-5 text-pink-600 shrink-0" />
              <span>Calibrate Reference Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-pink-200/70 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold tracking-wider uppercase leading-none">Total Scans</span>
            <div className="p-2 rounded-xl bg-pink-50 text-pink-600">
              <Layers className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <p className="mt-3 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
            {totalScans}
          </p>
          <p className="mt-2.5 text-xs text-slate-500 leading-normal">
            <span className="font-semibold text-slate-800">{scans.filter((s) => !s.isSimulated).length}</span> Real / <span className="font-semibold text-slate-800">{scans.filter((s) => s.isSimulated).length}</span> Benchmarks
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-pink-200/70 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold tracking-wider uppercase leading-none">Calibrated Ratio</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <p className="mt-3 text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight tabular-nums leading-none">
            {calibratedPct}%
          </p>
          <p className="mt-2.5 text-xs text-slate-500 leading-normal">
            Affine matrix normalized
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-pink-200/70 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold tracking-wider uppercase leading-none">Mean Optical Density</span>
            <div className="p-2 rounded-xl bg-pink-50 text-pink-600">
              <TrendingUp className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <p className="mt-3 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight tabular-nums leading-none flex items-baseline gap-1.5">
            <span>{avgOpticalDensity}</span>
            <span className="text-sm font-semibold text-slate-500 tracking-normal">OD</span>
          </p>
          <p className="mt-2.5 text-xs text-slate-500 leading-normal">
            Across recorded cycle entries
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-pink-200/70 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold tracking-wider uppercase leading-none">Quality Pass Rate</span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
              <FileCheck className="w-4 h-4 shrink-0" />
            </div>
          </div>
          <p className="mt-3 text-3xl sm:text-4xl font-black text-cyan-700 tracking-tight tabular-nums leading-none">
            {passRate}%
          </p>
          <p className="mt-2.5 text-xs text-slate-500 leading-normal">
            Passed blur & glare tests
          </p>
        </div>
      </div>

      {/* 3-Step Optical Protocol Guide */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-6 pb-3 border-b border-slate-100 gap-1.5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Standard Optical Capture Protocol
          </h2>
          <span className="text-xs font-semibold text-pink-700 tracking-normal">
            Pre-Analytical Quality Standards
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[#faf8fb] border border-pink-100/70 rounded-2xl p-5 relative hover:bg-pink-50/40 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center font-bold text-sm mb-3.5 leading-none shadow-xs">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-normal">Align 6-Color Reference Card</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Place the printed OptiCycle calibration card adjacent to your test strip on a neutral matte surface under uniform diffuse light.
            </p>
          </div>

          <div className="bg-[#faf8fb] border border-pink-100/70 rounded-2xl p-5 relative hover:bg-pink-50/40 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center font-bold text-sm mb-3.5 leading-none shadow-xs">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-normal">Center Test Patch in Guide</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Position camera 15-20cm directly perpendicular to avoid parallax distortion, oblique reflections, or lens glare hotspots.
            </p>
          </div>

          <div className="bg-[#faf8fb] border border-pink-100/70 rounded-2xl p-5 relative hover:bg-pink-50/40 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center font-bold text-sm mb-3.5 leading-none shadow-xs">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-sm tracking-normal">Affine Correction & Densitometry</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              OptiCycle validates focus sharpness (Laplacian variance), estimates affine transformation, and extracts trimmed-mean RGB values.
            </p>
          </div>
        </div>
      </div>

      {/* Menstrual Cycle Tracking Overview Widget */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-xs">
              <CalendarDays className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Menstrual Cycle Tracking & Phase Modeling
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 uppercase tracking-wider">
                  New Section
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Biological calendar model correlated with optical patch readouts
              </p>
            </div>
          </div>

          {onOpenCycleTracker && (
            <button
              onClick={onOpenCycleTracker}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-50 hover:bg-pink-100/70 text-pink-700 border border-pink-200 text-xs font-bold tracking-wide transition-colors self-start sm:self-auto leading-none"
            >
              <span>{cycleMetrics?.hasData ? 'Open Cycle Timeline' : 'Enter Cycle Dates'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          )}
        </div>

        {cycleMetrics?.hasData ? (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#faf8fb] border border-pink-100/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current Cycle Day
              </span>
              <p className="text-2xl font-black text-slate-900 font-mono mt-1 flex items-baseline gap-1.5">
                <span>Day {cycleMetrics.currentCycleDay}</span>
                <span className="text-xs font-semibold text-slate-400">/ {cycleMetrics.cycleLength}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">Based on recorded LMP start date</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf8fb] border border-pink-100/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Estimated Phase
              </span>
              <p className="text-xl font-black text-pink-600 mt-1 flex items-center gap-2">
                <span>{cycleMetrics.currentPhase}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">{cycleMetrics.phaseInfo.dateRangeLabel}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf8fb] border border-pink-100/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Next Period Estimate
              </span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {cycleMetrics.nextPeriodEstimate.dateFormatted}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                In <strong className="font-mono">{cycleMetrics.nextPeriodEstimate.daysRemaining} days</strong> ({cycleMetrics.nextPeriodEstimate.uncertaintyText})
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 p-5 rounded-2xl bg-[#faf8fb] border border-pink-100/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                No Cycle Data Configured
              </p>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                OptiCycle does not invent or fabricate dates. Please enter your last menstrual period start date and cycle length to calculate your cycle day, estimated phase, and next period forecast.
              </p>
            </div>
            {onOpenCycleTracker && (
              <button
                onClick={onOpenCycleTracker}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-bold text-xs tracking-wide shrink-0 shadow-sm"
              >
                Set Up Cycle Tracking
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active Calibration Status Widget & Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calibration Card Widget */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Active Calibration</h3>
              <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600">
                <Sliders className="w-4 h-4 shrink-0" />
              </div>
            </div>

            {activeCalibration?.success ? (
              <div className="mt-4 space-y-3.5">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-snug">
                    <p className="font-bold text-slate-900">Affine Profile Active</p>
                    <p className="text-emerald-700 mt-1">
                      Residual RMSE: <span className="font-mono font-bold tabular-nums">{activeCalibration.rmse}</span>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Color matrix is compensating for ambient illuminant color temperature and sensor white-balance shift.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3.5">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-snug">
                    <p className="font-bold text-slate-900">Uncalibrated / Raw Mode</p>
                    <p className="text-amber-700 mt-1">Measurements will use raw camera sRGB.</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To eliminate lighting color shift, run calibration using a reference color card.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onOpenCalibration}
            className="mt-6 w-full py-3 px-4 rounded-2xl bg-white hover:bg-pink-50/40 text-slate-800 border border-slate-200 hover:border-pink-200 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all shadow-xs leading-none"
          >
            <span>{activeCalibration?.success ? 'Recalibrate Reference Card' : 'Calibrate Now'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-pink-600 shrink-0" />
          </button>
        </div>

        {/* Recent Scans Feed */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Recent Optical Scans</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest patch measurements</p>
            </div>
            <button
              onClick={onViewAllHistory}
              className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1.5 transition-colors tracking-wide leading-none"
            >
              <span>View All ({totalScans})</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          {recentScans.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-pink-100 rounded-2xl bg-[#faf8fb]">
              <Camera className="w-8 h-8 text-pink-400 mx-auto mb-2" />
              <p className="text-sm text-slate-800 font-bold">No scans recorded yet</p>
              <p className="text-xs text-slate-500 mt-1">Capture your first optical test strip</p>
              <button
                onClick={onOpenScanner}
                className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold tracking-wide shadow-sm"
              >
                Start New Scan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan) => {
                const color = scan.calibratedColor || scan.rawColor;
                return (
                  <div
                    key={scan.id}
                    onClick={() => onViewScan(scan)}
                    className="p-3.5 rounded-2xl bg-[#faf8fb] hover:bg-pink-50/50 border border-slate-100/90 hover:border-pink-200/80 cursor-pointer flex items-center justify-between gap-3 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl shadow-xs border border-slate-200 shrink-0"
                        style={{ backgroundColor: color.hex }}
                        title={`Color: ${color.hex}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 text-sm truncate leading-snug">{scan.title}</p>
                          {scan.isCalibrated ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold leading-none">
                              Calibrated
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold leading-none">
                              Raw
                            </span>
                          )}
                          {scan.isSimulated && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-semibold leading-none">
                              Simulated
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="font-mono text-slate-700 font-semibold tabular-nums">{color.hex}</span>
                          <span>•</span>
                          <span className="tabular-nums">
                            OD: <strong className="text-slate-900">{scan.simulatedInterpretation.chromaticIndex}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 hover:text-pink-600 shrink-0 transition-colors" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
