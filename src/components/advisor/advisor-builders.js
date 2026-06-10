// Runtime HTML fragment builders — the only HTML still assembled in JS.
// Each function is pure given its arguments; none touches the DOM directly.
// Icon infrastructure lives here because builders are its primary consumer;
// ic() is re-exported for the few widget call-sites outside this module.

/* ── Icons ───────────────────────────────────────────────── */
const ICON_SVGS = {};

export function initIcons() {
  const sprites = document.getElementById('advisor-icon-sprites');
  if (!sprites) return;
  sprites.querySelectorAll('[id^="advisor-icon-"]').forEach(el => {
    const name = el.id.replace('advisor-icon-', '');
    const svg = el.querySelector('svg');
    if (svg) ICON_SVGS[name] = svg.innerHTML;
  });
}

export function ic(name, cls) {
  const inner = ICON_SVGS[name] || ICON_SVGS['ellipsis'] || '';
  return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/* ── Builders ────────────────────────────────────────────── */
export function buildProgress(index, mode, questions) {
  const TOTAL = questions.length;
  const current = mode === 'result' ? TOTAL : index + 1;
  const q = questions[Math.min(index, TOTAL - 1)];
  const optional = mode === 'q' && q.optional;
  const pct = Math.round((current / TOTAL) * 100);
  const label = mode === 'result' ? 'Complete' : `Step ${current} of ${TOTAL}`;
  const segs = questions.map((_, i) => {
    const done = i < current;
    const now  = i === index && mode === 'q';
    return `<span class="progress__seg${done ? ' is-done' : ''}${now ? ' is-now' : ''}"></span>`;
  }).join('');
  return `
    <div class="progress">
      <div class="progress__row">
        <span class="progress__label">${label}${optional ? '<span class="progress__opt"> · optional</span>' : ''}</span>
        <span class="progress__pct">${pct}%</span>
      </div>
      <div class="progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${TOTAL}" aria-valuenow="${current}">
        ${segs}
      </div>
    </div>`;
}

export function buildCaveats(items) {
  if (!items || !items.length) return '';
  return `<div class="caveats" role="note">${items.map(c =>
    `<p>${ic('triangle-exclamation')}<span>${c}</span></p>`).join('')}</div>`;
}

export function buildWhy(trace, open) {
  const items = trace.map(t =>
    `<li><span class="why__q">${t.q}</span><span class="why__a">${t.a}</span><span class="why__e">${t.effect}</span></li>`
  ).join('');
  const list = open ? `<ol class="why__list">${items}</ol>` : '';
  return `
    <div class="why${open ? ' is-open' : ''}">
      <button type="button" class="why__toggle" aria-expanded="${open}" data-action="why-toggle">
        ${ic('route')} Why this recommendation?
        ${ic('chevron-down', 'why__chev')}
      </button>
      ${list}
    </div>`;
}

export function buildNav(q, state) {
  const canContinue = state.answers[q.id] !== undefined;
  const hint = q.optional ? "Optional — skip if you're open" : 'Pick one to continue';
  const spacer = `<span class="navbtn navbtn--spacer" aria-hidden="true"></span>`;
  const backBtn = state.index === 0
    ? spacer
    : `<button type="button" class="navbtn navbtn--ghost" data-action="back">${ic('arrow-left')} Back</button>`;
  let rightBtn;
  if (q.optional) {
    rightBtn = `<button type="button" class="navbtn navbtn--ghost" data-action="skip">${ic('arrow-right')} Skip</button>`;
  } else if (canContinue) {
    rightBtn = `<button type="button" class="navbtn navbtn--solid" data-action="next">Continue ${ic('arrow-right')}</button>`;
  } else {
    rightBtn = spacer;
  }
  return `
    <div class="advisor__nav" role="navigation" aria-label="Question navigation">
      ${backBtn}
      <span class="advisor__hint">${hint}</span>
      ${rightBtn}
    </div>`;
}

export function buildVerdictHTML(v) {
  const verdictIcon = {
    agreement: 'circle-check', partial: 'code-merge', divergence: 'arrows-split-up-and-left',
  }[v.state] || 'circle-check';
  const reasonsList = v.reasons.length
    ? `<ul class="verdict__reasons">${v.reasons.map(b => `<li><a href="${b.anchor}">${b.text}</a></li>`).join('')}</ul>`
    : '';
  return `
    <div class="verdict verdict--${v.state}">
      <div class="verdict__icon" aria-hidden="true">${ic(verdictIcon)}</div>
      <div class="verdict__body">
        <p class="verdict__headline">${v.headline}</p>
        <p class="verdict__detail">${v.detail}</p>
        ${reasonsList}
      </div>
    </div>`;
}
