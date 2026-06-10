// FrameworkAdvisorWidget — widget orchestrator.
// Pre-rendered Astro markup (questions, results, comparison columns, OOS panel)
// is hidden in the DOM at build time. This script reveals the right panel,
// syncs selection state, and fills the runtime-only dynamic fragments.
//
// `advisorData` is injected by the component as a JSON island (#advisor-data).

import { recommend, verdict } from './advisor/advisor-engine.js';
import {
  initIcons, ic,
  buildProgress, buildCaveats, buildWhy, buildNav, buildVerdictHTML,
} from './advisor/advisor-builders.js';

const advisorData = JSON.parse(
  document.getElementById('advisor-data')?.textContent || '{}'
);

const { frameworks, meta, questions, demos } = advisorData;
const TOTAL = questions.length;
const REDUCE = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── State machine ──────────────────────────────────────── */
let state = {
  mode: 'q',      // 'q' | 'result' | 'oos'
  index: 0,
  answers: {},
  freeText: '',
  whyOpen: false,
};
let lastDir = 'fwd';
let busy = false;
let currentResult = null;   // memoised recommend() output for the active result panel

function getRoot() {
  return document.getElementById('framework-advisor-root');
}

function stages(root) {
  return root.querySelectorAll('.advisor__stage-mount > .stage');
}

function currentVisibleStage() {
  const root = getRoot();
  return root && root.querySelector('.advisor__stage-mount > .stage:not([hidden])');
}

function animateAdoptionBars(scope) {
  scope.querySelectorAll('.adopt__fill[data-width]').forEach(el => {
    const target = el.dataset.width + '%';
    el.style.width = '0%';
    void el.offsetWidth; // reflow so the transition replays from 0
    const land = () => { el.style.width = target; };
    // rAF is throttled while the tab is hidden, so only rely on it when visible —
    // otherwise set the final width directly so the bar always lands correctly.
    if (!REDUCE && document.visibilityState === 'visible') {
      requestAnimationFrame(() => requestAnimationFrame(land));
    } else {
      land();
    }
  });
}

function reveal(target, dir) {
  const root = getRoot();
  stages(root).forEach(s => {
    if (s !== target) {
      s.hidden = true;
      s.classList.remove('enter-fwd', 'enter-back', 'exit-fwd', 'exit-back');
    }
  });
  target.hidden = false;
  target.classList.remove('exit-fwd', 'exit-back', 'enter-fwd', 'enter-back');
  if (!REDUCE) {
    void target.offsetWidth;
    target.classList.add('enter-' + dir);
  }
}

// Apply selection highlight, roving tabindex and the free-text value to a question panel.
function syncQuestion(panel, q) {
  const value = state.answers[q.id];
  const rovers = panel.querySelectorAll('.opt, .pcard, .scale__stop');
  let hasSelected = false;
  panel.querySelectorAll('[data-select]').forEach(btn => {
    const sel = btn.dataset.select === value;
    if (sel) hasSelected = true;
    btn.setAttribute('aria-checked', sel ? 'true' : 'false');
    btn.classList.toggle('is-sel', sel);
    if (btn.matches('.opt, .pcard, .scale__stop')) btn.tabIndex = sel ? 0 : -1;
  });
  // Keep one roving control tabbable when nothing is selected yet.
  if (!hasSelected && rovers[0]) rovers[0].tabIndex = 0;

  const ft = panel.querySelector('[data-freetext]');
  if (ft) {
    const show = !!q.options?.find(o => o.v === value)?.freetext;
    ft.hidden = !show;
    const input = ft.querySelector('input');
    if (input) input.value = state.freeText || '';
  }
}

function fillResult(panel, result) {
  const cav = panel.querySelector('[data-caveats-mount]');
  if (cav) cav.innerHTML = buildCaveats(result.caveats);
  const why = panel.querySelector('[data-why-mount]');
  if (why) why.innerHTML = buildWhy(result.trace, state.whyOpen);
}

function composeComparison(panel, result, pickKey) {
  const root = getRoot();
  const v = verdict(pickKey, result.rec, advisorData);
  const metaKey = meta[pickKey] ? pickKey : null;
  const cloneCol = fwKey =>
    root.querySelector(`.advisor__parts [data-column="${fwKey}"]`).cloneNode(true);

  let cmp;
  if (v.state === 'agreement') {
    const rec = cloneCol(result.rec);
    rec.classList.add('cmp__col--rec', 'cmp__col--solo');
    const role = rec.querySelector('[data-role]');
    if (role) role.remove();
    const wrap = document.createElement('div');
    wrap.className = 'cmp cmp--agree';
    wrap.appendChild(rec);
    cmp = wrap.outerHTML;
  } else {
    const pickCol = cloneCol(v.pickBase);
    pickCol.classList.add('cmp__col--pick');
    pickCol.querySelector('[data-role]').textContent = 'Your pick';
    const metaEl = pickCol.querySelector('[data-meta]');
    if (metaKey) {
      metaEl.textContent = `${v.pickName} — meta framework on ${frameworks[v.pickBase].name}`;
      const note = pickCol.querySelector('.adopt__note');
      if (note) {
        const baseFw = frameworks[v.pickBase];
        note.innerHTML = `<strong style="color:var(--fg-1)">${v.pickName}</strong> shares ${baseFw.name}'s adoption — ${baseFw.usageNote.toLowerCase()}`;
      }
    } else if (metaEl) {
      metaEl.remove();
    }

    const recCol = cloneCol(result.rec);
    recCol.classList.add('cmp__col--rec');
    const recRole = recCol.querySelector('[data-role]');
    recRole.textContent = 'Our recommendation';
    recRole.classList.add('cmp__role--rec');

    const wrap = document.createElement('div');
    wrap.className = 'cmp';
    wrap.appendChild(pickCol);
    const vs = document.createElement('div');
    vs.className = 'cmp__vs';
    vs.setAttribute('aria-hidden', 'true');
    vs.innerHTML = '<span>vs</span>';
    wrap.appendChild(vs);
    wrap.appendChild(recCol);
    cmp = wrap.outerHTML;
  }

  panel.querySelector('.stage__inner').innerHTML = `
    <div class="result result--cmp" aria-live="polite">
      <div class="result__top">
        <span class="eyebrow">Your pick vs. our recommendation</span>
      </div>
      ${cmp}
      ${buildVerdictHTML(v)}
      <div data-caveats-mount></div>
      <div data-why-mount></div>
      <div class="result__actions">
        <button type="button" class="btn btn-secondary" data-action="copy" data-rec="${result.rec}">${ic('copy')} Copy result</button>
        <button type="button" class="btn btn-primary" data-action="restart">${ic('rotate-left')} Start over</button>
      </div>
    </div>`;
  fillResult(panel, result);
}

/* ── Setup helpers ──────────────────────────────────────── */
function setupQuestion(root) {
  const q = questions[state.index];
  const target = root.querySelector(`.stage[data-panel="q"][data-step="${state.index}"]`);
  syncQuestion(target, q);
  root.querySelector('.advisor__nav-mount').innerHTML = buildNav(q, state);
  return target;
}

function setupResult(root) {
  const result = recommend(state.answers, advisorData);
  currentResult = result;
  const hasPick = state.answers.pick && state.answers.pick !== 'none';
  let target;
  if (hasPick) {
    target = root.querySelector('.stage[data-panel="comparison"]');
    composeComparison(target, result, state.answers.pick);
  } else {
    target = root.querySelector(`.stage[data-panel="result"][data-rec="${result.rec}"]`);
    fillResult(target, result);
  }
  clearNav(root);
  return target;
}

function setupOos(root) {
  clearNav(root);
  return root.querySelector('.stage[data-panel="oos"]');
}

// Compute the active panel, fill its dynamic bits, and reveal it.
function setup() {
  const root = getRoot();
  if (!root) return;

  // Header restart button (result / oos only)
  const headRestart = root.querySelector('.advisor__head-restart');
  if (headRestart) {
    if (state.mode === 'result' || state.mode === 'oos') {
      headRestart.style.display = '';
      headRestart.innerHTML = `<button type="button" class="advisor__restart-btn" data-action="restart" title="Start over" aria-label="Start over">${ic('rotate-left')}</button>`;
    } else {
      headRestart.style.display = 'none';
      headRestart.innerHTML = '';
    }
  }

  // Progress
  const pm = root.querySelector('.advisor__progress-mount');
  if (pm) pm.innerHTML = state.mode !== 'oos' ? buildProgress(state.index, state.mode, questions) : '';

  const target =
    state.mode === 'q'      ? setupQuestion(root) :
    state.mode === 'result' ? setupResult(root)   :
                              setupOos(root);

  if (target) {
    reveal(target, lastDir);
    if (state.mode === 'result') animateAdoptionBars(target);
  }
}

function clearNav(root) {
  const nm = root.querySelector('.advisor__nav-mount');
  if (nm) nm.innerHTML = '';
}

function go(nextMode, nextIndex, dir) {
  if (busy) return;
  lastDir = dir || 'fwd';
  const apply = () => {
    state.mode = nextMode;
    if (nextIndex !== undefined) state.index = nextIndex;
    state.whyOpen = false;
    setup();
  };
  if (REDUCE) { apply(); return; }
  busy = true;
  const cur = currentVisibleStage();
  if (cur) {
    cur.classList.remove('enter-fwd', 'enter-back');
    cur.classList.add('exit-' + lastDir);
  }
  setTimeout(() => { busy = false; apply(); }, 200);
}

function refreshActiveQuestion() {
  const root = getRoot();
  const q = questions[state.index];
  const panel = root.querySelector(`.stage[data-panel="q"][data-step="${state.index}"]`);
  if (panel) syncQuestion(panel, q);
  root.querySelector('.advisor__nav-mount').innerHTML = buildNav(q, state);
}

function select(qId, value) {
  state.answers = { ...state.answers, [qId]: value };

  const currentQ = questions[state.index];
  const selectedOpt = currentQ.options?.find(o => o.v === value);
  if (selectedOpt?.escape) {
    go('oos', undefined, 'fwd');
    return;
  }
  if (selectedOpt?.freetext) {
    refreshActiveQuestion(); // reveal free-text input without advancing
    return;
  }

  // Immediate selection feedback on the active panel before the auto-advance.
  refreshActiveQuestion();

  const advance = () => {
    if (state.index >= TOTAL - 1) go('result', undefined, 'fwd');
    else go('q', state.index + 1, 'fwd');
  };
  if (REDUCE) advance();
  else setTimeout(advance, 260);
}

function restart() {
  state = { mode: 'q', index: 0, answers: {}, freeText: '', whyOpen: false };
  go('q', 0, 'back');
}

/* ── Event handling (delegated, attached once) ──────────── */
function onRootClick(e) {
  const target = e.target.closest('[data-select]');
  if (target) {
    select(questions[state.index].id, target.dataset.select);
    return;
  }
  const action = e.target.closest('[data-action]');
  if (!action) return;
  const act = action.dataset.action;

  if (act === 'back') {
    if (state.mode === 'result' || state.mode === 'oos') go('q', TOTAL - 1, 'back');
    else if (state.index > 0) go('q', state.index - 1, 'back');
  } else if (act === 'next') {
    if (state.index >= TOTAL - 1) go('result', undefined, 'fwd');
    else go('q', state.index + 1, 'fwd');
  } else if (act === 'skip') {
    state.answers = { ...state.answers, pick: questions[state.index].noneValue || 'none' };
    go('result', undefined, 'fwd');
  } else if (act === 'restart') {
    restart();
  } else if (act === 'why-toggle') {
    state.whyOpen = !state.whyOpen;
    const panel = currentVisibleStage();
    const why = panel && panel.querySelector('[data-why-mount]');
    if (why && currentResult) why.innerHTML = buildWhy(currentResult.trace, state.whyOpen);
  } else if (act === 'copy') {
    const fw = frameworks[action.dataset.rec];
    const text = `Framework Advisor recommends ${fw.name} — ${fw.reason}`;
    const fin = () => {
      action.innerHTML = `${ic('check')} Copied`;
      setTimeout(() => { action.innerHTML = `${ic('copy')} Copy result`; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(fin).catch(fin);
    } else { fin(); }
  }
}

function onRootKeydown(e) {
  const radio = e.target.closest('[role="radio"]');
  if (!radio) return;
  const next = ['ArrowRight', 'ArrowDown'].includes(e.key);
  const prev = ['ArrowLeft', 'ArrowUp'].includes(e.key);
  if (!next && !prev) return;
  const group = radio.closest('[role="radiogroup"]');
  if (!group) return;
  e.preventDefault();
  const btns = Array.from(group.querySelectorAll('[role="radio"]'));
  let ni = btns.indexOf(radio) + (next ? 1 : -1);
  if (ni < 0) ni = btns.length - 1;
  if (ni >= btns.length) ni = 0;
  btns[ni] && btns[ni].focus();
}

function onRootInput(e) {
  if (e.target && e.target.id === 'fa-freetext') state.freeText = e.target.value;
}

/* ── Mount ──────────────────────────────────────────────── */
function mount() {
  const root = getRoot();
  if (!root) return;
  initIcons();
  root.addEventListener('click', onRootClick);
  root.addEventListener('keydown', onRootKeydown);
  root.addEventListener('input', onRootInput);
  setup();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

/* ── Dev shortcuts ──────────────────────────────────────── */
window.__advisor = {
  restart,
  demo(key) {
    const preset = demos[key];
    if (!preset) return;
    state.answers = { ...preset };
    state.freeText = '';
    state.whyOpen = false;
    if (preset.appType === 'mobile-desktop') go('oos', undefined, 'fwd');
    else go('result', undefined, 'fwd');
  },
};
