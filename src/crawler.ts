export const NTU_RENTAL_URL = 'https://rent.pe.ntu.edu.tw/';
export const POOL_REGEX = /室內游泳池[\s\S]*?<span>(\d+)<\/span>[\s\S]*?現在人數/;

/**
 * 從 HTML 中透過非貪婪正規表達式提取現場人數
 */
export function extractHeadCount(html: string, regex: RegExp = POOL_REGEX): number | null {
  const match = html.match(regex);
  if (!match || !match[1]) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}
