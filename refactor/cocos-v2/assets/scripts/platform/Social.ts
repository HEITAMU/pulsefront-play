import { dayKey, RULESET } from '../core/Combat';
import { host } from './Progress';
export function leaderboardKey(day = dayKey()) { return 'pf-' + RULESET + '-' + day; }
export interface Challenge { day: string; score: number; }
export function parseChallenge(q: any): Challenge | null {
  if (!q || q.rules !== RULESET || q.mode !== 'daily' || q.day !== dayKey()) return null;
  const score = Number(q.score); if (!Number.isSafeInteger(score) || score < 0 || score > 99999999) return null;
  return { day: q.day, score };
}
export function incoming(): Challenge | null { const wx = host(); try { if (wx && wx.getLaunchOptionsSync) return parseChallenge(wx.getLaunchOptionsSync().query); const p = new URLSearchParams((globalThis as any).location.search); return parseChallenge({ mode: p.get('mode'), rules: p.get('rules'), day: p.get('day'), score: p.get('score') }); } catch { return null; } }
export function publishDaily(score: number, day = dayKey()) {
  const wx = host(); if (!wx || !wx.setUserCloudStorage) return;
  wx.setUserCloudStorage({ KVDataList: [{ key: leaderboardKey(day), value: JSON.stringify({ wxgame: { score, update_time: Math.floor(Date.now() / 1000) } }) }], fail: () => {} });
}
export async function shareChallenge(score: number, day = dayKey()): Promise<string> {
  const query = 'mode=daily&rules=' + RULESET + '&day=' + day + '&score=' + Math.max(0, Math.floor(score));
  const title = '今天这条防线，我打了 ' + Math.floor(score).toLocaleString() + ' 分。你呢？'; const wx = host();
  if (wx && wx.shareAppMessage) { wx.shareAppMessage({ title, query }); return 'opened'; }
  const scope = globalThis as any; const url = new URL(scope.location.href); url.search = query;
  try { if (scope.navigator.share) { await scope.navigator.share({ title, text: '同一敌潮、相同火力，90秒见分晓。', url: url.href }); return 'opened'; } if (scope.navigator.clipboard) { await scope.navigator.clipboard.writeText(url.href); return 'copied'; } } catch (e: any) { if (e && e.name === 'AbortError') return 'cancelled'; }
  return url.href;
}
