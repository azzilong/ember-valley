// Ember Valley — scene art + differences.
// Every scene is drawn procedurally on canvas (flat vector, big bold shapes).
// Panel coordinate space: 1000 x 600. draw(ctx, right) draws the LEFT (original)
// panel when right=false and the RIGHT (changed) panel when right=true.
// differences: {id, type, x, y, r} — hit circle in panel coords.

export const PANEL_W = 1000;
export const PANEL_H = 600;

// ---------- tiny drawing helpers ----------
function circle(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}
function rrect(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function poly(ctx, pts, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}
function line(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function skyGrad(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, 460);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PANEL_W, 460);
}
function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 46 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 34 * s, y + 4 * s, 34 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 34 * s, y + 5 * s, 30 * s, 13 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}
function pine(ctx, x, y, s, trunk, foliage) {
  // y = base of trunk
  rect(ctx, x - 6 * s, y - 34 * s, 12 * s, 34 * s, trunk);
  poly(ctx, [[x, y - 150 * s], [x - 52 * s, y - 30 * s], [x + 52 * s, y - 30 * s]], foliage);
  poly(ctx, [[x, y - 118 * s], [x - 42 * s, y - 18 * s], [x + 42 * s, y - 18 * s]], foliage);
  poly(ctx, [[x, y - 84 * s], [x - 30 * s, y - 6 * s], [x + 30 * s, y - 6 * s]], foliage);
}
function bird(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x - 10, y, 10, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 10, y, 10, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

// =====================================================================
// SCENE 1 — Valley at Dawn (village square)
// =====================================================================
function drawDawn(ctx, right) {
  skyGrad(ctx, '#ffd9a0', '#fff3d6');
  // DIFF 1 (color): sun yellow <-> ember orange
  circle(ctx, 820, 110, 56, right ? '#ff8c42' : '#ffd23f');
  circle(ctx, 820, 110, 72, 'rgba(255,210,63,0.25)');
  cloud(ctx, 180, 90, 1.1, 'rgba(255,255,255,0.85)');
  cloud(ctx, 560, 60, 0.8, 'rgba(255,255,255,0.7)');
  // DIFF 7 (missing): bird present left, gone right
  if (!right) bird(ctx, 220, 130, '#3a2e22');
  bird(ctx, 640, 150, '#3a2e22');
  // mountains
  poly(ctx, [[0, 430], [120, 300], [260, 430]], '#2c6b4f');
  poly(ctx, [[180, 430], [360, 270], [560, 430]], '#1d4a38');
  poly(ctx, [[480, 430], [700, 290], [920, 430]], '#2c6b4f');
  poly(ctx, [[760, 430], [900, 320], [1000, 430]], '#1d4a38');
  // snow caps
  poly(ctx, [[330, 298], [360, 270], [390, 298], [375, 292], [360, 306], [345, 292]], '#fff8e7');
  // mist
  ellipse(ctx, 300, 430, 180, 16, 'rgba(255,255,255,0.45)');
  ellipse(ctx, 720, 438, 200, 14, 'rgba(255,255,255,0.4)');
  // ground: village square
  rect(ctx, 0, 430, PANEL_W, 170, '#d9b380');
  rect(ctx, 0, 430, PANEL_W, 10, '#c79a63');
  // path to the well
  poly(ctx, [[460, 600], [540, 600], [520, 440], [480, 440]], '#eec98f');
  // house left — DIFF 2 (color): roof brown <-> teal
  rect(ctx, 90, 380, 150, 80, '#f7e8c9');
  poly(ctx, [[80, 384], [165, 320], [250, 384]], right ? '#2a9d8f' : '#8a5a33');
  rect(ctx, 150, 420, 30, 40, '#6b4423');
  rect(ctx, 105, 400, 26, 26, '#ffd23f');
  rect(ctx, 200, 400, 26, 26, '#ffd23f');
  // house right (rust roof, chimney + smoke)
  rect(ctx, 780, 372, 160, 88, '#f2d7a7');
  poly(ctx, [[770, 376], [860, 308], [950, 376]], '#b5542c');
  rect(ctx, 905, 330, 16, 34, '#7a4a2b');
  ellipse(ctx, 913, 308, 14, 10, 'rgba(255,255,255,0.75)');
  ellipse(ctx, 918, 288, 18, 12, 'rgba(255,255,255,0.6)');
  rect(ctx, 800, 396, 28, 28, '#ffd23f');
  rect(ctx, 880, 396, 28, 28, '#ffd23f');
  rect(ctx, 840, 420, 32, 40, '#6b4423');
  // pine trees
  pine(ctx, 60, 470, 0.9, '#6b4423', '#1e5c46');
  pine(ctx, 300, 460, 0.7, '#6b4423', '#2c6b4f');
  pine(ctx, 950, 470, 0.85, '#6b4423', '#1e5c46');
  // lantern posts
  line(ctx, 320, 430, 320, 500, 6, '#4a3220');
  line(ctx, 320, 430, 352, 430, 5, '#4a3220');
  circle(ctx, 350, 446, 13, '#ffb703');
  circle(ctx, 350, 446, 20, 'rgba(255,183,3,0.3)');
  line(ctx, 690, 430, 690, 500, 6, '#4a3220');
  line(ctx, 690, 430, 658, 430, 5, '#4a3220');
  circle(ctx, 660, 446, 13, '#ffb703');
  circle(ctx, 660, 446, 20, 'rgba(255,183,3,0.3)');
  // DIFF 3 (added): third lantern on the right post, only in right panel
  if (right) {
    line(ctx, 690, 430, 724, 430, 5, '#4a3220');
    circle(ctx, 722, 446, 13, '#ffb703');
    circle(ctx, 722, 446, 20, 'rgba(255,183,3,0.3)');
  }
  // well (center)
  ellipse(ctx, 500, 540, 58, 14, '#9a8a76');
  rect(ctx, 452, 470, 96, 62, '#b8a88f');
  rect(ctx, 452, 470, 96, 10, '#8f7d63');
  poly(ctx, [[440, 474], [500, 420], [560, 474]], '#8a5a33');
  line(ctx, 468, 474, 468, 500, 4, '#6b4423');
  line(ctx, 532, 474, 532, 500, 4, '#6b4423');
  rrect(ctx, 486, 500, 28, 20, 4, '#6b4423');
  // cart — DIFF 4 (moved): x 380 left, 460 right
  const cartX = right ? 460 : 380;
  rect(ctx, cartX - 42, 520, 84, 16, '#8a5a33');
  poly(ctx, [[cartX - 40, 520], [cartX - 28, 492], [cartX + 30, 492], [cartX + 40, 520]], '#e9c46a');
  circle(ctx, cartX - 28, 542, 13, '#4a3220');
  circle(ctx, cartX + 28, 542, 13, '#4a3220');
  line(ctx, cartX + 42, 528, cartX + 66, 540, 5, '#6b4423');
  // chicken
  ellipse(ctx, 620, 548, 20, 14, '#fff8e7');
  circle(ctx, 636, 532, 11, '#fff8e7');
  poly(ctx, [[644, 528], [652, 532], [644, 536]], '#e76f51');
  circle(ctx, 640, 530, 2, '#222');
  line(ctx, 614, 560, 614, 568, 3, '#e76f51');
  // signpost — DIFF 6 (text): BAKERY <-> BREWERY
  line(ctx, 250, 470, 250, 540, 6, '#4a3220');
  rrect(ctx, 206, 452, 92, 30, 6, '#f7e8c9');
  ctx.fillStyle = '#4a3220';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(right ? 'BREWERY' : 'BAKERY', 252, 468);
  // flowers — DIFF 5 (count): 3 left, 5 right
  const flowers = right
    ? [[60, 566], [86, 574], [112, 566], [138, 574], [164, 566]]
    : [[60, 566], [92, 574], [124, 566]];
  for (const [fx, fy] of flowers) {
    line(ctx, fx, fy, fx, fy - 12, 3, '#2c6b4f');
    circle(ctx, fx, fy - 16, 7, '#e76f51');
    circle(ctx, fx, fy - 16, 3, '#ffd23f');
  }
  // haystack
  poly(ctx, [[880, 560], [920, 500], [960, 560]], '#e9c46a');
  line(ctx, 900, 520, 940, 520, 3, '#c79a3a');
  line(ctx, 892, 540, 948, 540, 3, '#c79a3a');
}

// =====================================================================
// SCENE 2 — Autumn Camp (forest camp)
// =====================================================================
function drawCamp(ctx, right) {
  skyGrad(ctx, '#f4a261', '#ffe8b3');
  circle(ctx, 140, 100, 48, '#ffd23f');
  circle(ctx, 140, 100, 62, 'rgba(255,210,63,0.3)');
  cloud(ctx, 420, 80, 1.0, 'rgba(255,255,255,0.8)');
  cloud(ctx, 780, 120, 0.9, 'rgba(255,255,255,0.65)');
  bird(ctx, 520, 110, '#3a2e22');
  bird(ctx, 580, 140, '#3a2e22');
  // forest background
  poly(ctx, [[0, 430], [100, 300], [220, 430]], '#1e4d3b');
  poly(ctx, [[140, 430], [300, 260], [470, 430]], '#2c6b4f');
  poly(ctx, [[400, 430], [560, 290], [730, 430]], '#1e4d3b');
  poly(ctx, [[660, 430], [830, 270], [1000, 430]], '#2c6b4f');
  // autumn trees (orange/red/gold canopies)
  circle(ctx, 90, 330, 52, '#e76f51');
  circle(ctx, 130, 300, 40, '#f4a261');
  rect(ctx, 104, 360, 14, 70, '#6b4423');
  circle(ctx, 920, 320, 56, '#d62828');
  circle(ctx, 870, 350, 38, '#f4a261');
  rect(ctx, 906, 360, 14, 70, '#6b4423');
  // ground: leaf litter
  rect(ctx, 0, 430, PANEL_W, 170, '#8a5a33');
  rect(ctx, 0, 430, PANEL_W, 10, '#6f4525');
  ellipse(ctx, 200, 520, 90, 12, '#d97b29');
  ellipse(ctx, 800, 560, 110, 12, '#c96a1e');
  // fallen leaves (static)
  const leaves = [[240, 500, '#e76f51'], [300, 560, '#f4a261'], [560, 540, '#d62828'], [760, 500, '#e9c46a'], [880, 580, '#e76f51'], [120, 570, '#f4a261']];
  for (const [lx, ly, lc] of leaves) ellipse(ctx, lx, ly, 10, 5, lc);
  // tent — DIFF 1 (color): orange <-> red
  poly(ctx, [[150, 540], [230, 400], [310, 540]], right ? '#d62828' : '#e76f51');
  poly(ctx, [[210, 540], [230, 400], [250, 540]], '#3a2e22');
  line(ctx, 230, 400, 230, 380, 4, '#6b4423');
  poly(ctx, [[226, 380], [234, 380], [230, 368]], '#ffd23f');
  // fishing rod leaning on tent
  line(ctx, 300, 540, 360, 420, 4, '#4a3220');
  line(ctx, 360, 420, 372, 404, 3, '#4a3220');
  // campfire (center)
  ellipse(ctx, 500, 540, 74, 16, '#7a7a7a');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    circle(ctx, 500 + Math.cos(a) * 56, 536 + Math.sin(a) * 8, 9, '#8d8d8d');
  }
  line(ctx, 470, 528, 530, 540, 8, '#6b4423');
  line(ctx, 530, 528, 470, 540, 8, '#7a4a2b');
  poly(ctx, [[486, 534], [500, 470], [514, 534]], '#ff8c42');
  poly(ctx, [[492, 534], [500, 492], [508, 534]], '#ffd23f');
  ellipse(ctx, 500, 452, 12, 8, 'rgba(255,255,255,0.5)');
  ellipse(ctx, 506, 432, 16, 10, 'rgba(255,255,255,0.4)');
  // kettle on the fire
  ellipse(ctx, 500, 522, 16, 10, '#3a3a3a');
  // firewood logs — DIFF 5 (count): 3 left, 2 right
  const logs = right ? [[600, 556], [640, 556]] : [[592, 556], [626, 556], [660, 556]];
  for (const [lx, ly] of logs) {
    rrect(ctx, lx - 22, ly - 10, 44, 20, 9, '#8a5a33');
    circle(ctx, lx + 22, ly, 9, '#c79a63');
  }
  // backpack — DIFF 2 (moved): x 680 left, 744 right
  const bpX = right ? 744 : 680;
  rrect(ctx, bpX - 26, 500, 52, 56, 12, '#2a9d8f');
  rrect(ctx, bpX - 26, 500, 52, 16, 12, '#1d7a6e');
  line(ctx, bpX - 14, 500, bpX - 14, 488, 5, '#1d7a6e');
  line(ctx, bpX + 14, 500, bpX + 14, 488, 5, '#1d7a6e');
  // squirrel — DIFF 3 (missing): present left, gone right
  if (!right) {
    ellipse(ctx, 820, 470, 22, 15, '#c96a1e');
    circle(ctx, 838, 452, 12, '#c96a1e');
    circle(ctx, 842, 449, 2, '#222');
    poly(ctx, [[800, 470], [788, 420], [806, 452]], '#b5542c');
    poly(ctx, [[800, 470], [816, 430], [812, 468]], '#b5542c');
  }
  // mushrooms — DIFF 4 (added): extra mushroom at (350, 545) only right
  const mush = right ? [[350, 545], [150, 560]] : [[150, 560]];
  for (const [mx, my] of mush) {
    rect(ctx, mx - 5, my - 12, 10, 14, '#f7e8c9');
    poly(ctx, [[mx - 16, my - 8], [mx, my - 26], [mx + 16, my - 8]], '#d62828');
    circle(ctx, mx - 6, my - 14, 3, '#fff8e7');
    circle(ctx, mx + 5, my - 18, 3, '#fff8e7');
  }
  // hanging lantern — DIFF 7 (color): glow yellow <-> green
  line(ctx, 620, 400, 620, 430, 4, '#4a3220');
  circle(ctx, 620, 444, 13, right ? '#80b918' : '#ffb703');
  circle(ctx, 620, 444, 22, right ? 'rgba(128,185,24,0.35)' : 'rgba(255,183,3,0.35)');
  // trail sign — DIFF 6 (text): TRAIL <-> LAKE
  line(ctx, 120, 470, 120, 540, 6, '#4a3220');
  rrect(ctx, 76, 452, 92, 30, 6, '#f7e8c9');
  ctx.fillStyle = '#4a3220';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(right ? 'LAKE' : 'TRAIL', 122, 468);
  // pinecones + acorns
  ellipse(ctx, 420, 570, 9, 12, '#6b4423');
  ellipse(ctx, 700, 580, 8, 10, '#6b4423');
  circle(ctx, 440, 580, 6, '#8a5a33');
}

// =====================================================================
// SCENE 3 — Snow Lantern Night (snowy village night)
// =====================================================================
function drawSnow(ctx, right) {
  skyGrad(ctx, '#0f2440', '#1d3a5f');
  // stars (static) + moon
  const stars = [[80, 70], [200, 50], [330, 90], [470, 60], [600, 80], [720, 55], [940, 140], [60, 160], [400, 130]];
  for (const [sx, sy] of stars) {
    circle(ctx, sx, sy, 3, '#fff8e7');
    circle(ctx, sx, sy, 6, 'rgba(255,248,231,0.25)');
  }
  // DIFF 4 (missing): bright star at (300, 90) gone in right
  if (!right) {
    circle(ctx, 300, 90, 6, '#fff8e7');
    circle(ctx, 300, 90, 12, 'rgba(255,248,231,0.4)');
  }
  circle(ctx, 850, 100, 44, '#fff3d6');
  circle(ctx, 834, 88, 10, '#e8d5b0');
  circle(ctx, 862, 112, 8, '#e8d5b0');
  // distant mountains (snow)
  poly(ctx, [[0, 430], [160, 310], [320, 430]], '#16283f');
  poly(ctx, [[260, 430], [460, 280], [660, 430]], '#1d3a5f');
  poly(ctx, [[600, 430], [800, 300], [1000, 430]], '#16283f');
  poly(ctx, [[430, 306], [460, 280], [490, 306], [475, 300], [460, 314], [445, 300]], '#dfe9f5');
  // ground: snow
  rect(ctx, 0, 430, PANEL_W, 170, '#dfe9f5');
  rect(ctx, 0, 430, PANEL_W, 10, '#c3d4ea');
  ellipse(ctx, 250, 540, 130, 14, '#f4f8ff');
  ellipse(ctx, 760, 570, 150, 14, '#f4f8ff');
  // footprints trail
  const prints = [[420, 560], [440, 576], [460, 560], [480, 576], [500, 560]];
  for (const [px, py] of prints) ellipse(ctx, px, py, 8, 5, '#b9cbe4');
  // frozen pond
  ellipse(ctx, 700, 500, 120, 26, '#7fb3d5');
  ellipse(ctx, 700, 500, 96, 18, '#a8cdea');
  line(ctx, 650, 500, 750, 496, 3, 'rgba(255,255,255,0.7)');
  line(ctx, 660, 508, 730, 504, 3, 'rgba(255,255,255,0.5)');
  // house left (snow roof)
  rect(ctx, 70, 380, 150, 80, '#e8dcc8');
  poly(ctx, [[60, 384], [145, 316], [230, 384]], '#f4f8ff');
  line(ctx, 60, 384, 230, 384, 4, '#b9cbe4');
  rect(ctx, 90, 400, 26, 26, '#ffb703');
  rect(ctx, 170, 400, 26, 26, '#ffb703');
  rect(ctx, 130, 420, 30, 40, '#6b4423');
  // house center — DIFF 1 (color): window light yellow <-> pink
  rect(ctx, 420, 372, 170, 88, '#e8dcc8');
  poly(ctx, [[410, 376], [505, 304], [600, 376]], '#f4f8ff');
  line(ctx, 410, 376, 600, 376, 4, '#b9cbe4');
  rect(ctx, 560, 330, 16, 34, '#7a4a2b');
  ellipse(ctx, 568, 308, 14, 10, 'rgba(255,255,255,0.7)');
  ellipse(ctx, 572, 288, 18, 12, 'rgba(255,255,255,0.55)');
  rect(ctx, 442, 396, 28, 28, right ? '#ff8fab' : '#ffb703');
  rect(ctx, 520, 396, 28, 28, '#ffb703');
  rect(ctx, 480, 420, 32, 40, '#6b4423');
  // wreath on center door
  circle(ctx, 496, 436, 10, '#1e5c46');
  circle(ctx, 496, 436, 4, '#d62828');
  // house right
  rect(ctx, 800, 380, 150, 80, '#e8dcc8');
  poly(ctx, [[790, 384], [875, 320], [960, 384]], '#f4f8ff');
  rect(ctx, 820, 400, 26, 26, '#ffb703');
  rect(ctx, 900, 400, 26, 26, '#ffb703');
  // snowy pines
  pine(ctx, 40, 470, 0.8, '#4a3220', '#1e5c46');
  poly(ctx, [[40, 330], [22, 360], [58, 360]], '#f4f8ff');
  pine(ctx, 970, 470, 0.8, '#4a3220', '#1e5c46');
  poly(ctx, [[970, 330], [952, 360], [988, 360]], '#f4f8ff');
  // lantern posts — DIFF 3 (color): left post glow orange <-> blue
  line(ctx, 300, 430, 300, 500, 6, '#2a2118');
  line(ctx, 300, 430, 332, 430, 5, '#2a2118');
  circle(ctx, 330, 446, 13, right ? '#4cc9f0' : '#ffb703');
  circle(ctx, 330, 446, 24, right ? 'rgba(76,201,240,0.4)' : 'rgba(255,183,3,0.4)');
  line(ctx, 660, 430, 660, 500, 6, '#2a2118');
  line(ctx, 660, 430, 628, 430, 5, '#2a2118');
  circle(ctx, 630, 446, 13, '#ffb703');
  circle(ctx, 630, 446, 24, 'rgba(255,183,3,0.4)');
  // DIFF 5 (added): small lantern on the fence, only right
  if (right) {
    line(ctx, 700, 470, 700, 486, 4, '#2a2118');
    circle(ctx, 700, 496, 10, '#ffb703');
    circle(ctx, 700, 496, 18, 'rgba(255,183,3,0.35)');
  }
  // snowman — DIFF 2 (count): 2 buttons left, 3 right
  circle(ctx, 350, 540, 34, '#f4f8ff');
  circle(ctx, 350, 496, 26, '#f4f8ff');
  circle(ctx, 350, 462, 20, '#f4f8ff');
  circle(ctx, 342, 456, 3, '#222');
  circle(ctx, 358, 456, 3, '#222');
  poly(ctx, [[350, 462], [372, 468], [350, 472]], '#e76f51');
  rrect(ctx, 330, 440, 40, 8, 3, '#d62828');
  rect(ctx, 342, 424, 16, 18, '#d62828');
  const buttons = right ? [[350, 490], [350, 506], [350, 522]] : [[350, 490], [350, 508]];
  for (const [bx, by] of buttons) circle(ctx, bx, by, 4, '#222');
  line(ctx, 322, 500, 300, 486, 4, '#6b4423');
  line(ctx, 378, 500, 400, 484, 4, '#6b4423');
  // sled — DIFF 6 (moved): x 650 left, 722 right
  const sledX = right ? 722 : 650;
  rrect(ctx, sledX - 34, 540, 68, 10, 5, '#b5542c');
  line(ctx, sledX - 30, 550, sledX - 30, 562, 4, '#6b4423');
  line(ctx, sledX + 30, 550, sledX + 30, 562, 4, '#6b4423');
  line(ctx, sledX - 34, 556, sledX + 34, 556, 3, '#6b4423');
  // sign — DIFF 7 (text): INN <-> SHOP
  line(ctx, 120, 470, 120, 540, 6, '#2a2118');
  rrect(ctx, 82, 452, 80, 30, 6, '#f7e8c9');
  ctx.fillStyle = '#2a2118';
  ctx.font = 'bold 17px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(right ? 'SHOP' : 'INN', 122, 468);
  // snowflakes (static)
  const flakes = [[150, 200], [260, 150], [480, 180], [560, 120], [760, 200], [900, 240], [60, 260], [380, 240]];
  for (const [fx, fy] of flakes) circle(ctx, fx, fy, 3, 'rgba(255,255,255,0.9)');
}

// =====================================================================
// Scene catalogue
// =====================================================================
export const SCENES = [
  {
    id: 'dawn',
    name: 'Valley at Dawn',
    par: 90,
    draw: drawDawn,
    differences: [
      { id: 'sun', type: 'color', x: 820, y: 110, r: 62, label: 'Sun color' },
      { id: 'roof', type: 'color', x: 165, y: 352, r: 60, label: 'Roof color' },
      { id: 'lantern', type: 'added', x: 722, y: 446, r: 42, label: 'Extra lantern' },
      { id: 'cart', type: 'moved', x: 420, y: 526, r: 62, label: 'Cart moved' },
      { id: 'flowers', type: 'count', x: 112, y: 566, r: 60, label: 'Flowers count' },
      { id: 'sign', type: 'text', x: 252, y: 468, r: 52, label: 'Sign text' },
      { id: 'bird', type: 'missing', x: 220, y: 130, r: 42, label: 'Missing bird' },
    ],
  },
  {
    id: 'camp',
    name: 'Autumn Camp',
    par: 105,
    draw: drawCamp,
    differences: [
      { id: 'tent', type: 'color', x: 230, y: 470, r: 62, label: 'Tent color' },
      { id: 'pack', type: 'moved', x: 712, y: 528, r: 55, label: 'Backpack moved' },
      { id: 'squirrel', type: 'missing', x: 820, y: 460, r: 55, label: 'Missing squirrel' },
      { id: 'mushroom', type: 'added', x: 350, y: 540, r: 42, label: 'Extra mushroom' },
      { id: 'logs', type: 'count', x: 626, y: 556, r: 55, label: 'Logs count' },
      { id: 'sign', type: 'text', x: 122, y: 468, r: 52, label: 'Sign text' },
      { id: 'lamp', type: 'color', x: 620, y: 444, r: 45, label: 'Lantern glow' },
    ],
  },
  {
    id: 'snow',
    name: 'Snow Lantern Night',
    par: 120,
    draw: drawSnow,
    differences: [
      { id: 'window', type: 'color', x: 456, y: 410, r: 45, label: 'Window light' },
      { id: 'buttons', type: 'count', x: 350, y: 506, r: 50, label: 'Buttons count' },
      { id: 'lamp', type: 'color', x: 330, y: 446, r: 45, label: 'Lantern glow' },
      { id: 'star', type: 'missing', x: 300, y: 90, r: 40, label: 'Missing star' },
      { id: 'fencelamp', type: 'added', x: 700, y: 492, r: 40, label: 'Extra lantern' },
      { id: 'sled', type: 'moved', x: 686, y: 550, r: 55, label: 'Sled moved' },
      { id: 'sign', type: 'text', x: 122, y: 468, r: 52, label: 'Sign text' },
    ],
  },
];
