// Pure recommendation algorithm — no DOM, no state, no side-effects.
// Imported by FrameworkAdvisorWidget.js; can also be unit-tested in isolation.

const PREF_ORDER = ['react', 'vue', 'angular', 'svelte', 'solid'];
const JVM_DOTNET  = ['java', 'kotlin', 'csharp'];

export function recommend(a, { frameworks }) {
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

export function verdict(pickKey, rec, { frameworks, meta }) {
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
