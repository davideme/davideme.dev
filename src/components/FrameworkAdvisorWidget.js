// FrameworkAdvisorWidget — widget logic (extracted from the .astro component).
// `advisorData` (questionnaire content + framework facts) is injected by the
// component as a JSON island (<script type="application/json" id="advisor-data">).
// The recommendation algorithm and all DOM building live here.

const advisorData = JSON.parse(
  document.getElementById('advisor-data')?.textContent || '{}'
);

(function () {
  /* ── Icons ───────────────────────────────────────────────── */
  /* Icon cache — populated at mount from @lucide/astro-rendered sprites */
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
    const key = String(name || '').replace(/^fa[bsr]?\s+/, '').replace(/^fa-/, '');
    const inner = ICON_SVGS[key] || ICON_SVGS['ellipsis'] || '';
    return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }

  /* Escape user-supplied text for safe interpolation into HTML attributes/markup. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ── Data from YAML ─────────────────────────────────────── */
  const { frameworks, meta, questions, outOfScope, demos } = advisorData;
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

  /* ── HTML builders ──────────────────────────────────────── */
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

  function buildOptionBtn(opt, selected, layout) {
    const chip = opt.icon ? `<span class="opt__chip">${ic(opt.icon)}</span>` : '';
    const desc = opt.desc ? `<span class="opt__desc">${opt.desc}</span>` : '';
    return `
      <button type="button" role="radio" aria-checked="${selected}"
              tabindex="${selected ? '0' : '-1'}"
              class="opt opt--${layout}${selected ? ' is-sel' : ''}${opt.escape ? ' opt--escape' : ''}"
              data-select="${opt.v}">
        ${chip}
        <span class="opt__text">
          <span class="opt__label">${opt.label}</span>
          ${desc}
        </span>
        <span class="opt__radio" aria-hidden="true">${ic('check')}</span>
      </button>`;
  }

  function buildPhilosophyCard(opt, selected) {
    const lede = opt.lede ? `<span class="pcard__lede">${opt.lede}</span>` : '';
    return `
      <button type="button" role="radio" aria-checked="${selected}"
              tabindex="${selected ? '0' : '-1'}"
              class="pcard${selected ? ' is-sel' : ''}"
              data-select="${opt.v}">
        ${opt.tag ? `<span class="pcard__tag">${opt.tag}</span>` : ''}
        <span class="pcard__label">${opt.label}</span>
        ${lede}
        <span class="pcard__desc">${opt.desc}</span>
        <span class="pcard__check" aria-hidden="true">${ic('check')}</span>
      </button>`;
  }

  function buildScale(opts, value) {
    const stops = opts.map((opt, i) => {
      const sel = value === opt.v;
      const tab = (sel || (!value && i === 0)) ? '0' : '-1';
      return `
        <button type="button" role="radio" aria-checked="${sel}"
                tabindex="${tab}" data-select="${opt.v}"
                class="scale__stop${sel ? ' is-sel' : ''}">
          <span class="scale__dot" aria-hidden="true"></span>
          <span class="scale__label">${opt.label}</span>
          <span class="scale__desc">${opt.desc}</span>
        </button>`;
    }).join('');
    return `<div class="scale" role="radiogroup"><div class="scale__track" aria-hidden="true"></div>${stops}</div>`;
  }

  function buildPicker(q, value) {
    const groups = q.groups.map(g => {
      const chips = g.options.map(opt => {
        const sel = value === opt.v;
        return `<button type="button" role="radio" aria-checked="${sel}" data-select="${opt.v}" class="chip${sel ? ' is-sel' : ''}">${opt.label}</button>`;
      }).join('');
      return `
        <div class="picker__group">
          <span class="picker__glabel">${g.label}</span>
          <div class="picker__chips" role="radiogroup" aria-label="${g.label}">${chips}</div>
        </div>`;
    }).join('');
    const noneVal = q.noneValue || 'none';
    const noneSel = value === noneVal;
    return `
      <div class="picker">
        ${groups}
        <button type="button" data-select="${noneVal}" class="picker__none${noneSel ? ' is-sel' : ''}">${q.noneLabel || 'No preference yet'}</button>
      </div>`;
  }

  function buildQuestion(q, answers, freeText) {
    const value = answers[q.id];
    let body = '';
    if (q.kind === 'options') {
      const cols = q.columns || 1;
      const btns = q.options.map(opt => buildOptionBtn(opt, value === opt.v, 'row')).join('');
      body = `<div class="optgrid optgrid--c${cols}" role="radiogroup" aria-label="${q.title}">${btns}</div>`;
    } else if (q.kind === 'scale') {
      body = buildScale(q.options, value);
    } else if (q.kind === 'cards') {
      const cards = q.options.map(opt => buildPhilosophyCard(opt, value === opt.v)).join('');
      body = `<div class="pgrid" role="radiogroup" aria-label="${q.title}">${cards}</div>`;
    } else if (q.kind === 'picker') {
      body = buildPicker(q, value);
    }
    const showOther = q.id === 'backend' && value === 'other';
    const freeInput = showOther ? `
      <div class="freetext">
        <input type="text" id="fa-freetext" value="${esc(freeText)}"
               placeholder="Tell us what you use (optional) — won't block your result"
               aria-label="Describe your backend stack" />
      </div>` : '';
    return `
      <div class="qstep">
        <div class="qstep__head">
          <span class="eyebrow">${q.eyebrow}</span>
          <h3 class="qstep__title">${q.title}</h3>
          <p class="qstep__sub">${q.sub}</p>
        </div>
        ${body}
        ${freeInput}
      </div>`;
  }

  function buildAdoptionBar(fwKey, metaKey, compact) {
    const fw = frameworks[fwKey];
    const metaFw = metaKey ? meta[metaKey] : null;
    const pct   = fw.usage;
    const AB_MAX = 30;
    const AB_TICKS = [5, 10, 20, 30];
    const width = Math.min(100, (pct / AB_MAX) * 100);
    const fillColor = fw.brand;
    const ticks = AB_TICKS.map(tk =>
      `<span class="adopt__tick" style="left:${(tk/AB_MAX)*100}%"></span>`).join('');
    const tickLabels = AB_TICKS.map(tk =>
      `<span class="adopt__ticklbl" style="left:${(tk/AB_MAX)*100}%">${tk}%</span>`).join('');
    const srLabel = metaFw
      ? `${metaFw.name} is built on ${fw.name} (${pct}% usage)`
      : `Industry adoption — ${fw.name} ${pct}% (Stack Overflow Survey 2025)`;
    const note = metaFw
      ? `<strong style="color:var(--fg-1)">${metaFw.name}</strong> shares ${fw.name}'s adoption — ${fw.usageNote.toLowerCase()}`
      : fw.usageNote;
    const srcLabel = compact ? '' : `<span class="adopt__src">Stack Overflow '25</span>`;
    return `
      <div class="adopt${compact ? ' adopt--compact' : ''}" role="group" aria-label="${srLabel}">
        <div class="adopt__head">
          <span class="adopt__title">Industry adoption</span>
          ${srcLabel}
        </div>
        <div class="adopt__track" aria-hidden="true">
          ${ticks}
          <div class="adopt__fill" data-width="${width}" style="width:0%;background:${fillColor}">
            <span class="adopt__pct" style="color:#fff">${pct}%</span>
          </div>
        </div>
        <div class="adopt__ticks" aria-hidden="true">${tickLabels}</div>
        <p class="adopt__note">${note}</p>
        <span class="sr-only">${srLabel}.</span>
      </div>`;
  }

  function buildBullets(bullets, showAnchors) {
    const items = bullets.map(b => {
      const content = showAnchors
        ? `<a href="${b.anchor}">${b.text}</a>`
        : `<span>${b.text}</span>`;
      return `<li>${ic('circle-check', 'rb-ic')} ${content}</li>`;
    }).join('');
    return `<ul class="rbullets">${items}</ul>`;
  }

  function buildMetaRow(fwKey) {
    const fw = frameworks[fwKey];
    return `
      <div class="rmeta">
        <div class="rmeta__cell"><span class="rmeta__k">Capability</span><span class="rmeta__v">${fw.capability}</span></div>
        <div class="rmeta__cell"><span class="rmeta__k">Ecosystem</span><span class="rmeta__v">${fw.ecosystem}</span></div>
        <div class="rmeta__cell"><span class="rmeta__k">Backing</span><span class="rmeta__v">${fw.backing}</span></div>
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

  function buildFwBadge(fwKey, size) {
    const fw = frameworks[fwKey];
    return `<span class="fwbadge fwbadge--${size || 'lg'}" style="--fw-color:${fw.brand}">
      <span class="fwbadge__dot" aria-hidden="true"></span>
      ${fw.name}
    </span>`;
  }

  function buildSingleResult(result, whyOpen) {
    const { rec, caveats, trace } = result;
    const fw = frameworks[rec];
    return `
      <div class="result" aria-live="polite">
        <div class="result__top">
          <span class="eyebrow">Our recommendation</span>
          <div>${buildFwBadge(rec, 'lg')}</div>
          <p class="result__reason">${fw.reason}</p>
        </div>
        ${buildBullets(fw.bullets, true)}
        ${buildMetaRow(rec)}
        ${buildAdoptionBar(rec, null, false)}
        ${buildCaveats(caveats)}
        ${buildWhy(trace, whyOpen)}
        <div class="result__actions">
          <button type="button" class="btn btn-secondary" data-action="copy" data-rec="${rec}">${ic('copy')} Copy result</button>
          <button type="button" class="btn btn-primary" data-action="restart">${ic('rotate-left')} Start over</button>
        </div>
      </div>`;
  }

  function buildComparisonResult(result, pickKey, whyOpen) {
    const { rec, caveats, trace } = result;
    const v = verdict(pickKey, rec);
    const recFw = frameworks[rec];
    const pickBaseFw = frameworks[v.pickBase];
    const sameColumn = v.state === 'agreement';
    const metaKey = meta[pickKey] ? pickKey : null;

    const verdictIcon = {
      agreement: 'circle-check',
      partial: 'code-merge',
      divergence: 'arrows-split-up-and-left',
    }[v.state] || 'circle-check';

    const reasonItems = v.reasons.map(b =>
      `<li><a href="${b.anchor}">${b.text}</a></li>`).join('');
    const reasonsList = reasonItems ? `<ul class="verdict__reasons">${reasonItems}</ul>` : '';

    const cmpInner = sameColumn ? `
      <div class="cmp cmp--agree">
        <div class="cmp__col cmp__col--rec cmp__col--solo">
          ${buildFwBadge(rec, 'md')}
          <span class="cmp__meta">${recFw.capability} · ${recFw.backing}</span>
          ${buildBullets(recFw.bullets.slice(0, 3), true)}
          ${buildAdoptionBar(rec, null, true)}
        </div>
      </div>` : `
      <div class="cmp">
        <div class="cmp__col cmp__col--pick">
          <span class="cmp__role">Your pick</span>
          ${buildFwBadge(v.pickBase, 'md')}
          ${metaKey ? `<span class="cmp__meta">${v.pickName} — meta framework on ${pickBaseFw.name}</span>` : ''}
          ${buildBullets(pickBaseFw.bullets.slice(0, 3), false)}
          ${buildAdoptionBar(v.pickBase, metaKey, true)}
        </div>
        <div class="cmp__vs" aria-hidden="true"><span>vs</span></div>
        <div class="cmp__col cmp__col--rec">
          <span class="cmp__role cmp__role--rec">Our recommendation</span>
          ${buildFwBadge(rec, 'md')}
          <span class="cmp__meta">${recFw.capability} · ${recFw.backing}</span>
          ${buildBullets(recFw.bullets.slice(0, 3), true)}
          ${buildAdoptionBar(rec, null, true)}
        </div>
      </div>`;

    return `
      <div class="result result--cmp" aria-live="polite">
        <div class="result__top">
          <span class="eyebrow">Your pick vs. our recommendation</span>
        </div>
        ${cmpInner}
        <div class="verdict verdict--${v.state}">
          <div class="verdict__icon" aria-hidden="true">${ic(verdictIcon)}</div>
          <div class="verdict__body">
            <p class="verdict__headline">${v.headline}</p>
            <p class="verdict__detail">${v.detail}</p>
            ${reasonsList}
          </div>
        </div>
        ${buildCaveats(caveats)}
        ${buildWhy(trace, whyOpen)}
        <div class="result__actions">
          <button type="button" class="btn btn-secondary" data-action="copy" data-rec="${rec}">${ic('copy')} Copy result</button>
          <button type="button" class="btn btn-primary" data-action="restart">${ic('rotate-left')} Start over</button>
        </div>
      </div>`;
  }

  function buildOutOfScope() {
    const o = outOfScope;
    const paths = o.paths.map(p =>
      `<div class="oos__path"><span class="oos__pk">${p.label}</span><span class="oos__pt">${p.text}</span></div>`
    ).join('');
    return `
      <div class="result result--oos" aria-live="polite">
        <div class="oos__icon" aria-hidden="true">${ic('compass')}</div>
        <span class="eyebrow">Out of scope</span>
        <h3 class="oos__title">${o.title}</h3>
        <p class="oos__body">${o.body}</p>
        <div class="oos__paths">${paths}</div>
        <div class="result__actions">
          <button type="button" class="btn btn-primary" data-action="restart">${ic('rotate-left')} Start over</button>
        </div>
      </div>`;
  }

  /* ── State machine ──────────────────────────────────────── */
  let state = {
    mode: 'q',      // 'q' | 'result' | 'oos'
    index: 0,
    answers: {},
    freeText: '',
    whyOpen: false,
    copyDone: false,
  };
  let lastDir = 'fwd';
  let busy = false;

  function getRoot() {
    return document.getElementById('framework-advisor-root');
  }

  function animateAdoptionBars(root) {
    root.querySelectorAll('.adopt__fill[data-width]').forEach(el => {
      const w = el.dataset.width;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.width = w + '%';
      }));
    });
  }

  function renderInto(root) {
    const q = questions[Math.min(state.index, TOTAL - 1)];
    const showProgress = state.mode !== 'oos';
    const canContinue = state.mode === 'q' && state.answers[q.id] !== undefined;
    const isOther = state.mode === 'q' && q.id === 'backend' && state.answers.backend === 'other';
    const result = state.mode === 'result' ? recommend(state.answers) : null;

    // Header restart button
    const restartBtn = root.querySelector('.advisor__head-restart');
    if (restartBtn) {
      if (state.mode === 'result' || state.mode === 'oos') {
        restartBtn.style.display = '';
        restartBtn.innerHTML = `<button type="button" class="advisor__restart-btn" data-action="restart" title="Start over" aria-label="Start over">${ic('rotate-left')}</button>`;
      } else {
        restartBtn.style.display = 'none';
        restartBtn.innerHTML = '';
      }
    }

    // Progress
    const pm = root.querySelector('.advisor__progress-mount');
    if (pm) pm.innerHTML = showProgress ? buildProgress(state.index, state.mode) : '';

    // Stage
    const sm = root.querySelector('.advisor__stage-mount');
    if (sm) {
      let stageInner = '';
      if (state.mode === 'q') {
        stageInner = buildQuestion(q, state.answers, state.freeText);
      } else if (state.mode === 'result') {
        const hasPick = state.answers.pick && state.answers.pick !== 'none';
        stageInner = hasPick
          ? buildComparisonResult(result, state.answers.pick, state.whyOpen)
          : buildSingleResult(result, state.whyOpen);
      } else {
        stageInner = buildOutOfScope();
      }
      sm.innerHTML = `<div class="stage enter-${lastDir}"><div class="stage__inner">${stageInner}</div></div>`;
      animateAdoptionBars(sm);
    }

    // Nav
    const nm = root.querySelector('.advisor__nav-mount');
    if (nm) {
      if (state.mode !== 'q') {
        nm.innerHTML = '';
      } else {
        const hint = q.optional ? 'Optional — skip if you\'re open' : 'Pick one to continue';
        const backBtn = state.index === 0
          ? `<span class="navbtn navbtn--spacer" aria-hidden="true"></span>`
          : `<button type="button" class="navbtn navbtn--ghost" data-action="back">${ic('arrow-left')} Back</button>`;
        let rightBtn = '';
        if (q.optional) {
          rightBtn = `<button type="button" class="navbtn navbtn--ghost" data-action="skip">${ic('arrow-right')} Skip</button>`;
        } else if (isOther || canContinue) {
          rightBtn = `<button type="button" class="navbtn navbtn--solid" data-action="next"${canContinue ? '' : ' disabled'}>Continue ${ic('arrow-right')}</button>`;
        } else {
          rightBtn = `<span class="navbtn navbtn--spacer" aria-hidden="true"></span>`;
        }
        nm.innerHTML = `
          <div class="advisor__nav" role="navigation" aria-label="Question navigation">
            ${backBtn}
            <span class="advisor__hint">${hint}</span>
            ${rightBtn}
          </div>`;
      }
    }

    attachListeners(root);
  }

  function go(nextMode, nextIndex, dir) {
    if (busy) return;
    lastDir = dir || 'fwd';
    const dur = (REDUCE) ? 0 : 200;
    if (dur === 0) {
      state.mode = nextMode;
      state.index = nextIndex !== undefined ? nextIndex : state.index;
      state.whyOpen = false;
      const root = getRoot();
      if (root) renderInto(root);
      return;
    }
    busy = true;
    const root = getRoot();
    const stageMnt = root && root.querySelector('.advisor__stage-mount');
    const stageEl  = stageMnt && stageMnt.querySelector('.stage');
    if (stageEl) {
      stageEl.classList.remove('enter-fwd', 'enter-back');
      stageEl.classList.add('exit-' + lastDir);
    }
    setTimeout(() => {
      state.mode  = nextMode;
      state.index = nextIndex !== undefined ? nextIndex : state.index;
      state.whyOpen = false;
      busy = false;
      const r = getRoot();
      if (r) renderInto(r);
    }, dur);
  }

  function select(qId, value) {
    state.answers = { ...state.answers, [qId]: value };

    if (qId === 'appType' && value === 'mobile-desktop') {
      go('oos', undefined, 'fwd');
      return;
    }
    if (qId === 'backend' && value === 'other') {
      const root = getRoot();
      if (root) renderInto(root); // re-render to show free-text input
      return;
    }

    const advance = () => {
      if (state.index >= TOTAL - 1) go('result', undefined, 'fwd');
      else go('q', state.index + 1, 'fwd');
    };
    if (REDUCE) advance();
    else setTimeout(advance, 260);
  }

  function restart() {
    state = { mode: 'q', index: 0, answers: {}, freeText: '', whyOpen: false, copyDone: false };
    go('q', 0, 'back');
  }

  function attachListeners(root) {
    // Delegated click handler
    root.addEventListener('click', onRootClick, { once: true });

    // Free-text input
    const ft = root.querySelector('#fa-freetext');
    if (ft) {
      ft.addEventListener('input', e => { state.freeText = e.target.value; });
      ft.addEventListener('click', e => e.stopPropagation());
    }

    // Arrow-key roving for radiogroups
    root.querySelectorAll('[role="radiogroup"]').forEach(group => {
      const btns = Array.from(group.querySelectorAll('[role="radio"]'));
      btns.forEach((btn, i) => {
        btn.addEventListener('keydown', e => {
          const next = ['ArrowRight', 'ArrowDown'].includes(e.key);
          const prev = ['ArrowLeft', 'ArrowUp'].includes(e.key);
          if (!next && !prev) return;
          e.preventDefault();
          let ni = i + (next ? 1 : -1);
          if (ni < 0) ni = btns.length - 1;
          if (ni >= btns.length) ni = 0;
          btns[ni] && btns[ni].focus();
        });
      });
    });
  }

  function onRootClick(e) {
    const target = e.target.closest('[data-select]');
    const action = e.target.closest('[data-action]');

    if (target) {
      const q = questions[state.index];
      select(q.id, target.dataset.select);
      return;
    }
    if (action) {
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
        const root = getRoot();
        if (root) renderInto(root);
      } else if (act === 'copy') {
        const fwKey = action.dataset.rec;
        const fw = frameworks[fwKey];
        const text = `Framework Advisor recommends ${fw.name} — ${fw.reason}`;
        const fin = () => {
          action.innerHTML = `${ic('check')} Copied`;
          setTimeout(() => {
            action.innerHTML = `${ic('copy')} Copy result`;
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(fin).catch(fin);
        } else { fin(); }
      }
      return;
    }

    // Re-attach listener if nothing handled (click on inert area)
    const root = getRoot();
    if (root) root.addEventListener('click', onRootClick, { once: true });
  }

  /* ── Mount ──────────────────────────────────────────────── */
  function mount() {
    const root = getRoot();
    if (!root) return;
    initIcons();
    renderInto(root);
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
