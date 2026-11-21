// Ember Valley — boot + deterministic staging for screenshots/playtests.
import { EmberGame } from './game.js';

const game = new EmberGame(document);

// Debug/staging API used by tools/capture.mjs and tools/playtest.mjs.
// Same code path as real play; only sets state, never edits art.
window.EV = {
  game,
  state() {
    return {
      screen: game.screen,
      scene: game.sceneIndex + 1,
      sceneName: game.scene().name,
      found: game.found.size,
      foundIds: [...game.found],
      strikes: game.strikes,
      hintsLeft: game.hintsLeft,
      hintsUsed: game.hintsUsed,
      elapsed: Math.round(game.elapsed),
      totalScore: game.totalScore,
      stars: game.sceneStars,
    };
  },
  // click a difference by index (0..6) on the given panel
  clickDiff(i, panel = 'left') {
    const d = game.scene().differences[i];
    if (!d) return false;
    game.clickAt(panel, d.x, d.y);
    return true;
  },
  // click at scene coords on a panel
  clickAt(panel, x, y) { game.clickAt(panel, x, y); return true; },
  hint() { game.useHint(); return game.hintsLeft; },
  start(i) { game.startScene(i); return true; },
};

// Staging from the URL (?stage=title|play|complete|fail, ?scene=1..3,
// ?found=0,2,4 (indices), ?strikes=n, ?elapsed=sec). Legacy ?shot= also works.
const q = new URLSearchParams(location.search);
const stageParam = q.get('stage') || q.get('shot');
if (stageParam) {
  const map = { start: 'title', title: 'title', play: 'play', end: 'complete', complete: 'complete', fail: 'fail' };
  const stage = map[stageParam] || 'title';
  const found = q.get('found') ? q.get('found').split(',').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n)) : undefined;
  game.stage({
    stage,
    scene: parseInt(q.get('scene') || '1', 10),
    found,
    strikes: q.get('strikes') ? parseInt(q.get('strikes'), 10) : undefined,
    hintsLeft: q.get('hints') ? parseInt(q.get('hints'), 10) : undefined,
    hintsUsed: q.get('hintsUsed') ? parseInt(q.get('hintsUsed'), 10) : undefined,
    elapsed: q.get('elapsed') ? parseInt(q.get('elapsed'), 10) : undefined,
  });
}
