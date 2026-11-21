// Ember Valley — game state machine, HUD, markers, modals, scoring.
import { SCENES, PANEL_W, PANEL_H } from './scenes.js';
import { SoundBank } from './audio.js';

export const HINTS_PER_SCENE = 3;
export const MAX_STRIKES = 3;
const BEST_KEY = 'ember-valley-best';
const MARKER_COLOR = '#ff6b1a'; // ember orange ring (not gold)
const MARKER_LATEST = '#ffffff';

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export class EmberGame {
  constructor(doc) {
    this.doc = doc;
    this.sound = new SoundBank();
    this.screen = 'title'; // title | playing | paused | sceneComplete | sceneFailed | gameComplete
    this.sceneIndex = 0;
    this.found = new Set();
    this.strikes = 0;
    this.hintsLeft = HINTS_PER_SCENE;
    this.hintsUsed = 0;
    this.elapsed = 0; // seconds, count-up for current scene
    this.timerOn = false;
    this.lastTick = 0;
    this.totalScore = 0;
    this.sceneStars = [0, 0, 0];
    this.sceneScores = [0, 0, 0];
    this.missFlash = null; // {panel, x, y, until}
    this.hintRing = null; // {diff, until}
    this.latestFound = null;
    this.best = this.loadBest();
    this.raf = 0;
    this._bindDom();
    this._bindInput();
    this.showTitle();
  }

  // ---------- persistence ----------
  loadBest() {
    try {
      const raw = this.doc.defaultView.localStorage.getItem(BEST_KEY);
      if (!raw) return { score: 0, stars: 0 };
      const b = JSON.parse(raw);
      return { score: b.score | 0, stars: b.stars | 0 };
    } catch (e) { return { score: 0, stars: 0 }; }
  }
  saveBest() {
    try {
      this.doc.defaultView.localStorage.setItem(BEST_KEY, JSON.stringify(this.best));
    } catch (e) { /* private mode: ignore */ }
  }

  // ---------- DOM ----------
  $(id) { return this.doc.getElementById(id); }
  _bindDom() {
    this.el = {
      topbar: this.$('topbar'),
      sceneLabel: this.$('sceneLabel'),
      parLabel: this.$('parLabel'),
      toFind: this.$('toFind'),
      timer: this.$('timer'),
      strikes: this.$('strikes'),
      score: this.$('score'),
      hintBtn: this.$('hintBtn'),
      pauseBtn: this.$('pauseBtn'),
      muteBtn: this.$('muteBtn'),
      left: this.$('panelLeft'),
      right: this.$('panelRight'),
      foundDots: this.$('foundDots'),
      sceneDots: this.$('sceneDots'),
      title: this.$('titleScreen'),
      modal: this.$('modal'),
      modalCard: this.$('modalCard'),
      modalTitle: this.$('modalTitle'),
      modalBody: this.$('modalBody'),
      modalBtns: this.$('modalBtns'),
      status: this.$('status'),
      titleBest: this.$('titleBest'),
      prevL: this.$('titlePrevL'),
      prevR: this.$('titlePrevR'),
    };
    this.lctx = this.el.left.getContext('2d');
    this.rctx = this.el.right.getContext('2d');
  }
  _bindInput() {
    const onPanel = (ev, panel) => {
      if (this.screen !== 'playing') return;
      const canvas = panel === 'left' ? this.el.left : this.el.right;
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * PANEL_W;
      const y = ((ev.clientY - rect.top) / rect.height) * PANEL_H;
      this.clickAt(panel, x, y);
    };
    this.el.left.addEventListener('pointerdown', (ev) => onPanel(ev, 'left'));
    this.el.right.addEventListener('pointerdown', (ev) => onPanel(ev, 'right'));
    this.el.hintBtn.addEventListener('click', () => this.useHint());
    this.el.pauseBtn.addEventListener('click', () => this.togglePause());
    this.el.muteBtn.addEventListener('click', () => this.toggleMute());
    this.$('startBtn').addEventListener('click', () => { this.sound.ensure(); this.startScene(0); });
    this.doc.querySelectorAll('[data-scene]').forEach((b) => {
      b.addEventListener('click', () => { this.sound.ensure(); this.startScene(Number(b.dataset.scene)); });
    });
    this.doc.addEventListener('keydown', (ev) => {
      if (ev.key === 'h' || ev.key === 'H') this.useHint();
      else if (ev.key === 'm' || ev.key === 'M') this.toggleMute();
      else if (ev.key === 'Escape' || ev.key === 'p' || ev.key === 'P') this.togglePause();
      else if ((ev.key === 'n' || ev.key === 'N') && (this.screen === 'sceneComplete' || this.screen === 'gameComplete')) this.nextAction();
      else if (ev.key === 'Enter' && this.screen === 'title') this.startScene(0);
    });
  }

  // ---------- screens ----------
  showTitle() {
    this.screen = 'title';
    this.timerOn = false;
    this.el.title.classList.remove('hidden');
    this.el.modal.classList.add('hidden');
    this.el.topbar.classList.add('dim');
    this.el.titleBest.textContent = this.best.score > 0
      ? `Best score: ${this.best.score}  ·  ${this.best.stars}★ total`
      : 'No best score yet — be the first to clear the valley.';
    this.drawTitlePreviews();
    this.drawPanels();
    this.updateHud();
  }
  drawTitlePreviews() {
    const s = SCENES[0];
    for (const [cv, right] of [[this.el.prevL, false], [this.el.prevR, true]]) {
      const c = cv.getContext('2d');
      c.save();
      c.scale(cv.width / PANEL_W, cv.height / PANEL_H);
      s.draw(c, right);
      c.restore();
    }
  }
  startScene(i) {
    this.sceneIndex = i;
    this.found = new Set();
    this.latestFound = null;
    this.strikes = 0;
    this.hintsLeft = HINTS_PER_SCENE;
    this.hintsUsed = 0;
    this.elapsed = 0;
    this.missFlash = null;
    this.hintRing = null;
    this.screen = 'playing';
    this.timerOn = true;
    this.lastTick = performance.now();
    this.el.title.classList.add('hidden');
    this.el.modal.classList.add('hidden');
    this.el.topbar.classList.remove('dim');
    this.drawPanels();
    this.updateHud();
    this.announce(`Scene ${i + 1}: ${SCENES[i].name}. Find 7 differences.`);
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }
  loop(t) {
    if (this.screen !== 'playing') return;
    const dt = (t - this.lastTick) / 1000;
    this.lastTick = t;
    if (this.timerOn) this.elapsed += dt;
    this.el.timer.textContent = fmtTime(this.elapsed);
    this.drawPanels();
    this.raf = requestAnimationFrame((tt) => this.loop(tt));
  }

  // ---------- play ----------
  scene() { return SCENES[this.sceneIndex]; }
  clickAt(panel, x, y) {
    if (this.screen !== 'playing') return;
    const sc = this.scene();
    // 1. Nearest UNFOUND difference wins (a click on its centre always counts,
    //    even when it also sits near an already-found ring).
    let hit = null;
    let best = 1e9;
    for (const d of sc.differences) {
      if (this.found.has(d.id)) continue;
      const dx = x - d.x, dy = y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= d.r + 14 && dist < best) { best = dist; hit = d; }
    }
    if (hit) {
      this.found.add(hit.id);
      this.latestFound = hit.id;
      this.sound.found();
      this.drawPanels();
      this.updateHud();
      this.announce(`Found ${this.found.size} of 7: ${hit.label}.`);
      if (this.found.size === 7) this.completeScene();
      return;
    }
    // 2. Clicking an already-found ring is a no-op, never a strike.
    for (const d of sc.differences) {
      if (!this.found.has(d.id)) continue;
      const dx = x - d.x, dy = y - d.y;
      if (Math.sqrt(dx * dx + dy * dy) <= d.r + 14) return;
    }
    // 3. Otherwise it is a miss.
    this.strikes += 1;
    this.sound.miss();
    this.missFlash = { panel, x, y, until: performance.now() + 650 };
    this.drawPanels();
    this.updateHud();
    this.announce(`Miss. Strike ${this.strikes} of ${MAX_STRIKES}.`);
    if (this.strikes >= MAX_STRIKES) this.failScene();
  }
  useHint() {
    if (this.screen !== 'playing') return;
    if (this.hintsLeft <= 0) { this.announce('No hints left.'); return; }
    const sc = this.scene();
    const remaining = sc.differences.filter((d) => !this.found.has(d.id));
    if (!remaining.length) return;
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    this.hintsLeft -= 1;
    this.hintsUsed += 1;
    this.hintRing = { diff: pick, until: performance.now() + 2200 };
    this.sound.hint();
    this.drawPanels();
    this.updateHud();
    this.announce('Hint: look at the glowing ring.');
  }
  togglePause() {
    if (this.screen === 'playing') {
      this.screen = 'paused';
      this.timerOn = false;
      this.showModal('Paused', `<p>Take a breath. The valley waits.</p><p class="muted">Scene ${this.sceneIndex + 1} · ${this.scene().name} · ${this.found.size}/7 found</p>`, [
        { label: 'Resume', fn: () => this.resume() },
        { label: 'Restart scene', fn: () => this.startScene(this.sceneIndex) },
        { label: 'Title screen', fn: () => this.showTitle() },
      ]);
    } else if (this.screen === 'paused') {
      this.resume();
    }
  }
  resume() {
    if (this.screen !== 'paused') return;
    this.screen = 'playing';
    this.timerOn = true;
    this.lastTick = performance.now();
    this.el.modal.classList.add('hidden');
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }
  toggleMute() {
    this.sound.muted = !this.sound.muted;
    this.el.muteBtn.textContent = this.sound.muted ? 'Sound: off' : 'Sound: on';
  }

  // ---------- scoring ----------
  starsFor(timeSec, strikes) {
    let stars = 3;
    if (strikes > 0) stars -= 1;
    if (timeSec > this.scene().par) stars -= 1;
    return Math.max(1, stars);
  }
  completeScene() {
    this.timerOn = false;
    this.screen = 'sceneComplete';
    const stars = this.starsFor(this.elapsed, this.strikes);
    const timeBonus = Math.max(0, Math.round((this.scene().par - this.elapsed) * 5));
    const score = 7 * 100 + timeBonus + stars * 50;
    this.sceneStars[this.sceneIndex] = stars;
    this.sceneScores[this.sceneIndex] = score;
    this.totalScore += score;
    this.sound.win();
    const last = this.sceneIndex === SCENES.length - 1;
    const starRow = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.showModal(last ? 'Valley complete!' : 'Scene complete!', `
      <p class="big-stars">${starRow}</p>
      <p>All 7 differences found in <b>${this.scene().name}</b></p>
      <p>Time: <b>${fmtTime(this.elapsed)}</b> (par ${fmtTime(this.scene().par)}) · Strikes: <b>${this.strikes}</b> · Hints used: <b>${this.hintsUsed}</b></p>
      <p>Scene score: <b>${score}</b> · Total: <b>${this.totalScore}</b></p>
    `, last
      ? [{ label: 'See results', fn: () => this.finishGame() }]
      : [{ label: 'Next scene →', fn: () => this.nextAction() }, { label: 'Replay scene', fn: () => this.startScene(this.sceneIndex) }]);
    this.announce(`Scene complete. ${stars} stars.`);
  }
  failScene() {
    this.timerOn = false;
    this.screen = 'sceneFailed';
    this.sound.fail();
    this.showModal('Out of strikes', `
      <p>Three strikes — the scene resets.</p>
      <p class="muted">You found ${this.found.size}/7 in ${this.scene().name}. Try again — every difference is still right where it was.</p>
    `, [
      { label: 'Try again', fn: () => this.startScene(this.sceneIndex) },
      { label: 'Title screen', fn: () => this.showTitle() },
    ]);
  }
  nextAction() {
    if (this.screen === 'sceneComplete') {
      if (this.sceneIndex < SCENES.length - 1) this.startScene(this.sceneIndex + 1);
      else this.finishGame();
    } else if (this.screen === 'gameComplete') {
      this.showTitle();
    }
  }
  finishGame() {
    this.screen = 'gameComplete';
    const totalStars = this.sceneStars.reduce((a, b) => a + b, 0);
    const isBest = this.totalScore > this.best.score;
    if (isBest) {
      this.best = { score: this.totalScore, stars: totalStars };
      this.saveBest();
    }
    this.showModal('Ember Valley — cleared!', `
      <p class="big-stars">${'★'.repeat(totalStars)}${'☆'.repeat(9 - totalStars)}</p>
      <p>All 3 scenes cleared · <b>${totalStars}/9 stars</b></p>
      <p>Total score: <b>${this.totalScore}</b>${isBest ? ' — <b>new best!</b>' : ''}</p>
      <p class="muted">Scene scores: ${this.sceneScores.join(' · ')}</p>
    `, [
      { label: 'Play again', fn: () => { this.totalScore = 0; this.sceneStars = [0, 0, 0]; this.sceneScores = [0, 0, 0]; this.startScene(0); } },
      { label: 'Title screen', fn: () => { this.totalScore = 0; this.sceneStars = [0, 0, 0]; this.sceneScores = [0, 0, 0]; this.showTitle(); } },
    ]);
  }

  // ---------- rendering ----------
  drawPanels() {
    const sc = this.scene();
    const now = performance.now();
    for (const [ctx, right] of [[this.lctx, false], [this.rctx, true]]) {
      ctx.clearRect(0, 0, PANEL_W, PANEL_H);
      sc.draw(ctx, right);
      // found markers on both panels
      for (const d of sc.differences) {
        if (!this.found.has(d.id)) continue;
        const latest = d.id === this.latestFound;
        ctx.lineWidth = latest ? 9 : 7;
        ctx.strokeStyle = MARKER_COLOR;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        if (latest) {
          const pulse = 1 + 0.08 * Math.sin(now / 160);
          ctx.lineWidth = 3;
          ctx.strokeStyle = MARKER_LATEST;
          ctx.beginPath();
          ctx.arc(d.x, d.y, (d.r + 14) * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // hint ring (pulsing, both panels)
      if (this.hintRing && now < this.hintRing.until) {
        const d = this.hintRing.diff;
        const pulse = 1 + 0.12 * Math.sin(now / 120);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#ffe66d';
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * pulse + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // miss flash (red X on the clicked panel only)
      if (this.missFlash && this.missFlash.panel === (right ? 'right' : 'left') && now < this.missFlash.until) {
        const { x, y } = this.missFlash;
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#ff3b30';
        ctx.beginPath();
        ctx.moveTo(x - 18, y - 18); ctx.lineTo(x + 18, y + 18);
        ctx.moveTo(x + 18, y - 18); ctx.lineTo(x - 18, y + 18);
        ctx.stroke();
      }
    }
  }
  updateHud() {
    const sc = this.scene();
    this.el.sceneLabel.textContent = `${sc.name}`;
    this.el.parLabel.textContent = `Scene ${this.sceneIndex + 1} of 3 · Par ${fmtTime(sc.par)}`;
    const remaining = 7 - this.found.size;
    this.el.toFind.textContent = `${remaining} to find`;
    this.el.timer.textContent = fmtTime(this.elapsed);
    this.el.strikes.textContent = `Strikes: ${this.strikes}`;
    this.el.score.textContent = `Score: ${this.totalScore}`;
    this.el.hintBtn.textContent = `Hint (${this.hintsLeft})`;
    this.el.hintBtn.disabled = this.hintsLeft <= 0 || this.screen !== 'playing';
    // found dots
    const dots = this.el.foundDots.children;
    for (let i = 0; i < 7; i++) {
      dots[i].classList.toggle('found', i < this.found.size);
    }
    // scene progress dots (completed = filled, current = outlined)
    const sdots = this.el.sceneDots.children;
    for (let i = 0; i < 3; i++) {
      sdots[i].classList.toggle('done', this.sceneStars[i] > 0);
      sdots[i].classList.toggle('current', i === this.sceneIndex && this.sceneStars[i] === 0);
    }
  }
  showModal(title, bodyHtml, buttons) {
    this.el.modalTitle.textContent = title;
    this.el.modalBody.innerHTML = bodyHtml;
    this.el.modalBtns.innerHTML = '';
    for (const b of buttons) {
      const btn = this.doc.createElement('button');
      btn.className = 'btn primary';
      btn.textContent = b.label;
      btn.addEventListener('click', () => { this.sound.click(); b.fn(); });
      this.el.modalBtns.appendChild(btn);
    }
    this.el.modal.classList.remove('hidden');
    this.updateHud();
  }
  announce(msg) {
    this.el.status.textContent = msg;
  }

  // ---------- staging / debug ----------
  // Deterministic states for screenshots + playtests (not cheats: same code path).
  stage(state) {
    if (state.stage === 'title') { this.showTitle(); return; }
    const scene = Math.min(2, Math.max(0, (state.scene || 1) - 1));
    this.startScene(scene);
    this.timerOn = false;
    cancelAnimationFrame(this.raf);
    this.elapsed = state.elapsed ?? 42;
    if (state.found) {
      for (const idx of state.found) {
        const d = this.scene().differences[idx];
        if (d) { this.found.add(d.id); this.latestFound = d.id; }
      }
    }
    if (state.strikes) this.strikes = state.strikes;
    if (state.hintsLeft !== undefined) this.hintsLeft = state.hintsLeft;
    if (state.hintsUsed) this.hintsUsed = state.hintsUsed;
    this.drawPanels();
    this.updateHud();
    if (state.stage === 'complete') {
      // mark all found, then complete with staged stats
      for (const d of this.scene().differences) this.found.add(d.id);
      this.elapsed = state.elapsed ?? 58;
      this.strikes = state.strikes ?? 0;
      this.hintsUsed = state.hintsUsed ?? 0;
      this.completeScene();
    } else if (state.stage === 'fail') {
      this.strikes = 3;
      this.failScene();
    }
  }
}
