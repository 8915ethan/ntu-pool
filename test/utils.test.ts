import { describe, expect, it } from 'vitest';
import {
  calculateNetTypicalHistory,
  calculatePredictiveOffset,
  calculateTrend,
  DAY_LABELS,
  generateMockHistory,
  getActiveWindowHistory,
  getTaipeiDate,
  getTaipeiTimeParts,
  isCrawlerActiveHours,
  isOperatingHours,
  isPointInOperatingHours,
} from '../src/utils';

describe('Utils', () => {
  describe('isOperatingHours', () => {
    it('should be open on Wednesday at 14:00 (weekday)', () => {
      // 2026-11-04 is Wednesday, 14:00
      const d = new Date('2026-11-04T14:00:00+08:00');
      expect(isOperatingHours(d)).toBe(true);
    });

    it('should be closed to public on Wednesday at 07:45 (before 08:00 opening)', () => {
      const d = new Date('2026-11-04T07:45:00+08:00');
      expect(isOperatingHours(d)).toBe(false);
      expect(isCrawlerActiveHours(d)).toBe(true);
    });

    it('should be open on Wednesday at 08:00 (official opening)', () => {
      const d = new Date('2026-11-04T08:00:00+08:00');
      expect(isOperatingHours(d)).toBe(true);
    });

    it('should be closed on Wednesday at 04:00 (weekday before open)', () => {
      const d = new Date('2026-11-04T04:00:00+08:00');
      expect(isOperatingHours(d)).toBe(false);
    });

    it('should be closed on Wednesday at 22:30 (weekday after close)', () => {
      const d = new Date('2026-11-04T22:30:00+08:00');
      expect(isOperatingHours(d)).toBe(false);
    });

    it('should be closed at midnight 00:05 (weekday after midnight)', () => {
      const d = new Date('2026-11-05T00:05:00+08:00');
      expect(isOperatingHours(d)).toBe(false);
    });

    it('should be idempotent and closed when passing already converted getTaipeiDate', () => {
      const d = new Date('2026-11-05T00:05:00+08:00');
      const tpeDate = getTaipeiDate(d);
      expect(isOperatingHours(tpeDate)).toBe(false);
    });

    it('should be open on Saturday at 10:00', () => {
      // 2026-11-07 is Saturday
      const d = new Date('2026-11-07T10:00:00+08:00');
      expect(isOperatingHours(d)).toBe(true);
    });

    it('should be closed to public on Saturday at 08:45 (before 09:00)', () => {
      const d = new Date('2026-11-07T08:45:00+08:00');
      expect(isOperatingHours(d)).toBe(false);
      expect(isCrawlerActiveHours(d)).toBe(true);
    });

    it('should be closed on Sunday at 18:00 (Sunday closes at 17:30)', () => {
      // 2026-11-08 is Sunday
      const d = new Date('2026-11-08T18:00:00+08:00');
      expect(isOperatingHours(d)).toBe(false);
    });

    it('should be open on Sunday at 15:00', () => {
      const d = new Date('2026-11-08T15:00:00+08:00');
      expect(isOperatingHours(d)).toBe(true);
    });
  });

  describe('isPointInOperatingHours', () => {
    it('should filter out late night / sleep hours on weekdays', () => {
      expect(isPointInOperatingHours({ day: '週三', time: '23:30' })).toBe(false);
      expect(isPointInOperatingHours({ day: '週四', time: '00:00' })).toBe(false);
      expect(isPointInOperatingHours({ day: '週四', time: '07:25' })).toBe(false);
      expect(isPointInOperatingHours({ day: '週四', time: '07:35' })).toBe(true);
      expect(isPointInOperatingHours({ day: '週四', time: '21:30' })).toBe(true);
      expect(isPointInOperatingHours({ day: '週四', time: '21:35' })).toBe(false);
    });

    it('should handle weekends correctly', () => {
      expect(isPointInOperatingHours({ day: '週六', time: '08:25' })).toBe(false);
      expect(isPointInOperatingHours({ day: '週六', time: '08:35' })).toBe(true);
      expect(isPointInOperatingHours({ day: '週日', time: '17:30' })).toBe(true);
      expect(isPointInOperatingHours({ day: '週日', time: '17:35' })).toBe(false);
    });
  });

  describe('calculateTrend', () => {
    it('should return stable "➔" for 0 or 1 point', () => {
      expect(calculateTrend([])).toBe('➔');
      expect(calculateTrend([{ date: '2026-11-04', day: '週三', time: '10:00', value: 20 }])).toBe('➔');
    });

    it('should return "↑" when current value is significantly higher than recent average', () => {
      const points = [
        { date: '2026-11-04', day: '週三', time: '10:00', value: 20 },
        { date: '2026-11-04', day: '週三', time: '10:05', value: 20 },
        { date: '2026-11-04', day: '週三', time: '10:10', value: 21 },
        { date: '2026-11-04', day: '週三', time: '10:15', value: 35 },
      ];
      expect(calculateTrend(points)).toBe('↑');
    });

    it('should return "↓" when current value is significantly lower than recent average', () => {
      const points = [
        { date: '2026-11-04', day: '週三', time: '10:00', value: 40 },
        { date: '2026-11-04', day: '週三', time: '10:05', value: 40 },
        { date: '2026-11-04', day: '週三', time: '10:10', value: 38 },
        { date: '2026-11-04', day: '週三', time: '10:15', value: 25 },
      ];
      expect(calculateTrend(points)).toBe('↓');
    });

    it('should return "➔" when current value is close to recent average', () => {
      const points = [
        { date: '2026-11-04', day: '週三', time: '10:00', value: 30 },
        { date: '2026-11-04', day: '週三', time: '10:05', value: 30 },
        { date: '2026-11-04', day: '週三', time: '10:10', value: 31 },
        { date: '2026-11-04', day: '週三', time: '10:15', value: 30 },
      ];
      expect(calculateTrend(points)).toBe('➔');
    });
  });

  describe('calculatePredictiveOffset', () => {
    it('should return 0 when points are fewer than 4', () => {
      const points = [
        { date: '2026-11-04', day: '週三', time: '10:00', value: 20 },
        { date: '2026-11-04', day: '週三', time: '10:05', value: 25 },
      ];
      expect(calculatePredictiveOffset(points)).toBe(0);
    });

    it('should calculate clamped offset within -8 to 8', () => {
      const risingFast = [
        { date: '2026-11-04', day: '週三', time: '10:00', value: 10 },
        { date: '2026-11-04', day: '週三', time: '10:05', value: 20 },
        { date: '2026-11-04', day: '週三', time: '10:10', value: 30 },
        { date: '2026-11-04', day: '週三', time: '10:15', value: 50 },
      ];
      const offset = calculatePredictiveOffset(risingFast);
      expect(offset).toBeLessThanOrEqual(8);
      expect(offset).toBeGreaterThanOrEqual(-8);
    });

    it('should normalize rate accurately with actual time interval (dt)', () => {
      // 10:00 -> 10:15 (15 min gap, +6 people => 0.4 people/min)
      const irregularPoints = [
        { date: '2026-11-04', day: '週三', time: '09:50', value: 20 },
        { date: '2026-11-04', day: '週三', time: '09:55', value: 20 },
        { date: '2026-11-04', day: '週三', time: '10:00', value: 20 },
        { date: '2026-11-04', day: '週三', time: '10:15', value: 26 },
      ];
      // rate = (6/15)*3/6 = 0.2 people/min; change15m = 0.2 * 15 = 3; offset = -round(3 * 0.7) = -2
      const offset = calculatePredictiveOffset(irregularPoints);
      expect(offset).toBe(-2);
    });

    it('should discard intervals > 25 mins and apply conservative clamp (+-4) on recovery', () => {
      // 09:00 -> 10:00 (斷線 60 分鐘，無效) -> 10:05 (+10 人，激增)
      const recoveryPoints = [
        { date: '2026-11-04', day: '週三', time: '08:55', value: 10 },
        { date: '2026-11-04', day: '週三', time: '09:00', value: 10 },
        { date: '2026-11-04', day: '週三', time: '10:00', value: 10 }, // 斷線 60m，不採納
        { date: '2026-11-04', day: '週三', time: '10:05', value: 25 }, // 5m 暴增 15 人
      ];
      const offset = calculatePredictiveOffset(recoveryPoints);
      // 只有 1 個有效區間 (10:00->10:05)，觸發保守模式 clampLimit = 4
      expect(offset).toBe(-4);
    });

    it('should blend 75% short-term WMA with 25% typical history 15m slope when typicalHistory is provided', () => {
      // Short-term WMA: 17:00->17:05 (+2), 17:05->17:10 (+2), 17:10->17:15 (+2) => wmaChange15m = +6
      const todayPoints = [
        { date: '2026-11-04', day: '週三', time: '17:00', value: 28 },
        { date: '2026-11-04', day: '週三', time: '17:05', value: 30 },
        { date: '2026-11-04', day: '週三', time: '17:10', value: 32 },
        { date: '2026-11-04', day: '週三', time: '17:15', value: 34 },
      ];
      // Typical history at 17:15 -> 17:30 jumps from 26 to 40 (typicalChange15m = +14)
      const typicalHistory = [
        { time: '17:15', avg: 26, netAvg: 26 },
        { time: '17:30', avg: 40, netAvg: 40 },
      ];
      // Hybrid = 0.75 * 6 + 0.25 * 14 = 4.5 + 3.5 = +8.0; offset = -round(8.0 * 0.7) = -6
      // (Without typicalHistory: -round(6 * 0.7) = -4)
      expect(calculatePredictiveOffset(todayPoints)).toBe(-4);
      expect(calculatePredictiveOffset(todayPoints, typicalHistory)).toBe(-6);
    });
  });

  describe('getActiveWindowHistory', () => {
    it('should return empty array for empty history', () => {
      expect(getActiveWindowHistory([])).toEqual([]);
    });

    it('should slice history to the last N days', () => {
      const history = [
        { date: '2026-10-01', day: '週四', time: '10:00', value: 10 },
        { date: '2026-10-02', day: '週五', time: '10:00', value: 12 },
        { date: '2026-10-03', day: '週六', time: '10:00', value: 15 },
      ];
      const sliced = getActiveWindowHistory(history, 2);
      expect(sliced.length).toBe(2);
      expect(sliced.map((p) => p.date)).toEqual(['2026-10-02', '2026-10-03']);
    });
  });

  describe('generateMockHistory', () => {
    it('should generate history records across days', () => {
      const tpeNow = new Date('2026-11-04T18:00:00+08:00');
      const history = generateMockHistory(tpeNow, 18, 0, 'all');
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('date');
      expect(history[0]).toHaveProperty('day');
      expect(history[0]).toHaveProperty('time');
      expect(history[0]).toHaveProperty('value');
    });
  });

  describe('calculateTypicalHistory', () => {
    it('should accurately average matching day-of-week raw headcount across 4 weeks (28 days)', () => {
      // Four past Wednesdays across 28 days:
      // Week 1 (2026-10-07): 12:00 has 26 people
      // Week 2 (2026-10-14): 12:00 has 28 people
      // Week 3 (2026-10-21): 12:00 has 30 people
      // Week 4 (2026-10-28): 12:00 has 32 people
      // Average at 12:00 should be (26 + 28 + 30 + 32) / 4 = 29
      const history = [
        { date: '2026-10-07', day: '週三', time: '08:00', value: 8 },
        { date: '2026-10-07', day: '週三', time: '12:00', value: 26 },
        { date: '2026-10-14', day: '週三', time: '08:00', value: 8 },
        { date: '2026-10-14', day: '週三', time: '12:00', value: 28 },
        { date: '2026-10-21', day: '週三', time: '08:00', value: 8 },
        { date: '2026-10-21', day: '週三', time: '12:00', value: 30 },
        { date: '2026-10-28', day: '週三', time: '08:00', value: 6 },
        { date: '2026-10-28', day: '週三', time: '12:00', value: 32 },
        // Today (2026-11-04) should be excluded from typical
        { date: '2026-11-04', day: '週三', time: '08:00', value: 10 },
        { date: '2026-11-04', day: '週三', time: '12:00', value: 40 },
      ];

      const typical = calculateNetTypicalHistory(history, 3, '2026-11-04', 28);
      const pt1200 = typical.find((p) => p.time === '12:00');
      expect(pt1200).toBeDefined();
      expect(pt1200?.avg).toBe(29);
      expect(pt1200?.netAvg).toBe(29);
    });

    it('should ignore all-zero days and interpolate sparse sampling points without dropping to zero', () => {
      const history = [
        // All-zero day (e.g. system setup / pool closed)
        { date: '2026-10-25', day: '週日', time: '09:00', value: 0 },
        { date: '2026-10-25', day: '週日', time: '14:00', value: 0 },
        { date: '2026-10-25', day: '週日', time: '15:00', value: 0 },
        // Valid past Sunday with sparse points (13:55, 14:05)
        { date: '2026-11-01', day: '週日', time: '09:00', value: 1 },
        { date: '2026-11-01', day: '週日', time: '13:55', value: 18 },
        { date: '2026-11-01', day: '週日', time: '14:05', value: 20 },
        // Today (2026-11-08)
        { date: '2026-11-08', day: '週日', time: '09:00', value: 0 },
        { date: '2026-11-08', day: '週日', time: '14:00', value: 12 },
      ];

      const typical = calculateNetTypicalHistory(history, 0, '2026-11-08', 14);
      // 14:00 should be linearly interpolated between 13:55 (18) and 14:05 (20) -> 19
      const pt1400 = typical.find((p) => p.time === '14:00');
      expect(pt1400).toBeDefined();
      expect(pt1400?.netAvg).toBe(19);
    });

    it('should strictly bound typical curve to public opening hours for each day of week', () => {
      // Sunday (0): 09:00 to 17:30
      const sunHistory = [
        { date: '2026-11-01', day: '週日', time: '08:30', value: 1 },
        { date: '2026-11-01', day: '週日', time: '12:00', value: 20 },
      ];
      const sunTypical = calculateNetTypicalHistory(sunHistory, 0, '2026-11-08', 14);
      expect(sunTypical[0].time).toBe('09:00');
      expect(sunTypical[sunTypical.length - 1].time).toBe('17:30');

      // Saturday (6): 09:00 to 21:30
      const satHistory = [
        { date: '2026-10-31', day: '週六', time: '08:30', value: 2 },
        { date: '2026-10-31', day: '週六', time: '12:00', value: 25 },
      ];
      const satTypical = calculateNetTypicalHistory(satHistory, 6, '2026-11-07', 14);
      expect(satTypical[0].time).toBe('09:00');
      expect(satTypical[satTypical.length - 1].time).toBe('21:30');

      // Weekday Wednesday (3): 08:00 to 21:30
      const wedHistory = [
        { date: '2026-10-28', day: '週三', time: '07:30', value: 3 },
        { date: '2026-10-28', day: '週三', time: '12:00', value: 30 },
      ];
      const wedTypical = calculateNetTypicalHistory(wedHistory, 3, '2026-11-04', 14);
      expect(wedTypical[0].time).toBe('08:00');
      expect(wedTypical[wedTypical.length - 1].time).toBe('21:30');
    });
  });
});
