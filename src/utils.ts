import { PoolHistoryPoint } from './types';

export const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] as const;

/**
 * Returns parsed date/time parts in Asia/Taipei timezone.
 * Robust against timezone differences and avoids double-offset bugs.
 */
export function getTaipeiTimeParts(date: Date = new Date()) {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
  }).format(date); // 'YYYY-MM-DD'

  const fullTimeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date); // 'HH:mm:ss'

  const [hourStr, minStr] = fullTimeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const min = parseInt(minStr, 10);

  const weekdayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    weekday: 'short',
  }).format(date);
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const day = weekdayMap[weekdayStr] ?? 0;

  return {
    dateStr,
    timeStr: `${hourStr}:${minStr}`,
    fullTimeStr,
    hour,
    min,
    day,
    timeValue: hour * 60 + min,
  };
}

/**
 * Returns a Date object representing the given time in Asia/Taipei.
 * Idempotent: repeated calls will not shift the time multiple times.
 */
export function getTaipeiDate(baseDate: Date = new Date()): Date {
  const { dateStr, fullTimeStr } = getTaipeiTimeParts(baseDate);
  return new Date(`${dateStr}T${fullTimeStr}+08:00`);
}

/**
 * Checks if NTU sports center swimming pool is currently open to the public.
 * Official public opening hours:
 * - Mon - Fri: 08:00 - 21:30 (480 to 1290 minutes)
 * - Sat: 09:00 - 21:30 (540 to 1290 minutes)
 * - Sun: 09:00 - 17:30 (540 to 1050 minutes)
 */
export function isOperatingHours(date: Date = new Date()): boolean {
  const { day, timeValue } = getTaipeiTimeParts(date);

  if (day >= 1 && day <= 5 && timeValue >= 480 && timeValue <= 1290) return true;
  if (day === 6 && timeValue >= 540 && timeValue <= 1290) return true;
  if (day === 0 && timeValue >= 540 && timeValue <= 1050) return true;
  return false;
}

/**
 * Checks if the crawler should collect data.
 * Starts 30 minutes before official opening (07:30 weekdays, 08:30 weekends) as pre-opening warm-up buffer.
 * - Mon - Fri: 07:30 - 21:30 (450 to 1290 minutes)
 * - Sat: 08:30 - 21:30 (510 to 1290 minutes)
 * - Sun: 08:30 - 17:30 (510 to 1050 minutes)
 */
export function isCrawlerActiveHours(date: Date = new Date()): boolean {
  const { day, timeValue } = getTaipeiTimeParts(date);

  if (day >= 1 && day <= 5 && timeValue >= 450 && timeValue <= 1290) return true;
  if (day === 6 && timeValue >= 510 && timeValue <= 1290) return true;
  if (day === 0 && timeValue >= 510 && timeValue <= 1050) return true;
  return false;
}

/**
 * Checks if a specific history point falls within data retention hours.
 */
export function isPointInOperatingHours(point: { day?: string; date?: string; time: string }): boolean {
  if (!point || !point.time) return false;
  const [hStr, mStr] = point.time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const timeValue = h * 60 + m;

  let dayOfWeek = -1;
  if (point.day) {
    dayOfWeek = DAY_LABELS.indexOf(point.day as any);
  }
  if (dayOfWeek === -1 && point.date) {
    dayOfWeek = new Date(`${point.date}T12:00:00+08:00`).getDay();
  }

  // Weekday (Mon-Fri): Keep 07:30 - 21:30
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return timeValue >= 450 && timeValue <= 1290;
  }
  // Saturday: Keep 08:30 - 21:30
  if (dayOfWeek === 6) {
    return timeValue >= 510 && timeValue <= 1290;
  }
  // Sunday: Keep 08:30 - 17:30
  if (dayOfWeek === 0) {
    return timeValue >= 510 && timeValue <= 1050;
  }

  return timeValue >= 450 && timeValue <= 1290;
}

/**
 * Filters raw history into an active sliding window (default: last 28 days / 4 weeks).
 * Significantly optimizes JSON payload size, edge worker network transit, and parsing overhead.
 */
export function getActiveWindowHistory(
  history: PoolHistoryPoint[],
  maxDays: number = 28
): PoolHistoryPoint[] {
  if (!history || history.length === 0) return [];
  const uniqueDates = [...new Set(history.map((p) => p.date))];
  const activeDates = new Set(uniqueDates.slice(-maxDays));
  return history.filter((p) => activeDates.has(p.date));
}

/**
 * Calculates trend indicator ('↑' | '↓' | '➔') comparing latest point with recent moving average.
 */
export function calculateTrend(todayPoints: PoolHistoryPoint[]): '↑' | '↓' | '➔' {
  if (todayPoints.length <= 1) return '➔';
  const currentIdx = todayPoints.length - 1;
  const startIdx = Math.max(0, currentIdx - 6);
  const slicePoints = todayPoints.slice(startIdx, currentIdx);
  if (slicePoints.length > 0) {
    const sum = slicePoints.reduce((acc, p) => acc + p.value, 0);
    const intervalAvg = sum / slicePoints.length;
    if (todayPoints[currentIdx].value > intervalAvg + 1) return '↑';
    if (todayPoints[currentIdx].value < intervalAvg - 1) return '↓';
  }
  return '➔';
}

/**
 * Calculates predictive dynamic offset based on a hybrid model:
 * - 75% Short-term Linear Weighted Moving Average (3:2:1 LWMA of recent 15m rates)
 * - 25% Historical Typical Curve Slope (15m ahead delta from 4-week same-day-of-week typicalHistory)
 * Falls back gracefully to 100% LWMA when typicalHistory is unavailable.
 */
export function calculatePredictiveOffset(
  todayPoints: PoolHistoryPoint[],
  typicalHistory?: { time: string; avg?: number; netAvg?: number }[]
): number {
  const len = todayPoints.length;
  if (len < 4) return 0;

  const p0 = todayPoints[len - 1];
  const p1 = todayPoints[len - 2];
  const p2 = todayPoints[len - 3];
  const p3 = todayPoints[len - 4];

  const parseMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const pairs = [[p0, p1], [p1, p2], [p2, p3]];
  const weights = [3, 2, 1];
  let weightedRateSum = 0;
  let weightTotal = 0;
  let validIntervalCount = 0;

  for (let i = 0; i < 3; i++) {
    const [curr, prev] = pairs[i];
    const dt = parseMinutes(curr.time) - parseMinutes(prev.time);
    // 收緊至 25 分鐘，超過視為爬蟲斷線/過期區間不予採納
    if (dt > 0 && dt <= 25) {
      const ratePerMinute = (curr.value - prev.value) / dt;
      weightedRateSum += ratePerMinute * weights[i];
      weightTotal += weights[i];
      validIntervalCount++;
    }
  }

  if (weightTotal === 0 || validIntervalCount === 0) return 0;

  const weightedRatePerMin = weightedRateSum / weightTotal;
  const wmaChange15m = weightedRatePerMin * 15;

  // 步驟 2.5：融合 75% 短期 WMA + 25% 常態歷史均線斜率 (Typical Curve 15m Slope)
  let predictedChange15m = wmaChange15m;
  if (typicalHistory && typicalHistory.length > 0) {
    const currMin = parseMinutes(p0.time);
    const futureMin = currMin + 15;
    let typNow: number | undefined;
    let typFuture: number | undefined;

    for (const pt of typicalHistory) {
      const ptMin = parseMinutes(pt.time);
      const val = pt.avg ?? pt.netAvg;
      if (val === undefined) continue;
      if (Math.abs(ptMin - currMin) <= 2) typNow = val;
      if (Math.abs(ptMin - futureMin) <= 2) typFuture = val;
    }

    if (typNow !== undefined && typFuture !== undefined) {
      const typicalChange15m = typFuture - typNow;
      predictedChange15m = 0.75 * wmaChange15m + 0.25 * typicalChange15m;
    }
  }

  // 自適應抗噪防護：3 段完整時信任度高 (0.7 / ±8)；過渡期 1~2 段時保守防護 (0.5 / ±4)
  const isFullConfidence = validIntervalCount === 3;
  const damping = isFullConfidence ? 0.7 : 0.5;
  const clampLimit = isFullConfidence ? 8 : 4;

  const offset = -Math.round(predictedChange15m * damping);
  return Math.max(-clampLimit, Math.min(clampLimit, offset));
}

/**
 * Generates 28 days (4 weeks) of realistic mock data for DEMO mode.
 */
export function generateMockHistory(
  tpeNow: Date,
  randomHour: number,
  randomMin: number,
  demoChartMode: 'focus' | 'all'
): PoolHistoryPoint[] {
  const fakeHistory: PoolHistoryPoint[] = [];
  const { dateStr: tpeDateStr } = getTaipeiTimeParts(tpeNow);
  const [year, month, day] = tpeDateStr.split('-').map(Number);
  const baseMidnight = new Date(Date.UTC(year, month - 1, day));

  for (let i = 28; i >= 0; i--) {
    const d = new Date(baseMidnight.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;
    const currentPointDayOfWeek = d.getUTCDay();
    const currentPointDayStr = DAY_LABELS[currentPointDayOfWeek];

    const pOpenMin = currentPointDayOfWeek === 0 || currentPointDayOfWeek === 6 ? 510 : 450;
    const pCloseMin = currentPointDayOfWeek === 0 ? 1050 : 1290;

    for (let tVal = pOpenMin; tVal < pCloseMin; tVal += 5) {
      const h = Math.floor(tVal / 60);
      const m = tVal % 60;
      const tStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      if (isToday && (h > randomHour || (h === randomHour && m > randomMin))) break;

      const isFocusTime = tStr >= '16:30' && tStr <= '19:30';
      const isChartStep = m % 20 === 0;
      if (!isToday && !isChartStep && !(demoChartMode === 'focus' && isFocusTime)) continue;

      let mockValue = Math.floor(Math.random() * 15) + 10;
      if (h >= 16 && h <= 19) mockValue += Math.floor(Math.random() * 25) + 15;

      fakeHistory.push({
        date: dateStr,
        day: currentPointDayStr,
        time: tStr,
        value: Math.max(0, mockValue),
      });
    }
  }

  return fakeHistory;
}

/**
 * Calculates baseline (staff count) for a given day's points.
 * @deprecated Baseline deduction is no longer used; kept for backward compatibility.
 */
export function getDayBaseline(
  dayPoints: PoolHistoryPoint[],
  dayOfWeek: number
): { baseline: number; isValid: boolean } {
  return { baseline: 0, isValid: false };
}

/**
 * Edge Worker Aggregator:
 * Calculates typical headcount curve for the same day-of-week over the past 4 weeks (28 days).
 * 1. Excludes current day and non-operational days (where max headcount <= 0).
 * 2. Uses official raw headcount directly (no baseline deduction).
 * 3. Linearly interpolates gaps between sparse sampling points (up to 45 mins) so that
 *    5-minute ticks like 14:00, 15:00 aren't missed when samples were taken at 14:05, 14:35.
 * 4. Averages headcount values across all valid historical days at each 5-minute interval.
 */
export function calculateTypicalHistory(
  rawHistory: PoolHistoryPoint[],
  targetDayOfWeek: number,
  targetTodayStr: string,
  maxDays: number = 28
): { time: string; avg: number; netAvg: number }[] {
  if (!rawHistory || rawHistory.length === 0) return [];

  const uniqueDates = [...new Set(rawHistory.map((p) => p.date))]
    .filter((d) => d !== targetTodayStr)
    .slice(-maxDays);

  if (uniqueDates.length === 0) return [];

  const targetDayLabel = DAY_LABELS[targetDayOfWeek];

  // 1. Group points by date for matching day of week
  const sameDayPointsByDate: Record<string, PoolHistoryPoint[]> = {};
  for (const p of rawHistory) {
    if (uniqueDates.includes(p.date) && p.day === targetDayLabel) {
      if (!sameDayPointsByDate[p.date]) {
        sameDayPointsByDate[p.date] = [];
      }
      sameDayPointsByDate[p.date].push(p);
    }
  }

  const validDates = Object.keys(sameDayPointsByDate);
  if (validDates.length === 0) return [];

  // 2. Compute series for each date and discard invalid/zero-headcount days
  const validDailySeries: Record<string, Record<string, number>> = {};

  for (const date of validDates) {
    const dayPoints = [...sameDayPointsByDate[date]].sort((a, b) => a.time.localeCompare(b.time));
    if (dayPoints.length === 0) continue;

    // Map time to raw headcount
    const rawMap: Record<string, number> = {};
    let maxVal = 0;
    for (const p of dayPoints) {
      rawMap[p.time] = p.value;
      if (p.value > maxVal) maxVal = p.value;
    }

    // If maxVal is 0 (pool was closed, maintenance, or test dummy data), ignore this day
    if (maxVal === 0) continue;

    // Official public opening hours for targetDayOfWeek:
    // Mon - Fri: 08:00 (480) - 21:30 (1290)
    // Sat:       09:00 (540) - 21:30 (1290)
    // Sun:       09:00 (540) - 17:30 (1050)
    const isWeekend = targetDayOfWeek === 0 || targetDayOfWeek === 6;
    const isSunday = targetDayOfWeek === 0;
    const openMin = isWeekend ? 540 : 480;
    const closeMin = isSunday ? 1050 : 1290;

    // Interpolate 5-minute slots between official openMin and closeMin
    const sortedRecordedTimes = Object.keys(rawMap).sort();

    const interpolatedMap: Record<string, number> = {};
    for (let tVal = openMin; tVal <= closeMin; tVal += 5) {
      const h = Math.floor(tVal / 60);
      const m = tVal % 60;
      const tStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      if (rawMap[tStr] !== undefined) {
        interpolatedMap[tStr] = rawMap[tStr];
      } else {
        // Find previous and next recorded times
        const prevTime = sortedRecordedTimes.filter((t) => t < tStr).pop();
        const nextTime = sortedRecordedTimes.find((t) => t > tStr);

        if (prevTime && nextTime) {
          const [pH, pM] = prevTime.split(':').map(Number);
          const [nH, nM] = nextTime.split(':').map(Number);
          const prevVal = pH * 60 + pM;
          const nextVal = nH * 60 + nM;

          // If gap is <= 45 minutes, linearly interpolate
          if (nextVal - prevVal <= 45) {
            const ratio = (tVal - prevVal) / (nextVal - prevVal);
            const val = rawMap[prevTime] + ratio * (rawMap[nextTime] - rawMap[prevTime]);
            interpolatedMap[tStr] = Math.round(val);
          } else {
            interpolatedMap[tStr] = rawMap[prevTime];
          }
        } else if (prevTime) {
          interpolatedMap[tStr] = rawMap[prevTime];
        } else if (nextTime) {
          interpolatedMap[tStr] = rawMap[nextTime];
        }
      }
    }

    validDailySeries[date] = interpolatedMap;
  }

  const activeValidDates = Object.keys(validDailySeries);
  if (activeValidDates.length === 0) return [];

  // 3. Aggregate all times across valid days
  const allTimesSet = new Set<string>();
  for (const date of activeValidDates) {
    for (const t of Object.keys(validDailySeries[date])) {
      allTimesSet.add(t);
    }
  }

  const sortedTimes = [...allTimesSet].sort();
  return sortedTimes.map((time) => {
    const vals: number[] = [];
    for (const date of activeValidDates) {
      if (validDailySeries[date][time] !== undefined) {
        vals.push(validDailySeries[date][time]);
      }
    }
    const avg = vals.length > 0 ? Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length) : 0;
    return { time, avg, netAvg: avg };
  });
}

/** Backward-compatible alias */
export const calculateNetTypicalHistory = calculateTypicalHistory;
