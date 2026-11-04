import { describe, expect, it } from 'vitest';
import {
  calculatePredictiveOffset,
  calculateTrend,
  CAPACITY_LIMITS,
  evaluateThresholdStatus,
  isOperatingHours,
} from '../src/utils';

describe('7-Lane Capacity & Predictive Algorithm', () => {
  describe('7-Lane Capacity Limits', () => {
    it('should have 33 as comfortable limit and 42 as crowded limit', () => {
      // 3*5 + 4*2 + 5*2 = 15 + 8 + 10 = 33
      expect(CAPACITY_LIMITS.COMFORTABLE).toBe(33);
      // 4*5 + 5*2 + 6*2 = 20 + 10 + 12 = 42
      expect(CAPACITY_LIMITS.CROWDED).toBe(42);
    });

    it('should evaluate status as comfortable when under 33 with no offset', () => {
      const res = evaluateThresholdStatus(25, 0);
      expect(res.status).toBe('comfortable');
      expect(res.amberThreshold).toBe(33);
      expect(res.redThreshold).toBe(42);
    });

    it('should evaluate status as moderate when between 33 and 41 with no offset', () => {
      const res = evaluateThresholdStatus(38, 0);
      expect(res.status).toBe('moderate');
    });

    it('should evaluate status as crowded when >= 42 with no offset', () => {
      const res = evaluateThresholdStatus(42, 0);
      expect(res.status).toBe('crowded');
    });
  });

  describe('isOperatingHours', () => {
    it('should open on Wednesday at 14:00 (Asia/Taipei)', () => {
      const d = new Date('2026-11-04T14:00:00+08:00');
      expect(isOperatingHours(d)).toBe(true);
    });

    it('should close at night on Wednesday at 22:30 (Asia/Taipei)', () => {
      const d = new Date('2026-11-04T22:30:00+08:00');
      expect(isOperatingHours(d)).toBe(false);
    });
  });

  describe('calculateTrend', () => {
    it('should detect upward surge', () => {
      const points = [
        { date: '2026-11-04', day: '週三', time: '17:00', value: 20 },
        { date: '2026-11-04', day: '週三', time: '17:05', value: 24 },
        { date: '2026-11-04', day: '週三', time: '17:10', value: 28 },
        { date: '2026-11-04', day: '週三', time: '17:15', value: 38 },
      ];
      expect(calculateTrend(points)).toBe('↑');
    });
  });

  describe('calculatePredictiveOffset', () => {
    it('should produce negative offset during rapid surge to tighten threshold', () => {
      const surgePoints = [
        { date: '2026-11-04', day: '週三', time: '17:00', value: 20 },
        { date: '2026-11-04', day: '週三', time: '17:05', value: 25 },
        { date: '2026-11-04', day: '週三', time: '17:10', value: 31 },
        { date: '2026-11-04', day: '週三', time: '17:15', value: 39 },
      ];
      const offset = calculatePredictiveOffset(surgePoints);
      expect(offset).toBeLessThan(0);
      expect(offset).toBeGreaterThanOrEqual(-8);
    });
  });
});
