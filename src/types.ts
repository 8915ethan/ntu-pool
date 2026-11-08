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
