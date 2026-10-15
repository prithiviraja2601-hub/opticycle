import {
  CycleSettings,
  CycleCalculationResult,
  MenstrualPhase,
  TimelineDay,
  PhaseInfo,
  PastPeriodRecord,
} from '../types';

export const CYCLE_STORAGE_KEY = 'opticycle_cycle_settings';

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_DURATION = 5;

/**
 * Safely parse a local YYYY-MM-DD string into a Date at midnight local time.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return new Date();
  }
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Format date to standard readable format e.g. "Oct 15, 2026"
 */
export function formatDateReadable(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date to short readable format e.g. "Oct 15"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date to ISO string "YYYY-MM-DD"
 */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retrieve saved cycle settings from localStorage
 */
export function getStoredCycleSettings(): CycleSettings | null {
  try {
    const raw = localStorage.getItem(CYCLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.lastPeriodStartDate) {
      return null;
    }
    return {
      lastPeriodStartDate: parsed.lastPeriodStartDate,
      averageCycleLength: Number(parsed.averageCycleLength) || DEFAULT_CYCLE_LENGTH,
      periodDuration: Number(parsed.periodDuration) || DEFAULT_PERIOD_DURATION,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (e) {
    console.warn('Failed to parse stored cycle settings:', e);
    return null;
  }
}

/**
 * Save cycle settings to localStorage
 */
export function storeCycleSettings(settings: CycleSettings): void {
  try {
    localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save cycle settings to localStorage:', e);
  }
}

/**
 * Remove cycle settings from localStorage
 */
export function clearStoredCycleSettings(): void {
  try {
    localStorage.removeItem(CYCLE_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear cycle settings:', e);
  }
}

/**
 * Perform scientific cycle calculations based on user's LMP and recorded cycle history.
 * If data is missing or invalid, returns a result with hasData: false (does NOT invent dates).
 */
export function computeCycleMetrics(settings: CycleSettings | null): CycleCalculationResult | null {
  if (!settings || !settings.lastPeriodStartDate || settings.lastPeriodStartDate.trim() === '') {
    return null;
  }

  const lmpMidnight = parseLocalDate(settings.lastPeriodStartDate);
  if (isNaN(lmpMidnight.getTime())) {
    return null;
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const diffMs = todayMidnight.getTime() - lmpMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // If the recorded date is in the future, we still cannot invent past cycle days
  if (diffDays < 0) {
    return null;
  }

  const cycleLength = Math.max(20, Math.min(60, Math.round(settings.averageCycleLength) || DEFAULT_CYCLE_LENGTH));
  const periodDuration = Math.max(1, Math.min(15, Math.round(settings.periodDuration) || DEFAULT_PERIOD_DURATION));

  // Gynecological standard: Day 1 is the first day of menses
  const currentCycleDay = (diffDays % cycleLength) + 1;
  const cyclesCompleted = Math.floor(diffDays / cycleLength);

  // Start date of the current cycle interval
  const currentCycleStartMidnight = new Date(
    lmpMidnight.getTime() + cyclesCompleted * cycleLength * 86400000
  );

  // Next expected period
  const nextPeriodMidnight = new Date(
    currentCycleStartMidnight.getTime() + cycleLength * 86400000
  );
  const daysUntilNextPeriod = Math.max(0, Math.round((nextPeriodMidnight.getTime() - todayMidnight.getTime()) / 86400000));

  // Physiological modeling for phases
  // In standard endocrine models, the luteal phase is relatively fixed (14 days before next menses, ~12-16 day range).
  // Ovulation midpoint ~ Day (cycleLength - 14)
  const ovulationPeakDay = Math.max(periodDuration + 2, cycleLength - 14);
  const ovulationStartDay = Math.max(periodDuration + 1, ovulationPeakDay - 3);
  const ovulationEndDay = Math.min(cycleLength - 1, ovulationPeakDay + 1);

  // Determine current phase
  let currentPhase: MenstrualPhase = 'Menstrual';
  if (currentCycleDay <= periodDuration) {
    currentPhase = 'Menstrual';
  } else if (currentCycleDay < ovulationStartDay) {
    currentPhase = 'Follicular';
  } else if (currentCycleDay <= ovulationEndDay) {
    currentPhase = 'Ovulation Window';
  } else {
    currentPhase = 'Luteal';
  }

  // Construct phase descriptions & definitions
  const allPhases: PhaseInfo[] = [
    {
      phase: 'Menstrual',
      name: 'Menstrual Phase',
      startDay: 1,
      endDay: periodDuration,
      dayRangeLabel: `Days 1–${periodDuration}`,
      dateRangeLabel: `${formatDateShort(currentCycleStartMidnight)} – ${formatDateShort(
        new Date(currentCycleStartMidnight.getTime() + (periodDuration - 1) * 86400000)
      )}`,
      status:
        currentCycleDay <= periodDuration
          ? 'current'
          : 'past',
      accentColor: '#f43f5e', // rose-500
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200',
      description: 'Endometrial shedding initiated by the regression of the corpus luteum and subsequent drop in estrogen and progesterone.',
      hormoneBasis: 'Estrogen and progesterone reach basal levels; pituitary FSH begins modest early rise to recruit a new follicular cohort.',
    },
    {
      phase: 'Follicular',
      name: 'Follicular Phase',
      startDay: periodDuration + 1,
      endDay: ovulationStartDay - 1,
      dayRangeLabel: `Days ${periodDuration + 1}–${ovulationStartDay - 1}`,
      dateRangeLabel: `${formatDateShort(
        new Date(currentCycleStartMidnight.getTime() + periodDuration * 86400000)
      )} – ${formatDateShort(
        new Date(currentCycleStartMidnight.getTime() + (ovulationStartDay - 2) * 86400000)
      )}`,
      status:
        currentCycleDay > periodDuration && currentCycleDay < ovulationStartDay
          ? 'current'
          : currentCycleDay >= ovulationStartDay
          ? 'past'
          : 'upcoming',
      accentColor: '#8b5cf6', // purple-500
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-700',
      badgeBorder: 'border-purple-200',
      description: 'Dominant ovarian follicle selection and progressive proliferation of the uterine lining (endometrium).',
      hormoneBasis: 'Follicle-stimulating hormone (FSH) stimulates granulosa cells; rising 17β-estradiol exerts positive feedback towards cycle mid-point.',
    },
    {
      phase: 'Ovulation Window',
      name: 'Ovulation Window (Estimated)',
      startDay: ovulationStartDay,
      endDay: ovulationEndDay,
      dayRangeLabel: `Days ${ovulationStartDay}–${ovulationEndDay}`,
      dateRangeLabel: `${formatDateShort(
        new Date(currentCycleStartMidnight.getTime() + (ovulationStartDay - 1) * 86400000)
      )} – ${formatDateShort(
        new Date(currentCycleStartMidnight.getTime() + (ovulationEndDay - 1) * 86400000)
      )}`,
      status:
        currentCycleDay >= ovulationStartDay && currentCycleDay <= ovulationEndDay
          ? 'current'
          : currentCycleDay > ovulationEndDay
          ? 'past'
          : 'upcoming',
      accentColor: '#ec4899', // pink-500
      badgeBg: 'bg-pink-50',
      badgeText: 'text-pink-700',
      badgeBorder: 'border-pink-200',
      description: 'Statistical fertile / peri-ovulatory window based on sperm survival (~5 days) and oocyte viability (~12–24h) around estimated LH surge.',
      hormoneBasis: 'Sustained elevated estradiol triggers a pre-ovulatory Luteinizing Hormone (LH) surge. Ovulation occurs ~24–36 hours post-surge onset.',
    },
    {
      phase: 'Luteal',
      name: 'Luteal Phase',
      startDay: ovulationEndDay + 1,
      endDay: cycleLength,
      dayRangeLabel: `Days ${ovulationEndDay + 1}–${cycleLength}`,
      dateRangeLabel: `${formatDateShort(
        new Date(currentCycleStartMidnight.getTime() + ovulationEndDay * 86400000)
      )} – ${formatDateShort(
        new Date(currentCycleStartMidnight.getTime() + (cycleLength - 1) * 86400000)
      )}`,
      status:
        currentCycleDay > ovulationEndDay
          ? 'current'
          : 'upcoming',
      accentColor: '#0ea5e9', // sky-500
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-700',
      badgeBorder: 'border-sky-200',
      description: 'Post-ovulatory phase characterized by corpus luteum secretory transformation to support potential blastocyst implantation.',
      hormoneBasis: 'Corpus luteum secretes dominant progesterone alongside secondary estradiol peak, inhibiting LH/FSH until luteolysis occurs.',
    },
  ];

  const currentPhaseInfo = allPhases.find((p) => p.phase === currentPhase) || allPhases[0];

  // Timeline array for every day of the cycle
  const timelineDays: TimelineDay[] = [];
  for (let d = 1; d <= cycleLength; d++) {
    const dayDate = new Date(currentCycleStartMidnight.getTime() + (d - 1) * 86400000);
    let dayPhase: MenstrualPhase = 'Menstrual';
    if (d <= periodDuration) {
      dayPhase = 'Menstrual';
    } else if (d < ovulationStartDay) {
      dayPhase = 'Follicular';
    } else if (d <= ovulationEndDay) {
      dayPhase = 'Ovulation Window';
    } else {
      dayPhase = 'Luteal';
    }

    timelineDays.push({
      dayNumber: d,
      dateStr: formatDateShort(dayDate),
      isoDate: toISODateString(dayDate),
      phase: dayPhase,
      isToday: d === currentCycleDay,
      isPeakDay: d === ovulationPeakDay,
      status: d < currentCycleDay ? 'past' : d === currentCycleDay ? 'today' : 'upcoming',
    });
  }

  const basisForEstimate = `Calculated using your recorded average cycle length of ${cycleLength} days and last menstrual period start date (${formatDateReadable(
    lmpMidnight
  )}). In human physiology, the post-ovulatory luteal phase is typically stable at 14 days (±2 days) before menses. Ovulation is statistically projected around Day ${ovulationPeakDay}, with the estimated fertile window spanning Days ${ovulationStartDay}–${ovulationEndDay}. This is a calendar-based model with a ±2 to 3 day physiological uncertainty band.`;

  return {
    hasData: true,
    currentCycleDay,
    cycleLength,
    periodDuration,
    currentPhase,
    phaseInfo: currentPhaseInfo,
    nextPeriodEstimate: {
      dateFormatted: formatDateReadable(nextPeriodMidnight),
      isoDate: toISODateString(nextPeriodMidnight),
      daysRemaining: daysUntilNextPeriod,
      uncertaintyText: '±2 to 3 days (normal variance)',
    },
    basisForEstimate,
    timelineDays,
    allPhases,
  };
}

/**
 * Pre-populate sample cycle history if user requests demonstration
 */
export function getSampleCycleSettings(): CycleSettings {
  const now = new Date();
  // Set LMP to 13 days ago so user sees an active mid-cycle/ovulation window state
  const sampleLmp = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
  const samplePrev1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 41);
  const samplePrev2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 69);

  return {
    lastPeriodStartDate: toISODateString(sampleLmp),
    averageCycleLength: 28,
    periodDuration: 5,
    history: [
      {
        id: 'hist-1',
        startDate: toISODateString(sampleLmp),
        durationDays: 5,
        cycleLengthDays: 28,
        flowIntensity: 'medium',
        notes: 'Current active cycle reference.',
      },
      {
        id: 'hist-2',
        startDate: toISODateString(samplePrev1),
        durationDays: 5,
        cycleLengthDays: 28,
        flowIntensity: 'medium',
        notes: 'Previous regular cycle.',
      },
      {
        id: 'hist-3',
        startDate: toISODateString(samplePrev2),
        durationDays: 4,
        cycleLengthDays: 29,
        flowIntensity: 'light',
        notes: 'Cycle logged with mild cramps on Day 1.',
      },
    ],
  };
}
