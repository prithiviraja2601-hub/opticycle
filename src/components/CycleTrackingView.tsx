import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  Clock,
  Sparkles,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  RotateCcw,
  Plus,
  Trash2,
  ChevronRight,
  Heart,
  Droplet,
  Flame,
  HelpCircle,
  ExternalLink,
  Edit3,
  BookmarkCheck,
} from 'lucide-react';
import {
  CycleSettings,
  CycleCalculationResult,
  MenstrualPhase,
  TimelineDay,
  PhaseInfo,
  PastPeriodRecord,
} from '../types';
import {
  getStoredCycleSettings,
  storeCycleSettings,
  clearStoredCycleSettings,
  computeCycleMetrics,
  getSampleCycleSettings,
  formatDateReadable,
  formatDateShort,
  toISODateString,
} from '../services/cycleTracker';

interface CycleTrackingViewProps {
  onOpenScanner?: () => void;
}

export const CycleTrackingView: React.FC<CycleTrackingViewProps> = ({ onOpenScanner }) => {
  // Cycle settings state
  const [settings, setSettings] = useState<CycleSettings | null>(() => getStoredCycleSettings());
  const [calculation, setCalculation] = useState<CycleCalculationResult | null>(() =>
    computeCycleMetrics(getStoredCycleSettings())
  );

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [inputLmpDate, setInputLmpDate] = useState('');
  const [inputCycleLength, setInputCycleLength] = useState(28);
  const [inputPeriodDuration, setInputPeriodDuration] = useState(5);
  const [formError, setFormError] = useState<string | null>(null);

  // Add past cycle log entry modal/state
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [newHistoryDate, setNewHistoryDate] = useState('');
  const [newHistoryDuration, setNewHistoryDuration] = useState(5);
  const [newHistoryCycleLen, setNewHistoryCycleLen] = useState(28);
  const [newHistoryFlow, setNewHistoryFlow] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [newHistoryNotes, setNewHistoryNotes] = useState('');

  // Selected day in timeline for interactive inspection
  const [inspectedDay, setInspectedDay] = useState<TimelineDay | null>(null);

  // Recompute calculations whenever settings change
  useEffect(() => {
    const calc = computeCycleMetrics(settings);
    setCalculation(calc);
    if (calc && calc.timelineDays.length > 0) {
      // Default inspected day to today
      const today = calc.timelineDays.find((d) => d.isToday) || calc.timelineDays[0];
      setInspectedDay(today);
    } else {
      setInspectedDay(null);
    }
  }, [settings]);

  // Sync edit form with current settings
  useEffect(() => {
    if (settings) {
      setInputLmpDate(settings.lastPeriodStartDate || '');
      setInputCycleLength(settings.averageCycleLength || 28);
      setInputPeriodDuration(settings.periodDuration || 5);
    } else {
      setInputLmpDate('');
      setInputCycleLength(28);
      setInputPeriodDuration(5);
    }
  }, [settings, isEditing]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!inputLmpDate) {
      setFormError('Please select the start date of your last menstrual period.');
      return;
    }

    const selectedDate = new Date(`${inputLmpDate}T00:00:00`);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      setFormError('Last menstrual period start date cannot be in the future.');
      return;
    }

    const cycleLen = Math.max(20, Math.min(60, Number(inputCycleLength) || 28));
    const periodDur = Math.max(1, Math.min(15, Number(inputPeriodDuration) || 5));

    if (periodDur >= cycleLen) {
      setFormError('Period bleeding duration must be shorter than your total cycle length.');
      return;
    }

    const updatedSettings: CycleSettings = {
      lastPeriodStartDate: inputLmpDate,
      averageCycleLength: cycleLen,
      periodDuration: periodDur,
      history: settings?.history || [
        {
          id: `record-${Date.now()}`,
          startDate: inputLmpDate,
          durationDays: periodDur,
          cycleLengthDays: cycleLen,
          flowIntensity: 'medium',
          notes: 'Initial recorded cycle.',
        },
      ],
    };

    storeCycleSettings(updatedSettings);
    setSettings(updatedSettings);
    setIsEditing(false);
  };

  const handleLoadSample = () => {
    const sample = getSampleCycleSettings();
    storeCycleSettings(sample);
    setSettings(sample);
    setIsEditing(false);
    setFormError(null);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear your cycle tracking dates and history?')) {
      clearStoredCycleSettings();
      setSettings(null);
      setCalculation(null);
      setInspectedDay(null);
      setIsEditing(false);
    }
  };

  const handleAddHistoryRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHistoryDate) return;

    const record: PastPeriodRecord = {
      id: `record-${Date.now()}`,
      startDate: newHistoryDate,
      durationDays: Number(newHistoryDuration) || 5,
      cycleLengthDays: Number(newHistoryCycleLen) || 28,
      flowIntensity: newHistoryFlow,
      notes: newHistoryNotes.trim() || undefined,
    };

    const currentHistory = settings?.history || [];
    const updatedHistory = [record, ...currentHistory].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    const updatedSettings: CycleSettings = {
      lastPeriodStartDate: settings?.lastPeriodStartDate || newHistoryDate,
      averageCycleLength: settings?.averageCycleLength || 28,
      periodDuration: settings?.periodDuration || 5,
      history: updatedHistory,
    };

    storeCycleSettings(updatedSettings);
    setSettings(updatedSettings);
    setIsAddingHistory(false);
    setNewHistoryDate('');
    setNewHistoryNotes('');
  };

  const handleDeleteHistoryRecord = (id: string) => {
    if (!settings) return;
    const filtered = settings.history.filter((h) => h.id !== id);
    const updatedSettings: CycleSettings = {
      ...settings,
      history: filtered,
    };
    storeCycleSettings(updatedSettings);
    setSettings(updatedSettings);
  };

  // Render Phase Badge
  const getPhaseBadge = (phase: MenstrualPhase) => {
    switch (phase) {
      case 'Menstrual':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-rose-50 text-rose-700 border border-rose-200">
            <Droplet className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Menstrual</span>
          </span>
        );
      case 'Follicular':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>Follicular</span>
          </span>
        );
      case 'Ovulation Window':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-pink-50 text-pink-700 border border-pink-200">
            <Flame className="w-3.5 h-3.5 text-pink-600 shrink-0" />
            <span>Ovulation Window</span>
          </span>
        );
      case 'Luteal':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-sky-50 text-sky-700 border border-sky-200">
            <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Luteal</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      {/* Biomedical & Colorimetric Non-Diagnostic Disclaimer */}
      <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm leading-relaxed">
          <p className="font-bold text-slate-900 tracking-normal text-sm sm:text-base leading-snug">
            Research Prototype: Non-Diagnostic Menstrual Cycle Modeling
          </p>
          <p className="text-amber-900/90 mt-1 leading-relaxed">
            All cycle days, phase labels, and next period dates are statistical calendar estimations calculated from your recorded menstrual dates and average cycle lengths. They are subject to biological variation and are not clinical predictions.
            <strong className="block mt-1 font-semibold text-slate-900">
              Strict Optical Boundary: Never infer an actual systemic hormone concentration (such as exact LH, estradiol, or progesterone levels) or confirm ovulation from biosensing patch or test strip color alone.
            </strong>
          </p>
        </div>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-50/90 via-rose-50/40 to-white border border-pink-100 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-pink-700 border border-pink-200 text-xs font-bold tracking-wider uppercase mb-3 shadow-xs">
              <CalendarDays className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <span>Physiological Cycle Modeling</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug">
              Menstrual Cycle{' '}
              <span className="bg-gradient-to-r from-pink-600 via-rose-600 to-pink-500 bg-clip-text text-transparent">
                Tracking & Phase Modeling
              </span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              Correlate optical biosensing and densitometry scans with your physiological cycle timeline. View estimated cycle days, biological phases, and predicted next period dates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {calculation?.hasData ? (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-pink-50/50 text-slate-800 border border-slate-200 hover:border-pink-200 font-semibold text-xs tracking-wide shadow-xs transition-all leading-none"
                >
                  <Edit3 className="w-4 h-4 text-pink-600 shrink-0" />
                  <span>{isEditing ? 'Close Settings' : 'Edit Cycle Settings'}</span>
                </button>
                {onOpenScanner && (
                  <button
                    onClick={onOpenScanner}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-600 text-white font-semibold text-xs tracking-wide shadow-md shadow-pink-500/20 active:scale-95 transition-all leading-none"
                  >
                    <span>Record Optical Scan</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={handleLoadSample}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-50 hover:bg-pink-100/70 text-pink-700 border border-pink-200 font-bold text-xs tracking-wide transition-colors leading-none"
              >
                <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
                <span>Load Sample Benchmark Data</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MISSING DATA PROMPT / ONBOARDING VIEW */}
      {!calculation?.hasData && !isEditing && (
        <div className="bg-white border border-pink-100 rounded-3xl p-6 sm:p-10 shadow-sm text-center max-w-3xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-100 to-rose-100 text-pink-600 flex items-center justify-center mx-auto shadow-sm">
            <Calendar className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Cycle Data Required
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              OptiCycle does not invent or fabricate dates. To calculate your current cycle day and provide phase estimates, please enter the start date of your last menstrual period and cycle parameters.
            </p>
          </div>

          <div className="bg-[#faf8fb] border border-pink-100/80 rounded-2xl p-6 max-w-xl mx-auto text-left shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pink-700 mb-4 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enter Your Cycle History</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Last Period Start Date (Day 1 of bleeding)
                </label>
                <input
                  type="date"
                  max={toISODateString(new Date())}
                  value={inputLmpDate}
                  onChange={(e) => setInputLmpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm font-mono text-slate-900 outline-none bg-white"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The first day of full bleeding in your most recent menstrual cycle.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Average Cycle Length (Days)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="60"
                    value={inputCycleLength}
                    onChange={(e) => setInputCycleLength(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm font-mono text-slate-900 outline-none bg-white"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Standard reference is 28 days (typical 21–35).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Period Bleeding Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={inputPeriodDuration}
                    onChange={(e) => setInputPeriodDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm font-mono text-slate-900 outline-none bg-white"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Typical menses spans 3 to 7 days (default 5).</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs tracking-wide shadow-md shadow-pink-500/25 active:scale-95 transition-all"
                >
                  Save & Initialize Cycle Tracking
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs tracking-wide transition-colors"
                >
                  Load Sample Benchmark Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CYCLE FORM MODAL / DRAWER */}
      {isEditing && (
        <div className="bg-white border border-pink-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Edit Cycle Tracking Parameters</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your recorded LMP, average cycle length, or bleeding duration.
              </p>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Last Period Start Date
                </label>
                <input
                  type="date"
                  max={toISODateString(new Date())}
                  value={inputLmpDate}
                  onChange={(e) => setInputLmpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm font-mono text-slate-900 outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Cycle Length (Days)
                </label>
                <input
                  type="number"
                  min="20"
                  max="60"
                  value={inputCycleLength}
                  onChange={(e) => setInputCycleLength(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm font-mono text-slate-900 outline-none bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Period Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={inputPeriodDuration}
                  onChange={(e) => setInputPeriodDuration(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm font-mono text-slate-900 outline-none bg-white"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-bold text-xs tracking-wide shadow-sm"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearData}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Cycle Data</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ACTIVE CYCLE MODEL DASHBOARD (DISPLAYED WHEN USER HAS RECORDED DATES) */}
      {calculation?.hasData && (
        <>
          {/* Top 3 Metric Cards: Current Day, Estimated Phase, Next Period Estimate */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Current Cycle Day */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-pink-200/70 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-[11px] font-bold tracking-wider uppercase leading-none">
                    Current Cycle Day
                  </span>
                  <div className="p-2 rounded-xl bg-pink-50 text-pink-600">
                    <Calendar className="w-4 h-4 shrink-0" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
                    Day {calculation.currentCycleDay}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">
                    / {calculation.cycleLength}
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Calculated from your recorded LMP start of{' '}
                  <strong className="text-slate-800 font-mono">
                    {formatDateShort(new Date(`${settings?.lastPeriodStartDate}T00:00:00`))}
                  </strong>
                  .
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Cycle progress:</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  {Math.round((calculation.currentCycleDay / calculation.cycleLength) * 100)}%
                </span>
              </div>
            </div>

            {/* Card 2: Estimated Menstrual Phase */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-pink-200/70 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-[11px] font-bold tracking-wider uppercase leading-none">
                    Estimated Menstrual Phase
                  </span>
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <Sparkles className="w-4 h-4 shrink-0" />
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  {getPhaseBadge(calculation.currentPhase)}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {calculation.phaseInfo.name}
                </h3>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Date range:{' '}
                  <span className="font-semibold text-slate-800">
                    {calculation.phaseInfo.dateRangeLabel}
                  </span>{' '}
                  ({calculation.phaseInfo.dayRangeLabel})
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Phase status:</span>
                <span className="font-bold text-pink-600 uppercase tracking-wider text-[10px] bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                  Estimated Active
                </span>
              </div>
            </div>

            {/* Card 3: Next Period Estimate */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-pink-200/70 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-[11px] font-bold tracking-wider uppercase leading-none">
                    Next Period Estimate
                  </span>
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <Clock className="w-4 h-4 shrink-0" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {calculation.nextPeriodEstimate.dateFormatted}
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  {calculation.nextPeriodEstimate.daysRemaining === 0 ? (
                    <span className="font-bold text-rose-600">Estimated today (Day {calculation.cycleLength + 1})</span>
                  ) : (
                    <span>
                      Estimated in{' '}
                      <strong className="text-slate-900 font-bold font-mono">
                        {calculation.nextPeriodEstimate.daysRemaining} days
                      </strong>
                    </span>
                  )}
                  . Model uncertainty: {calculation.nextPeriodEstimate.uncertaintyText}.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Statistical basis:</span>
                <span className="font-semibold text-slate-700">
                  {calculation.cycleLength}-day history
                </span>
              </div>
            </div>
          </div>

          {/* CYCLE TIMELINE: Visual Timeline Showing Cycle Days & Estimated Phases */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Cycle Timeline & Phase Map
                  </h2>
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                    {calculation.cycleLength} Days
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Click on any day to inspect estimated dates, physiological events, and hormonal context.
                </p>
              </div>

              {/* Phase Color Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-400 shrink-0" />
                  <span className="text-slate-600 text-[11px] font-medium">Menstrual (1–{calculation.periodDuration})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-purple-400 shrink-0" />
                  <span className="text-slate-600 text-[11px] font-medium">Follicular</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-pink-500 shrink-0 ring-2 ring-pink-300" />
                  <span className="text-slate-900 text-[11px] font-bold">Ovulation Window</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-sky-400 shrink-0" />
                  <span className="text-slate-600 text-[11px] font-medium">Luteal</span>
                </div>
              </div>
            </div>

            {/* Continuous Phase Strip Bar */}
            <div className="w-full">
              <div className="h-4 rounded-full overflow-hidden flex shadow-inner bg-slate-100">
                {calculation.allPhases.map((phase) => {
                  const widthPct = ((phase.endDay - phase.startDay + 1) / calculation.cycleLength) * 100;
                  return (
                    <div
                      key={phase.phase}
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: phase.accentColor,
                      }}
                      className="h-full relative group transition-opacity hover:opacity-90"
                      title={`${phase.name}: Days ${phase.startDay}–${phase.endDay} (${Math.round(widthPct)}%)`}
                    />
                  );
                })}
              </div>
              {/* Labels below strip */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1.5 px-1">
                <span>Day 1 (Menses)</span>
                <span>Day {Math.round(calculation.cycleLength / 2)} (Mid-Cycle)</span>
                <span>Day {calculation.cycleLength} (Cycle End)</span>
              </div>
            </div>

            {/* Interactive Day-by-Day Grid / Strip */}
            <div className="overflow-x-auto pb-2 pt-3">
              <div className="flex items-center gap-1.5 min-w-[700px] sm:min-w-0">
                {calculation.timelineDays.map((d) => {
                  const isSelected = inspectedDay?.dayNumber === d.dayNumber;
                  const isToday = d.isToday;

                  let colorClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200';
                  if (d.phase === 'Menstrual') {
                    colorClass = isToday
                      ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300'
                      : isSelected
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100/70 border-rose-200/80';
                  } else if (d.phase === 'Follicular') {
                    colorClass = isToday
                      ? 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-300'
                      : isSelected
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100/70 border-purple-200/80';
                  } else if (d.phase === 'Ovulation Window') {
                    colorClass = isToday
                      ? 'bg-pink-600 text-white border-pink-700 ring-2 ring-pink-400'
                      : isSelected
                      ? 'bg-pink-100 text-pink-900 border-pink-300'
                      : 'bg-pink-50 text-pink-700 hover:bg-pink-100/70 border-pink-200/80';
                  } else {
                    // Luteal
                    colorClass = isToday
                      ? 'bg-sky-600 text-white border-sky-700 ring-2 ring-sky-300'
                      : isSelected
                      ? 'bg-sky-100 text-sky-900 border-sky-300'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100/70 border-sky-200/80';
                  }

                  return (
                    <button
                      key={d.dayNumber}
                      onClick={() => setInspectedDay(d)}
                      className={`flex-1 min-w-[34px] py-2.5 px-1 rounded-xl flex flex-col items-center justify-center border transition-all text-center relative ${colorClass} ${
                        isSelected ? 'scale-105 shadow-sm font-bold z-10' : ''
                      }`}
                      title={`Day ${d.dayNumber} (${d.dateStr}) - ${d.phase}${isToday ? ' [Today]' : ''}`}
                    >
                      {isToday && (
                        <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[9px] font-extrabold uppercase tracking-widest leading-tight shadow-xs">
                          Now
                        </span>
                      )}
                      {d.isPeakDay && !isToday && (
                        <span className="absolute -top-1.5 w-2 h-2 rounded-full bg-pink-500 animate-pulse" title="Estimated Ovulation Midpoint" />
                      )}
                      <span className="text-xs font-mono font-bold leading-none">{d.dayNumber}</span>
                      <span className="text-[9px] opacity-80 mt-1 leading-none truncate max-w-full">
                        {d.dateStr.split(' ')[1] || d.dayNumber}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inspected Day Details Callout */}
            {inspectedDay && (
              <div className="p-4 rounded-2xl bg-[#faf8fb] border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-pink-200 text-pink-700 flex items-center justify-center font-black font-mono text-base shrink-0 shadow-xs">
                    {inspectedDay.dayNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm">
                        Day {inspectedDay.dayNumber} ({inspectedDay.dateStr})
                      </p>
                      {getPhaseBadge(inspectedDay.phase)}
                      {inspectedDay.isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                          Current Day
                        </span>
                      )}
                      {inspectedDay.isPeakDay && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 border border-pink-300">
                          Estimated Ovulation Peak
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {inspectedDay.phase === 'Menstrual' &&
                        'Early cycle bleeding phase. Basal estradiol and progesterone levels prevail.'}
                      {inspectedDay.phase === 'Follicular' &&
                        'Follicular development under FSH stimulation. Progressive estradiol synthesis.'}
                      {inspectedDay.phase === 'Ovulation Window' &&
                        'Projected fertile window. Pre-ovulatory LH surge candidate window (statistical approximation).'}
                      {inspectedDay.phase === 'Luteal' &&
                        'Corpus luteum phase. Endometrial secretoriness driven by progesterone dominance.'}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 shrink-0 text-xs text-slate-500">
                  <span>Iso Date: </span>
                  <span className="font-mono text-slate-800 font-semibold">{inspectedDay.isoDate}</span>
                </div>
              </div>
            )}
          </div>

          {/* PHASE DETAILS: Show estimated current phase, its date range, and the basis for the estimate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Phase Details Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base tracking-tight">
                      Phase Details & Physiological Profile
                    </h3>
                  </div>
                  {getPhaseBadge(calculation.currentPhase)}
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Current Estimated Phase
                    </span>
                    <h4 className="text-xl font-black text-slate-900 mt-0.5">
                      {calculation.phaseInfo.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Span: <strong className="text-slate-800 font-semibold">{calculation.phaseInfo.dayRangeLabel}</strong> • Dates: <strong className="text-slate-800 font-semibold">{calculation.phaseInfo.dateRangeLabel}</strong>
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#faf8fb] border border-pink-100/70 space-y-2">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BookmarkCheck className="w-4 h-4 text-pink-600" />
                      <span>Physiological Dynamics</span>
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {calculation.phaseInfo.description}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1.5">
                    <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Endocrine Basis (Educational Reference)</span>
                    </p>
                    <p className="text-xs text-purple-800/90 leading-relaxed">
                      {calculation.phaseInfo.hormoneBasis}
                    </p>
                  </div>
                </div>
              </div>

              {/* Basis for Estimate */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-pink-500" />
                  <span>Basis for Estimate</span>
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {calculation.basisForEstimate}
                </p>
              </div>
            </div>

            {/* All 4 Phases Comparison Table & Scientific Uncertainty */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  Cycle Phase Schedule
                </h3>
                <span className="text-xs text-slate-500 font-medium">All 4 Phases</span>
              </div>

              <div className="space-y-3">
                {calculation.allPhases.map((phase) => {
                  const isCurrent = phase.phase === calculation.currentPhase;
                  return (
                    <div
                      key={phase.phase}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-pink-50/60 border-pink-200 shadow-xs'
                          : 'bg-[#faf8fb] border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: phase.accentColor }}
                          />
                          <p className="font-bold text-slate-900 text-sm">{phase.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-slate-700">
                            {phase.dayRangeLabel}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-600 text-white leading-none">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span>Projected Date: {phase.dateRangeLabel}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {phase.endDay - phase.startDay + 1} days
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explicit Research Warning */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-slate-600" />
                  <span>Clinical Boundary Standards</span>
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Menstrual cycle length can naturally vary from month to month due to stress, illness, travel, and endocrine shifts. Mathematical models predict probability intervals, not exact biological occurrences.
                </p>
              </div>
            </div>
          </div>

          {/* CYCLE HISTORY SECTION: Allow users to view & enter their recorded history */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recorded Cycle History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged periods and cycle parameters used to calculate average cycle lengths.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddingHistory(!isAddingHistory)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100/70 text-pink-700 border border-pink-200 text-xs font-bold tracking-wide transition-colors leading-none"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Period Entry</span>
                </button>
              </div>
            </div>

            {/* Current Active Parameters Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-[#faf8fb] border border-pink-100/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Last Period Start Date
                </span>
                <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {settings?.lastPeriodStartDate
                    ? formatDateReadable(new Date(`${settings.lastPeriodStartDate}T00:00:00`))
                    : 'Not configured'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Average Cycle Length
                </span>
                <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {settings?.averageCycleLength || 28} Days
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Period Duration
                </span>
                <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                  {settings?.periodDuration || 5} Days
                </p>
              </div>
            </div>

            {/* Add Past Period Form Modal / Drawer */}
            {isAddingHistory && (
              <form
                onSubmit={handleAddHistoryRecord}
                className="p-5 rounded-2xl bg-white border border-pink-200 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">Log Previous Period</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingHistory(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      max={toISODateString(new Date())}
                      value={newHistoryDate}
                      onChange={(e) => setNewHistoryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-pink-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="14"
                      value={newHistoryDuration}
                      onChange={(e) => setNewHistoryDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-pink-500 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Flow Intensity
                    </label>
                    <select
                      value={newHistoryFlow}
                      onChange={(e) => setNewHistoryFlow(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:border-pink-500 bg-white"
                    >
                      <option value="light">Light</option>
                      <option value="medium">Medium</option>
                      <option value="heavy">Heavy</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Notes / Symptoms (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mild cramps, temperature shift noted..."
                    value={newHistoryNotes}
                    onChange={(e) => setNewHistoryNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-pink-500 bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-sm"
                  >
                    Save Period Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingHistory(false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* List of Recorded Past Cycles */}
            {settings?.history && settings.history.length > 0 ? (
              <div className="space-y-3">
                {settings.history.map((record, idx) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-2xl bg-[#faf8fb] hover:bg-pink-50/40 border border-slate-100 flex items-center justify-between gap-4 transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                        <Droplet className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 text-sm">
                            {formatDateReadable(new Date(`${record.startDate}T00:00:00`))}
                          </p>
                          {idx === 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 border border-pink-200">
                              Current / Most Recent
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                            Flow: {record.flowIntensity || 'medium'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>Duration: <strong className="text-slate-800">{record.durationDays} days</strong></span>
                          {record.cycleLengthDays && (
                            <>
                              <span>•</span>
                              <span>Cycle length: <strong className="text-slate-800">{record.cycleLengthDays} days</strong></span>
                            </>
                          )}
                          {record.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-slate-600 truncate max-w-xs">{record.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteHistoryRecord(record.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                      title="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-pink-100 rounded-2xl bg-[#faf8fb]">
                <Calendar className="w-8 h-8 text-pink-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-800">No past cycle logs</p>
                <p className="text-xs text-slate-500 mt-1">Log previous period dates to track your cycle consistency.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
