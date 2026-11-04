import { describe, expect, it } from 'vitest';
import { extractHeadCount, POOL_REGEX } from '../src/crawler';

describe('Crawler Parser', () => {
  const sampleHtml = `
    <div class="card">
      <h3>室內游泳池</h3>
      <span>38</span>
      <div>現在人數</div>
    </div>
  `;

  it('should correctly parse swimming pool count from HTML', () => {
    const count = extractHeadCount(sampleHtml, POOL_REGEX);
    expect(count).toBe(38);
  });

  it('should return null when element does not match', () => {
    expect(extractHeadCount('<div>無資料</div>', POOL_REGEX)).toBeNull();
  });
});
