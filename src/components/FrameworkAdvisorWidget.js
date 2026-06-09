// FrameworkAdvisorWidget — widget logic (extracted from the .astro component).
// The questions, result cards, comparison columns and out-of-scope panel are all
// pre-rendered as static Astro markup (hidden in the DOM). This script is the
// orchestrator: it runs the recommendation algorithm, reveals the right panel,
// syncs selection state, and builds only the genuinely dynamic fragments
// (progress, nav, caveats, the "why" trace and the pick-vs-recommendation verdict).
//
// `advisorData` is injected by the component as a JSON island (#advisor-data).

const advisorData = JSON.parse(
  document.getElementById('advisor-data')?.textContent || '{}'
);

(function () {
  /* ── Icons ───────────────────────────────────────────────── */
  // Cache of the few icons the script injects at runtime, read from the build-time
  // sprite. Static markup renders its icons via <AdvisorIcon> directly.
  const ICON_SVGS = {};

  function initIcons() {
    const sprites = document.getElementById('advisor-icon-sprites');
    if (!sprites) return;
    sprites.querySelectorAll('[id^="advisor-icon-"]').forEach(el => {
      const name = el.id.replace('advisor-icon-', '');
      const svg = el.querySelector('svg');
      if (svg) ICON_SVGS[name] = svg.innerHTML;
    });
  }

  function ic(name, cls) {
    const inner = ICON_SVGS[name] || ICON_SVGS['ellipsis'] || '';
    return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }

  /* ── Data from YAML ─────────────────────────────────────── */
  const { frameworks, meta, questions, demos } = advisorData;
  const PREF_ORDER = ['react', 'vue', 'angular', 'svelte', 'solid'];
  const JVM_DOTNET = ['java', 'kotlin', 'csharp'];
  const TOTAL = questions.length;
  const REDUCE = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Recommendation logic ───────────────────────────────── */
  function recommend(a) {
    const trace = [];
    let pool = [...PREF_ORDER];

    // Step 1 – backing pool filter (Q7)
    // Vue has full-time principal contributors (Evan You/VoidZero/Cloudflare), so it
    // survives the "large company" constraint — only Svelte and Solid are excluded.
    if (a.backing === 'very') {
      pool = pool.filter(f => f === 'react' || f === 'angular' || f === 'vue');
      trace.push({ q: 'Backing', a: 'Large company', effect: 'Pool restricted to React, Angular & Vue — only frameworks with corporate or strong institutional backing.' });
    } else if (a.backing === 'quite') {
      pool = pool.filter(f => f !== 'solid');
      trace.push({ q: 'Backing', a: 'Full-time contributor', effect: 'Solid excluded — no corporate backer or principal contributor.' });
    } else {
      trace.push({ q: 'Backing', a: 'Community', effect: 'All five frameworks remain candidates.' });
    }

    // Step 2 – ecosystem pool filter (Q6)
    const caveats = [];
    if (a.ecosystem === 'official' || a.ecosystem === 'community') {
      pool = pool.filter(f => f !== 'solid');
      trace.push({ q: 'Ecosystem', a: a.ecosystem === 'official' ? 'Official SDKs only' : 'Community adapters fine', effect: 'Solid eliminated — it has no dedicated SDK integrations.' });
    } else {
      trace.push({ q: 'Ecosystem', a: 'Build my own', effect: 'No further constraint on the pool.' });
    }

    // Step 3 – hard recommendation rules (Q2, Q3, Q4, Q8)
    let rec = null;

    if (JVM_DOTNET.includes(a.backend) && (a.hiring === 'backend-contrib' || a.teamsize === 'enterprise')) {
      // JVM/.NET + enterprise/backend-led → Angular
      rec = 'angular';
      trace.push({ q: 'Backend + team', a: 'JVM/.NET + enterprise or backend-led', effect: 'Strongest signal for Angular — familiar structure for Java/Spring and C#/.NET engineers.' });

    } else if ((a.hiring === 'solo' || a.hiring === 'unsure') && a.ecosystem === 'build' && a.backing !== 'very') {
      // Self-sufficient lean builder, builds own integrations → Solid
      rec = 'solid';
      trace.push({ q: 'Ecosystem + team', a: 'Build own + solo/uncommitted team + community backing', effect: 'Strong signal for Solid — fine-grained reactivity, no SDK dependencies to manage.' });

    } else if (['python', 'go'].includes(a.backend) && a.teamsize !== 'enterprise') {
      // Python/Go backend — natural pairing with Vue regardless of hiring
      rec = 'vue';
      trace.push({ q: 'Backend', a: 'Python/Go API', effect: 'Vue pairs naturally with Python and Go backends; preferred in that ecosystem.' });

    } else if (a.hiring === 'backend-contrib' && !JVM_DOTNET.includes(a.backend) && a.teamsize === 'small' && a.ecosystem !== 'official' && a.ai !== 'central') {
      // Backend devs contributing to a small lean frontend → Svelte
      rec = 'svelte';
      trace.push({ q: 'Staffing + team', a: 'Backend-contrib + small lean team', effect: 'Svelte minimal boilerplate suits a small team of backend engineers owning the UI layer.' });

    } else if (a.hiring === 'backend-contrib' && !JVM_DOTNET.includes(a.backend) && a.teamsize !== 'enterprise') {
      // Backend devs contributing (mid/official/AI needs) → Vue
      rec = 'vue';
      trace.push({ q: 'Staffing', a: 'Backend devs contributing to frontend', effect: 'Vue has the gentlest learning curve for engineers crossing from backend to frontend.' });

    } else if (a.hiring === 'solo' && a.ai === 'central') {
      // Solo + AI-central → React (AI tooling overrides lean preference)
      rec = 'react';
      trace.push({ q: 'AI usage + staffing', a: 'Central to workflow + solo', effect: 'React has the deepest AI training data; worth the extra setup for AI-reliant solo builders.' });

    } else if (a.hiring === 'solo') {
      // Solo developer default → Svelte (lean, owns the full stack)
      rec = 'svelte';
      trace.push({ q: 'Staffing', a: 'Solo / indie developer', effect: 'Svelte minimal boilerplate is ideal for a solo developer who owns every decision.' });

    } else if (a.hiring === 'unsure' && a.ecosystem !== 'official' && a.ai !== 'central' && a.teamsize !== 'enterprise') {
      // Uncommitted team + lean stack preference → Svelte
      rec = 'svelte';
      trace.push({ q: 'Staffing + ecosystem', a: 'Uncommitted team + lean ecosystem', effect: 'Svelte low-ceremony setup suits a team still figuring out its shape.' });

    } else if (a.hiring === 'dedicated' || a.ai === 'central') {
      // Dedicated frontend team or AI-central → React
      rec = 'react';
      trace.push({ q: a.ai === 'central' ? 'AI usage' : 'Staffing', a: a.ai === 'central' ? 'Central to workflow' : 'Dedicated frontend team', effect: 'React has the largest hiring pool and best AI tooling support.' });

    } else {
      // Default
      rec = 'react';
      if (a.capability === 'conventions' && pool.includes('vue')) {
        rec = 'vue';
        trace.push({ q: 'Capability', a: 'Conventions, not mandates', effect: 'Vue provides standard routing and state out of the box — the right fit here.' });
      } else {
        trace.push({ q: 'Default', a: 'No dominant signal', effect: "Falls back to React, the post's safe default." });
      }
    }

    // Pool check – fallback if primary rec is outside constraints
    if (!pool.includes(rec)) {
      const fallback = PREF_ORDER.find(f => pool.includes(f)) || 'react';
      trace.push({ q: 'Pool check', a: `${frameworks[rec].name} excluded by your constraints`, effect: `Fell back to ${frameworks[fallback].name}.` });
      rec = fallback;
    }

    // Trade-off caveats
    if (rec === 'angular' && a.capability === 'library')
      caveats.push('You wanted a UI library, but your other answers point to Angular — expect more structure than a bring-your-own setup.');
    if (rec === 'react' && a.capability === 'everything')
      caveats.push("You wanted everything decided, but your constraints point to React — you'll assemble routing and state yourself.");
    if (rec === 'svelte' && a.ecosystem === 'official')
      caveats.push('Svelte has official Sentry support but relies on community adapters for auth and billing.');
    if (rec === 'vue' && a.backing === 'very')
      caveats.push("Vue is backed by Evan You and VoidZero/Cloudflare — strong independent backing, but not a large corporation like Google or Meta.");

    return { rec, pool, caveats: [...new Set(caveats)], trace };
  }

  function verdict(pickKey, rec) {
    const metaFw = meta[pickKey];
    const pickBase = metaFw ? metaFw.base : pickKey;
    const pickName = metaFw ? metaFw.name : frameworks[pickKey] ? frameworks[pickKey].name : pickKey;

    if (!metaFw && pickKey === rec) {
      return {
        state: 'agreement', pickBase, pickName,
        headline: "Both lead to the same choice — you're on the right track.",
        detail: `Your instinct and the analysis agree on ${frameworks[rec].name}. Proceed with confidence.`,
        reasons: [],
      };
    }
    if (metaFw && pickBase === rec) {
      return {
        state: 'partial', pickBase, pickName,
        headline: 'Your meta framework is built on our recommended base — good alignment.',
        detail: `${pickName} is a meta framework built on ${frameworks[rec].name}. The post recommends a frontend framework; the meta layer is a downstream choice — adopt ${pickName} once you've decided whether you need its server layer.`,
        reasons: [],
      };
    }
    if (metaFw && pickBase !== rec) {
      const caveat = (pickBase === 'svelte' || pickBase === 'solid')
        ? ` ${frameworks[pickBase].name} is a watch-list pick — ${frameworks[pickBase].reason.toLowerCase()}`
        : '';
      return {
        state: 'divergence', pickBase, pickName,
        headline: `Based on your answers, ${frameworks[rec].name} is a stronger fit.`,
        detail: `${pickName} is a meta framework built on ${frameworks[pickBase].name}, not ${frameworks[rec].name}.${caveat} The meta layer is a separate, downstream decision.`,
        reasons: frameworks[rec].bullets.slice(0, 3),
      };
    }
    return {
      state: 'divergence', pickBase, pickName,
      headline: `Based on your answers, ${frameworks[rec].name} is a stronger fit.`,
      detail: `Here's why the analysis points to ${frameworks[rec].name} over ${pickName} for your situation:`,
      reasons: frameworks[rec].bullets.slice(0, 3),
    };
  }

  /* ── Dynamic fragment builders (the only HTML still built at runtime) ── */
  function buildProgress(index, mode) {
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

  function buildCaveats(items) {
    if (!items || !items.length) return '';
    return `<div class="caveats" role="note">${items.map(c =>
      `<p>${ic('triangle-exclamation')}<span>${c}</span></p>`).join('')}</div>`;
  }

  function buildWhy(trace, open) {
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

  function buildNav(root, q) {
    const nm = root.querySelector('.advisor__nav-mount');
    if (!nm) return;
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
    nm.innerHTML = `
      <div class="advisor__nav" role="navigation" aria-label="Question navigation">
        ${backBtn}
        <span class="advisor__hint">${hint}</span>
        ${rightBtn}
      </div>`;
  }

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
      const show = q.id === 'backend' && value === 'other';
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
    const v = verdict(pickKey, result.rec);
    const metaKey = meta[pickKey] ? pickKey : null;
    const cloneCol = fwKey =>
      root.querySelector(`.advisor__parts [data-column="${fwKey}"]`).cloneNode(true);

    const verdictIcon = {
      agreement: 'circle-check', partial: 'code-merge', divergence: 'arrows-split-up-and-left',
    }[v.state] || 'circle-check';

    const reasonsList = v.reasons.length
      ? `<ul class="verdict__reasons">${v.reasons.map(b => `<li><a href="${b.anchor}">${b.text}</a></li>`).join('')}</ul>`
      : '';

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
        <div class="verdict verdict--${v.state}">
          <div class="verdict__icon" aria-hidden="true">${ic(verdictIcon)}</div>
          <div class="verdict__body">
            <p class="verdict__headline">${v.headline}</p>
            <p class="verdict__detail">${v.detail}</p>
            ${reasonsList}
          </div>
        </div>
        <div data-caveats-mount></div>
        <div data-why-mount></div>
        <div class="result__actions">
          <button type="button" class="btn btn-secondary" data-action="copy" data-rec="${result.rec}">${ic('copy')} Copy result</button>
          <button type="button" class="btn btn-primary" data-action="restart">${ic('rotate-left')} Start over</button>
        </div>
      </div>`;
    fillResult(panel, result);
  }

  // Compute the active panel, fill its dynamic bits, and reveal it.
  function setup() {
    const root = getRoot();
    if (!root) return;
    const mode = state.mode;

    // Header restart button (result / oos only)
    const headRestart = root.querySelector('.advisor__head-restart');
    if (headRestart) {
      if (mode === 'result' || mode === 'oos') {
        headRestart.style.display = '';
        headRestart.innerHTML = `<button type="button" class="advisor__restart-btn" data-action="restart" title="Start over" aria-label="Start over">${ic('rotate-left')}</button>`;
      } else {
        headRestart.style.display = 'none';
        headRestart.innerHTML = '';
      }
    }

    // Progress
    const pm = root.querySelector('.advisor__progress-mount');
    if (pm) pm.innerHTML = mode !== 'oos' ? buildProgress(state.index, mode) : '';

    let target;
    if (mode === 'q') {
      const q = questions[state.index];
      target = root.querySelector(`.stage[data-panel="q"][data-step="${state.index}"]`);
      syncQuestion(target, q);
      buildNav(root, q);
    } else if (mode === 'result') {
      const result = recommend(state.answers);
      currentResult = result;
      const hasPick = state.answers.pick && state.answers.pick !== 'none';
      if (hasPick) {
        target = root.querySelector('.stage[data-panel="comparison"]');
        composeComparison(target, result, state.answers.pick);
      } else {
        target = root.querySelector(`.stage[data-panel="result"][data-rec="${result.rec}"]`);
        fillResult(target, result);
      }
      clearNav(root);
    } else {
      target = root.querySelector('.stage[data-panel="oos"]');
      clearNav(root);
    }

    if (target) {
      reveal(target, lastDir);
      if (mode === 'result') animateAdoptionBars(target);
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
    buildNav(root, q);
  }

  function select(qId, value) {
    state.answers = { ...state.answers, [qId]: value };

    if (qId === 'appType' && value === 'mobile-desktop') {
      go('oos', undefined, 'fwd');
      return;
    }
    if (qId === 'backend' && value === 'other') {
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
})();
