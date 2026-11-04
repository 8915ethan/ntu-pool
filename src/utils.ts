import { PoolHistoryPoint, ThresholdResult } from './types';

export const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] as const;

/**
 * 7 水道物理容量基準值
 * - 綠-黃 (快適上限): 5 快速道 * 3 人 + 2 慢速道 * 4 人 + 更衣緩衝男女各 5 人 = 15 + 8 + 10 = 33 人
 * - 黃-紅 (擁擠警戒): 5 快速道 * 4 人 + 2 慢速道 * 5 人 + 更衣緩衝男女各 6 人 = 20 + 10 + 12 = 42 人
 */
export const CAPACITY_LIMITS = {
  COMFORTABLE: 33, // 3 * 5 + 4 * 2 + 5 * 2
  CROWDED: 42,     // 4 * 5 + 5 * 2 + 6 * 2
} as const;

/**
 * 取得 Asia/Taipei 時區的時間細節（避免時區重複偏移）
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
 * 轉換日期至 Asia/Taipei 時區 (冪等性保護)
 */
export function getTaipeiDate(baseDate: Date = new Date()): Date {
  const { dateStr, fullTimeStr } = getTaipeiTimeParts(baseDate);
  return new Date(`${dateStr}T${fullTimeStr}+08:00`);
}

/**
 * 台大體育館營業時間檢查 (依據台北時區)
 * - 平日 (週一至五): 07:30 - 21:30
 * - 週六: 08:30 - 21:30
 * - 週日: 08:30 - 17:30
 */
export function isOperatingHours(date: Date = new Date()): boolean {
  const { day, timeValue } = getTaipeiTimeParts(date);

  if (day >= 1 && day <= 5 && timeValue >= 450 && timeValue <= 1290) return true;
  if (day === 6 && timeValue >= 510 && timeValue <= 1290) return true;
  if (day === 0 && timeValue >= 510 && timeValue <= 1050) return true;
  return false;
}

/**
 * 趨勢方向計算 (與近 30 分鐘均值比對)
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
 * 短期時間序列斜率加權預測 (3:2:1 權重衰減)
 * 推估未來 20 分鐘抵達時之人數變化，輸出動態門檻偏移量 (Offset in [-8, 8])
 */
export function calculatePredictiveOffset(todayPoints: PoolHistoryPoint[]): number {
  const len = todayPoints.length;
  if (len < 4) return 0;

  const p0 = todayPoints[len - 1].value; // T
  const p5 = todayPoints[len - 2].value; // T - 5m
  const p10 = todayPoints[len - 3].value; // T - 10m
  const p15 = todayPoints[len - 4].value; // T - 15m

  const diff1 = p0 - p5;   // 最近 5 分鐘變化 (權重 3)
  const diff2 = p5 - p10;  // 5~10 分鐘前變化 (權重 2)
  const diff3 = p10 - p15; // 10~15 分鐘前變化 (權重 1)

  const weightedDelta5m = (diff1 * 3 + diff2 * 2 + diff3 * 1) / 6;
  const predictedChange20m = weightedDelta5m * 4;

  const offset = -Math.round(predictedChange20m * 0.5);
  return Math.max(-8, Math.min(8, offset));
}

/**
 * 計算結合動態偏移後的 7 水道門檻狀態
 */
export function evaluateThresholdStatus(
  netCount: number,
  offset: number
): ThresholdResult {
  const amberThreshold = CAPACITY_LIMITS.COMFORTABLE + offset;
  const redThreshold = CAPACITY_LIMITS.CROWDED + offset;

  let status: 'comfortable' | 'moderate' | 'crowded' = 'comfortable';
  if (netCount >= redThreshold) {
    status = 'crowded';
  } else if (netCount >= amberThreshold) {
    status = 'moderate';
  }

  return {
    comfortLimit: CAPACITY_LIMITS.COMFORTABLE,
    crowdedLimit: CAPACITY_LIMITS.CROWDED,
    amberThreshold,
    redThreshold,
    status,
  };
}

/**
 * 產出擬真 14 天展示數據 (DEMO Mode)
 */
export function generateMockHistory(
  tpeNow: Date,
  randomHour: number,
  randomMin: number
): PoolHistoryPoint[] {
  const fakeHistory: PoolHistoryPoint[] = [];
  const midnight = new Date(tpeNow.getFullYear(), tpeNow.getMonth(), tpeNow.getDate());

  for (let i = 14; i >= 0; i--) {
    const d = new Date(midnight.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;
    const currentPointDayOfWeek = d.getDay();
    const currentPointDayStr = DAY_LABELS[currentPointDayOfWeek];

    const pOpenMin = currentPointDayOfWeek === 0 || currentPointDayOfWeek === 6 ? 540 : 480;
    const pCloseMin = currentPointDayOfWeek === 0 ? 1050 : 1290;

    for (let tVal = pOpenMin; tVal < pCloseMin; tVal += 5) {
      const h = Math.floor(tVal / 60);
      const m = tVal % 60;
      const tStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      if (isToday && (h > randomHour || (h === randomHour && m > randomMin))) break;

      const isFocusTime = tStr >= '16:30' && tStr <= '19:30';
      const isChartStep = m % 20 === 0;
      if (!isToday && !isChartStep && !isFocusTime) continue;

      let mockValue = Math.floor(Math.random() * 12) + 8;
      if (h >= 16 && h <= 19) mockValue += Math.floor(Math.random() * 22) + 12;

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
