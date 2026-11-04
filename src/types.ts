export interface PoolHistoryPoint {
  date: string;
  day: string;
  time: string;
  value: number;
}

export interface CrawlerResult {
  poolCount?: number;
  skipped?: boolean;
  reason?: string;
}

export interface ThresholdResult {
  comfortLimit: number; // 33 人
  crowdedLimit: number; // 42 人
  amberThreshold: number;
  redThreshold: number;
  status: 'comfortable' | 'moderate' | 'crowded';
}
