import * as fs from 'fs';
import * as path from 'path';
import { CrawlerResult, PoolHistoryPoint } from './types';
import { DAY_LABELS, getTaipeiDate, isOperatingHours } from './utils';

export const NTU_RENTAL_URL = 'https://rent.pe.ntu.edu.tw/';
export const POOL_REGEX = /室內游泳池[\s\S]*?<span>(\d+)<\/span>[\s\S]*?現在人數/;

/**
 * 從 HTML 中透過正規表達式提取現場人數
 */
export function extractHeadCount(html: string, regex: RegExp = POOL_REGEX): number | null {
  const match = html.match(regex);
  if (!match || !match[1]) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * 執行示範爬蟲並將時序資料寫入 data/history.json
 */
export async function runCrawlerDemo(
  outputPath: string = path.resolve(__dirname, '../data/history.json'),
  fetchFn: typeof fetch = fetch
): Promise<CrawlerResult> {
  const tpeDate = getTaipeiDate();
  const dayStr = DAY_LABELS[tpeDate.getDay()];
  const dateStr = tpeDate.toISOString().split('T')[0];
  const hour = tpeDate.getHours();
  const min = tpeDate.getMinutes();

  if (!isOperatingHours(tpeDate)) {
    console.log('[Crawler] 非營業時段，略過爬取。');
    return { skipped: true, reason: 'Outside operating hours' };
  }

  const res = await fetchFn(NTU_RENTAL_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }

  const html = await res.text();
  const count = extractHeadCount(html);
  if (count === null) {
    return { skipped: true, reason: 'Failed to extract count from HTML' };
  }

  const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

  let history: PoolHistoryPoint[] = [];
  if (fs.existsSync(outputPath)) {
    try {
      history = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    } catch {
      history = [];
    }
  }

  const last = history[history.length - 1];
  if (!last || last.date !== dateStr || last.time !== timeStr) {
    history.push({ date: dateStr, day: dayStr, time: timeStr, value: count });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`[Crawler] 成功更新: ${dateStr} ${timeStr} ➔ ${count} 人`);
  }

  return { poolCount: count };
}

// 可直接以 CLI 執行
if (require.main === module) {
  runCrawlerDemo().catch(console.error);
}
