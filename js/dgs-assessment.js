/* ============================================================
   GROWTH HUB — AI READINESS ASSESSMENT (Interactive)
   Vanilla JS: 15-question scored quiz across 5 dimensions, an
   email gate before results, and dimension-mapped recommendations
   and solutions. No external dependencies, no page reload.
   ============================================================ */

(function () {
  const app = document.querySelector('[data-asm-app]');
  if (!app) return;

  /* Lead capture is the same GHL "form_embed.js" iframe widget used for
     the footer newsletter form (see includes/footer.html), just pointed
     at this assessment's own GHL form and re-created here on the fly.
     Swap in the real form URL (Sites -> Forms -> the AI Readiness form
     -> Add Form -> "Embed" tab, use the `src` of its <iframe>) and the
     matching form ID: both live on the widget domain, e.g.
     "https://api.faithph.ai/widget/form/<formId>". */
  const GHL_FORM_LINK = 'https://api.faithph.ai/widget/form/2BTsssxbvTtOfRnZrAzw';
  const GHL_FORM_ID = '2BTsssxbvTtOfRnZrAzw';
  const GHL_EMBED_SCRIPT = 'https://api.faithph.ai/js/form_embed.js';

  /* Used to build absolute URLs for ai_solution_*_url below — GHL's email
     workflow needs a real link, not a site-relative one. */
  const SITE_ORIGIN = 'https://www.digitalgrowthscale.com';

  const DIMENSIONS = [
    { id: 'leadership', label: 'Leadership' },
    { id: 'technology', label: 'Technology' },
    { id: 'people', label: 'People' },
    { id: 'data', label: 'Data' },
    { id: 'governance', label: 'Governance' }
  ];

  const QUESTIONS = [
    { id: 'l1', dim: 'leadership', text: "Our leadership team has agreed on specific business outcomes we want AI to drive, not just a general interest in using it." },
    { id: 'l2', dim: 'leadership', text: "At least one senior leader is directly accountable for AI results, not just IT or an outside vendor." },
    { id: 'l3', dim: 'leadership', text: "We've set aside real budget for AI initiatives, separate from general software spend." },

    { id: 't1', dim: 'technology', text: "Our core systems (CRM, finance, operations) can be connected to new tools without a major rebuild." },
    { id: 't2', dim: 'technology', text: "We know which AI features already exist inside the tools we're paying for today." },
    { id: 't3', dim: 'technology', text: "We have a clear process for evaluating and approving new software before it's purchased." },

    { id: 'p1', dim: 'people', text: "Our team has the skills to use AI tools day to day, or a concrete plan to build them." },
    { id: 'p2', dim: 'people', text: "Employees feel safe raising concerns about how AI might change their role." },
    { id: 'p3', dim: 'people', text: "We've run at least one small AI pilot with a specific team, not just a company-wide announcement." },

    { id: 'd1', dim: 'data', text: "Our core business data lives in structured systems, not scattered across spreadsheets and inboxes." },
    { id: 'd2', dim: 'data', text: "We trust our data enough to make decisions from it without double-checking manually." },
    { id: 'd3', dim: 'data', text: "We have clear rules for who can access, edit, and export sensitive company data." },

    { id: 'g1', dim: 'governance', text: "We have a written policy on acceptable use of AI tools, even a simple one." },
    { id: 'g2', dim: 'governance', text: "We know which regulations, such as data privacy or industry-specific rules, apply to how we use AI." },
    { id: 'g3', dim: 'governance', text: "Someone reviews AI-generated work before it reaches customers or goes into official records." }
  ];

  /* ─── Qualifying-answer scoring (0-15, for the webhook payload) ───
     Each question is answered on the existing 1-5 agreement scale (see
     the on-screen buttons). A "qualifying" answer, worth 1 point toward
     ai_score, is one where the respondent agrees strongly enough that
     the statement is basically true for their business today.
     QUALIFYING_THRESHOLD is the default cutoff (1-5); override it per
     question via an optional `qualifyingThreshold` field on that
     question object if a specific statement should need a different
     bar later — nothing else in the scoring code needs to change. */
  const QUALIFYING_THRESHOLD = 4;

  function isQualifying(question, value) {
    const threshold = question.qualifyingThreshold || QUALIFYING_THRESHOLD;
    return typeof value === 'number' && value >= threshold;
  }

  function computeAiScore() {
    return QUESTIONS.reduce(function (total, q) {
      return total + (isQualifying(q, state.answers[q.id]) ? 1 : 0);
    }, 0);
  }

  const LEVELS = [
    {
      name: 'Foundation',
      max: 20,
      copy: "You're at the starting point, and that's a normal place to be. Most of your AI readiness gaps are foundational: unclear ownership, inconsistent data, or processes that live in people's heads instead of documented systems. These are fixable in weeks, not years, and fixing them first will make every future AI investment work better.",
      move: "Document your core processes before automating any of them."
    },
    {
      name: 'Standardized',
      max: 40,
      copy: "You have some of the basics in place, likely a few documented processes and a bit of leadership interest, but the pieces aren't connected yet. AI tools will work in isolated pockets rather than across the business until you tighten up data consistency and give someone clear ownership of results.",
      move: "Put your standard processes into a reporting rhythm so you see deviations without asking."
    },
    {
      name: 'Connected',
      max: 60,
      copy: "Your business has real building blocks: reasonably clean data, some leadership buy-in, and at least one team that's tested something new. You're ready to move from experiments to a coordinated rollout, provided you close the specific gaps your lowest-scoring dimension is flagging.",
      move: "Automate the repetitive, high-volume tasks now that the data behind them is clean."
    },
    {
      name: 'Automated',
      max: 80,
      copy: "You're ahead of most businesses your size. Systems talk to each other, people are engaged rather than anxious, and leadership has skin in the game. From here, the highest-leverage moves are narrower and more technical: tightening governance and squeezing more value out of the tools you already have.",
      move: "Introduce AI decision-support into your highest-value workflows."
    },
    {
      name: 'AI-Optimized',
      max: 100,
      copy: "You've built the organizational conditions that let AI actually compound: clean data, accountable owners, engaged people, and guardrails that let you move fast without breaking things. The work now is less about readiness and more about sequencing your next investments for maximum return.",
      move: "Shift from building to tuning, running continuous optimization cycles."
    }
  ];

  const RECOMMENDATIONS = {
    leadership: "Get one senior leader to own AI outcomes explicitly, with a name attached, not a department.",
    technology: "Map which of your current systems can already talk to each other before buying anything new.",
    people: "Run one small, well-scoped AI pilot with a single team instead of a company-wide rollout.",
    data: "Spend a week auditing where your core data actually lives before evaluating any new tool.",
    governance: "Write a one-page acceptable-use policy for AI tools. It doesn't need to be perfect, it needs to exist."
  };

  /* Short imperative titles paired above each RECOMMENDATIONS sentence
     in the priority list (numbered title + one-line explanation). */
  const PRIORITY_TITLES = {
    leadership: "Assign clear ownership of AI outcomes",
    technology: "Connect core systems before buying more tools",
    people: "Strengthen AI capability across key roles",
    data: "Consolidate and clean your core business data",
    governance: "Establish clearer governance and responsible-use practices"
  };

  /* What "strong" looks like per dimension, condensed from the "Good
     looks like..." lines on the Methodology page's AI Readiness
     Framework section, for the results screen's Foundation Strengths
     column. */
  const STRENGTH_BLURBS = {
    leadership: "Clear leadership buy-in and ownership of AI outcomes.",
    technology: "Core systems connected with minimal manual workarounds.",
    people: "Team has real AI skill, or a concrete plan to build it.",
    data: "Strong operational foundation of clean, structured data.",
    governance: "Responsible-use guardrails already taking shape."
  };

  /* What still needs work per dimension, for the Gap Areas column. */
  const GAP_BLURBS = {
    leadership: "Ownership of AI outcomes still needs a name attached.",
    technology: "Systems integration needs work before scaling further.",
    people: "AI capability needs strengthening across key roles.",
    data: "Core data still needs consolidating before it can be trusted.",
    governance: "Responsible-use structure needs attention."
  };

  const SOLUTIONS = {
    leadership: { name: 'Growth Systems Audit', href: '/solutions/growth-systems-audit', reason: "Get an independent, structured view of exactly where your leadership team should focus first." },
    technology: { name: 'Growth OS Setup', href: '/solutions/growth-os-setup', reason: "Replace scattered tools with one connected operating system built around how you actually work." },
    people: { name: 'AI Learning & Training', href: '/solutions/corporate-training', reason: "Build real AI skill and confidence across your team, not just awareness." },
    data: { name: 'Intelligent Automation', href: '/solutions/intelligent-automation', reason: "Automation forces the data cleanup work most businesses keep postponing." },
    governance: { name: 'Ops Support (HR, Legal & Compliance)', href: '/solutions/eor-hr-support', reason: "Get compliance, legal, and HR guardrails handled by people who do this daily." }
  };

  const ARROW_RIGHT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>';

  const dimLabel = (id) => DIMENSIONS.find((d) => d.id === id).label;

  /* ─── State ─── */
  const state = {
    index: 0,
    answers: {}
  };

  /* Set by finishQuiz() (via buildResults()) the moment all 15 questions
     are answered, so the GHL iframe's query params and the results
     screen both render from the exact same computation, not two
     separate calls to buildResults() that happen to agree. */
  let lastResults = null;

  /* ─── DOM refs ─── */
  /* data-asm-progress lives outside .dgs-asm-card (it's the bar above
     the card, a sibling, not a descendant), so it has to be looked up
     from the document, not scoped to `app`. */
  const progressFill = document.querySelector('[data-asm-progress]');
  const screens = {
    start: app.querySelector('[data-asm-screen="start"]'),
    question: app.querySelector('[data-asm-screen="question"]'),
    email: app.querySelector('[data-asm-screen="email"]'),
    results: app.querySelector('[data-asm-screen="results"]')
  };

  const startBtn = app.querySelector('[data-asm-start]');
  const qDim = app.querySelector('[data-asm-q-dim]');
  const qProgress = app.querySelector('[data-asm-q-progress]');
  const qText = app.querySelector('[data-asm-q-text]');
  const qScale = app.querySelector('[data-asm-q-scale]');
  const qBack = app.querySelector('[data-asm-q-back]');

  const iframeSlot = app.querySelector('[data-asm-iframe-slot]');
  const continueBtn = app.querySelector('[data-asm-continue]');

  const scoreNum = app.querySelector('[data-asm-score-num]');
  const levelPill = app.querySelector('[data-asm-level-pill]');
  const interpretation = app.querySelector('[data-asm-interpretation]');
  const maturityTrack = app.querySelector('[data-asm-maturity]');
  const dimsWrap = app.querySelector('[data-asm-dims]');
  const strengthsWrap = app.querySelector('[data-asm-strengths]');
  const gapsWrap = app.querySelector('[data-asm-gaps]');
  const recList = app.querySelector('[data-asm-rec-list]');
  const solutionsGrid = app.querySelector('[data-asm-solutions]');
  const nextWrap = app.querySelector('[data-asm-next-wrap]');
  const currentLevelEl = app.querySelector('[data-asm-current-level]');
  const nextLevelEl = app.querySelector('[data-asm-next-level]');
  const nextCopyEl = app.querySelector('[data-asm-next-copy]');
  const restartBtn = app.querySelector('[data-asm-restart]');

  /* If any required element is missing (bad markup edit, wrong file
     path, etc.) log exactly which one instead of silently crashing
     and killing every listener registered after it. */
  const REQUIRED = {
    progressFill, startBtn, qDim, qProgress, qText, qScale, qBack,
    iframeSlot, continueBtn, scoreNum, levelPill,
    interpretation, maturityTrack, dimsWrap, strengthsWrap, gapsWrap,
    recList, solutionsGrid, nextWrap, currentLevelEl, nextLevelEl,
    nextCopyEl, restartBtn
  };
  const missingScreens = Object.keys(screens).filter((key) => !screens[key]);
  const missing = Object.keys(REQUIRED).filter((key) => !REQUIRED[key]).concat(missingScreens.map((k) => 'screen:' + k));
  if (missing.length) {
    console.error('[dgs-assessment] Missing element(s), check the page markup: ' + missing.join(', '));
    return;
  }

  /* js/main.js runs Lenis with autoRaf:true, which keeps driving the
     native scroll position from its own internal virtual scroll state
     every frame. A raw window.scrollTo() gets fought and pulled back,
     so restart's "scroll to top" has to go through Lenis's own
     scrollTo() once Lenis exists (see js/dgs-growth-article.js's
     scrollToTarget() for the same fix). Falls back to native
     window.scrollTo when Lenis isn't on the page. */
  function scrollToTop() {
    if (window.dgsLenis && typeof window.dgsLenis.scrollTo === 'function') {
      window.dgsLenis.scrollTo(0);
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showScreen(name) {
    Object.keys(screens).forEach((key) => {
      screens[key].hidden = key !== name;
    });
  }

  function setProgress(pct) {
    progressFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  /* ─── Question rendering ─── */
  function renderQuestion(i) {
    const q = QUESTIONS[i];
    const dimIndex = DIMENSIONS.findIndex((d) => d.id === q.dim);

    qDim.textContent = 'Dimension ' + (dimIndex + 1) + ' of 5: ' + dimLabel(q.dim);
    qProgress.textContent = 'Question ' + (i + 1) + ' of ' + QUESTIONS.length;
    qText.textContent = q.text;

    const selected = state.answers[q.id];
    qScale.querySelectorAll('[data-asm-scale-btn]').forEach((btn) => {
      const val = Number(btn.getAttribute('data-value'));
      btn.classList.toggle('is-selected', val === selected);
      btn.setAttribute('aria-pressed', val === selected ? 'true' : 'false');
    });

    qBack.disabled = i === 0;
    setProgress((i / QUESTIONS.length) * 100);
    showScreen('question');
  }

  function selectAnswer(value) {
    const q = QUESTIONS[state.index];
    state.answers[q.id] = value;
    renderQuestion(state.index);

    window.setTimeout(function () {
      if (state.index < QUESTIONS.length - 1) {
        state.index += 1;
        renderQuestion(state.index);
      } else {
        finishQuiz();
      }
    }, 220);
  }

  /* ─── Finish: lead-capture gate before results ───────────────────
     All 15 questions are answered — compute the full result set once
     (score, level, per-dimension percentages, strengths/gaps/priorities/
     solutions), inject the GHL form with all of it appended as query
     params, and show the email screen. The visitor only reaches
     renderResults() after submitting that form and clicking "View My
     Results" (see the continueBtn listener below), and it reuses this
     same `lastResults` rather than recomputing. */
  function finishQuiz() {
    setProgress(100);
    lastResults = buildResults();
    injectLeadCaptureIframe(lastResults);
    continueBtn.hidden = true;
    showScreen('email');
  }

  /* Builds the GHL form iframe with the respondent's full result set
     appended to its URL as query params, so GHL's email workflow can
     populate a result template without any hardcoded front-end routing.
     `new URL(...).searchParams` (not manual string concatenation) is
     what handles sanitizing/encoding every value here — names and copy
     blurbs can contain spaces, ampersands, apostrophes, etc., and
     .set() encodes each one correctly without risk of an unescaped
     character breaking the query string or the embed script's own
     parsing of it. */
  function injectLeadCaptureIframe(results) {
    iframeSlot.innerHTML = '';

    const totalScore = results.totalScore;
    const levelIndex = results.levelIndex;
    const perDimScore = results.perDimScore;
    const weakest = results.weakest;     // 3 ids, ascending: lowest score first
    const strongest = results.strongest; // 2 ids, descending: highest score first

    const url = new URL(GHL_FORM_LINK);
    const params = url.searchParams;

    /* 1 — Overall score, level tag, and per-dimension percentages */
    params.set('ai_readiness_score', String(totalScore));
    params.set('ai_readiness_level', 'Level ' + levelIndex);
    DIMENSIONS.forEach(function (d) {
      params.set('ai_score_' + d.id, String(perDimScore[d.id]));
    });

    /* 2 — Strengths: top 2 highest-scoring dimensions */
    strongest.forEach(function (dimId, i) {
      const n = i + 1;
      params.set('ai_strength_' + n + '_name', dimLabel(dimId));
      params.set('ai_strength_' + n + '_copy', STRENGTH_BLURBS[dimId]);
    });

    /* 3 — Gaps: top 2 lowest-scoring dimensions */
    weakest.slice(0, 2).forEach(function (dimId, i) {
      const n = i + 1;
      params.set('ai_gap_' + n + '_name', dimLabel(dimId));
      params.set('ai_gap_' + n + '_copy', GAP_BLURBS[dimId]);
    });

    /* 4 — Priorities & 5 — Solutions: top 3 lowest-scoring dimensions,
       same weakest[] driving both, same as the results screen. */
    weakest.forEach(function (dimId, i) {
      const n = i + 1;
      params.set('ai_priority_' + n + '_title', PRIORITY_TITLES[dimId]);
      params.set('ai_priority_' + n + '_copy', RECOMMENDATIONS[dimId]);
      params.set('ai_solution_' + n + '_name', SOLUTIONS[dimId].name);
      params.set('ai_solution_' + n + '_url', SITE_ORIGIN + SOLUTIONS[dimId].href);
    });

    const src = url.toString();
    const widgetId = 'inline-dgsAiReadinessResult';

    /* No fixed height here: GHL's embed script resizes the iframe to
       fit its actual content via postMessage. "height:100%" would just
       stretch it to fill the wrapper instead of letting that happen,
       which is exactly what left a big empty gap under a short form. */
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.style.cssText = 'width:100%;border:none;border-radius:8px';
    iframe.id = widgetId;
    iframe.setAttribute('data-layout', "{'id':'INLINE'}");
    iframe.setAttribute('data-trigger-type', 'alwaysShow');
    iframe.setAttribute('data-trigger-value', '');
    iframe.setAttribute('data-activation-type', 'alwaysActivated');
    iframe.setAttribute('data-activation-value', '');
    iframe.setAttribute('data-deactivation-type', 'neverDeactivate');
    iframe.setAttribute('data-deactivation-value', '');
    iframe.setAttribute('data-form-name', 'AI Readiness Assessment - Results');
    iframe.setAttribute('data-height', '432');
    iframe.setAttribute('data-layout-iframe-id', widgetId);
    iframe.setAttribute('data-form-id', GHL_FORM_ID);
    iframe.title = 'AI Readiness Assessment - Results';
    iframeSlot.appendChild(iframe);

    /* form_embed.js only wires up iframes present when it first runs
       (it's already loaded once, globally, for the footer's own form).
       Re-appending a fresh copy makes it rescan the DOM and pick up
       this dynamically-injected one too. */
    const script = document.createElement('script');
    script.src = GHL_EMBED_SCRIPT;
    iframeSlot.appendChild(script);

    continueBtn.hidden = false;
  }

  continueBtn.addEventListener('click', function () {
    renderResults(lastResults || buildResults());
  });

  qScale.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-asm-scale-btn]');
    if (!btn) return;
    selectAnswer(Number(btn.getAttribute('data-value')));
  });

  qBack.addEventListener('click', function () {
    if (state.index === 0) return;
    state.index -= 1;
    renderQuestion(state.index);
  });

  startBtn.addEventListener('click', function () {
    state.index = 0;
    renderQuestion(0);
  });

  /* ─── Scoring ─── */
  function computeScores() {
    const perDim = {};
    DIMENSIONS.forEach((d) => { perDim[d.id] = { raw: 0, count: 0 }; });

    let rawTotal = 0;
    QUESTIONS.forEach((q) => {
      const val = state.answers[q.id] || 3;
      rawTotal += val;
      perDim[q.dim].raw += val;
      perDim[q.dim].count += 1;
    });

    const totalScore = Math.round(((rawTotal - QUESTIONS.length) / (QUESTIONS.length * 4)) * 100);

    const perDimScore = {};
    DIMENSIONS.forEach((d) => {
      const min = perDim[d.id].count;
      const max = perDim[d.id].count * 5;
      perDimScore[d.id] = Math.round(((perDim[d.id].raw - min) / (max - min)) * 100);
    });

    return { totalScore, perDimScore };
  }

  function levelFor(score) {
    for (let i = 0; i < LEVELS.length; i++) {
      if (score <= LEVELS[i].max) return { index: i + 1, level: LEVELS[i] };
    }
    return { index: LEVELS.length, level: LEVELS[LEVELS.length - 1] };
  }

  function weakestDimensions(perDimScore) {
    return DIMENSIONS
      .map((d) => ({ id: d.id, score: perDimScore[d.id] }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((d) => d.id);
  }

  /* Same shape as weakestDimensions, sorted the other way, for the
     "Foundation Strengths" column. Purely additive: it reads the same
     perDimScore weakestDimensions already computes from the existing
     scoring math, it doesn't change how any score is calculated. */
  function strongestDimensions(perDimScore, n) {
    return DIMENSIONS
      .map((d) => ({ id: d.id, score: perDimScore[d.id] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n || 2)
      .map((d) => d.id);
  }

  function buildResults() {
    const { totalScore, perDimScore } = computeScores();
    const { index, level } = levelFor(totalScore);
    const weakest = weakestDimensions(perDimScore);
    const strongest = strongestDimensions(perDimScore, 2);
    return { totalScore: totalScore, levelIndex: index, level: level, weakest: weakest, strongest: strongest, perDimScore: perDimScore };
  }

  function renderResults(results) {
    const totalScore = results.totalScore;
    const index = results.levelIndex;
    const level = results.level;
    const weakest = results.weakest;
    const strongest = results.strongest;
    const perDimScore = results.perDimScore;

    /* 02 — Primary score */
    scoreNum.innerHTML = totalScore + '<span>/100</span>';
    levelPill.innerHTML =
      '<span class="dgs-asmres-level-num">Level ' + index + '</span>' +
      '<span class="dgs-asmres-level-name">' + level.name + '</span>';
    interpretation.textContent = level.copy;

    /* 03 — Maturity model: all five levels rendered every time, the
       respondent's actual level (levelFor) flagged as current. */
    maturityTrack.innerHTML = '';
    LEVELS.forEach(function (lvl, i) {
      const stepNum = i + 1;
      const isCurrent = stepNum === index;
      const step = document.createElement('div');
      step.className = 'dgs-asmres-mat-step' + (isCurrent ? ' is-current' : '');
      step.setAttribute('data-level', String(stepNum));
      step.innerHTML =
        (isCurrent ? '<span class="dgs-asmres-mat-tag">Current</span>' : '') +
        '<span class="dgs-asmres-mat-code">L' + stepNum + '</span>' +
        '<span class="dgs-asmres-mat-name">' + lvl.name + '</span>';
      maturityTrack.appendChild(step);
    });

    /* 04 — Readiness dimensions, actual per-dimension scores, lowest
       flagged (not with amber, which stays reserved for the primary
       CTA per brand rule). */
    dimsWrap.innerHTML = '';
    DIMENSIONS.forEach(function (d, i) {
      const score = perDimScore[d.id];
      const isWeakest = weakest[0] === d.id;
      const block = document.createElement('div');
      block.className = 'dgs-asmres-dim' + (isWeakest ? ' is-weakest' : '');
      block.innerHTML =
        (isWeakest ? '<span class="dgs-asmres-dim-flag">Lowest</span>' : '') +
        '<span class="dgs-asmres-dim-name">' + d.label + '</span>' +
        '<span class="dgs-asmres-dim-score">' + score + '%</span>' +
        '<div class="dgs-asmres-dim-meter"><span style="width:' + Math.max(0, Math.min(100, score)) + '%"></span></div>';
      dimsWrap.appendChild(block);

      if (i < DIMENSIONS.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'dgs-asmres-dim-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.innerHTML = ARROW_RIGHT_SVG;
        dimsWrap.appendChild(arrow);
      }
    });

    /* 05 — Strengths vs gaps */
    strengthsWrap.innerHTML = strongest.map(function (dimId) {
      return '<div class="dgs-asmres-sg-item"><span class="dgs-asmres-sg-dim">' + dimLabel(dimId) + '</span><p>' + STRENGTH_BLURBS[dimId] + '</p></div>';
    }).join('');

    gapsWrap.innerHTML = weakest.slice(0, 2).map(function (dimId) {
      return '<div class="dgs-asmres-sg-item"><span class="dgs-asmres-sg-dim">' + dimLabel(dimId) + '</span><p>' + GAP_BLURBS[dimId] + '</p></div>';
    }).join('');

    /* 06 — Priorities, numbered, driven by the same three weakest
       dimensions and the same RECOMMENDATIONS copy as before. */
    recList.innerHTML = '';
    weakest.forEach(function (dimId, i) {
      const num = i + 1 < 10 ? '0' + (i + 1) : String(i + 1);
      const card = document.createElement('div');
      card.className = 'dgs-asmres-priority';
      card.innerHTML =
        '<span class="dgs-asmres-priority-num">' + num + '</span>' +
        '<div class="dgs-asmres-priority-body">' +
          '<h4 class="dgs-asmres-priority-title">' + PRIORITY_TITLES[dimId] + '</h4>' +
          '<p class="dgs-asmres-priority-desc">' + RECOMMENDATIONS[dimId] + '</p>' +
        '</div>';
      recList.appendChild(card);
    });

    /* Recommended solutions, same dimension-to-solution mapping, shown
       as .dgs-promise-link CTAs — same component as "Read More" /
       "Apply for Position" on careers.html — rather than a card grid. */
    solutionsGrid.innerHTML = '';
    weakest.forEach(function (dimId) {
      const sol = SOLUTIONS[dimId];
      const link = document.createElement('a');
      link.className = 'dgs-asmres-solution-link dgs-promise-link';
      link.href = sol.href;
      link.title = sol.reason;
      link.innerHTML = sol.name + '<span class="dgs-btn-icon">' + ARROW_RIGHT_SVG + '</span>';
      solutionsGrid.appendChild(link);
    });

    /* 07 — Next maturity step: current level's "move" copy carries the
       respondent from `level` to the next entry in LEVELS. At the top
       of the model there is no next step, so that half collapses. */
    currentLevelEl.textContent = 'L' + index + ' — ' + level.name.toUpperCase();
    if (index < LEVELS.length) {
      const next = LEVELS[index];
      nextLevelEl.textContent = 'L' + (index + 1) + ' — ' + next.name.toUpperCase();
      nextCopyEl.textContent = level.move;
      nextWrap.classList.remove('is-maxed');
    } else {
      nextLevelEl.textContent = '';
      nextCopyEl.textContent = "You've reached the top of the model. From here, the work is tuning and compounding what you've already built.";
      nextWrap.classList.add('is-maxed');
    }

    showScreen('results');
  }

  restartBtn.addEventListener('click', function () {
    state.index = 0;
    state.answers = {};
    lastResults = null;
    iframeSlot.innerHTML = '';
    continueBtn.hidden = true;
    setProgress(0);
    showScreen('start');
    scrollToTop();
  });
})();
