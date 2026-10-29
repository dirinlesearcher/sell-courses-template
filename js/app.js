/* AURUM — config-driven landing page */
"use strict";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
};
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function boot() {
  let config;
  try {
    const res = await fetch("data/config.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    config = await res.json();
  } catch (err) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<p style="padding:4rem;text-align:center">Не вдалося завантажити data/config.json (${esc(err.message)})</p>`
    );
    return;
  }

  initTheme(config.theme);
  renderMeta(config.site);
  renderNav(config.navigation);
  renderHero(config.hero);
  renderAuthor(config.author);
  renderCourse(config.course);
  initCalculator(config.calculator);
  initQuestionnaire(config.questionnaire, config.contact);
  renderTestimonials(config.testimonials);
  initContact(config.contact);
  renderFooter(config.footer);
  injectAnalytics(config.analytics);
  initHeaderScroll();
  initRouter(config.routes);
}

/* ---------------- meta ---------------- */
function renderMeta(site) {
  document.title = site.title;
  document.documentElement.lang = site.language || "uk";
  $('meta[name="description"]').setAttribute("content", site.description);
  $("#brand-text").textContent = site.brand;
  $(".brand-mark").src = site.logo;
}

/* ---------------- theme ---------------- */
function initTheme(themeCfg = {}) {
  const key = themeCfg.storageKey || "aurum-theme";
  const stored = localStorage.getItem(key);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const initial = stored || themeCfg.default || (prefersLight ? "light" : "dark");
  document.documentElement.dataset.theme = initial;

  $("#theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(key, next);
    document.dispatchEvent(new CustomEvent("themechange"));
  });
}

/* ---------------- nav ---------------- */
const pageHref = (page) => `#/${page}`;

function renderNav(items) {
  const nav = $("#main-nav");
  items.forEach(({ id, label }) => {
    const a = el("a", "", esc(label));
    a.href = pageHref(id);
    a.dataset.page = id;
    nav.appendChild(a);
  });

  const burger = $("#nav-burger");
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", () => {
    nav.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  });
}

/* ---------------- router: one page visible at a time ---------------- */
function initRouter(routes = {}) {
  const sections = $$("main [data-page]");
  const pages = new Set(sections.map((s) => s.dataset.page));
  const home = routes.home || "home";
  const aliases = routes.aliases || {};
  const links = $$("#main-nav a");

  function resolve() {
    let raw;
    try {
      raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    } catch (_) {
      return home;
    }
    const page = aliases[raw] || raw;
    return pages.has(page) ? page : home;
  }

  function show() {
    const page = resolve();
    let first = true;
    sections.forEach((s) => {
      const on = s.dataset.page === page;
      s.hidden = !on;
      s.classList.toggle("page-top", on && first);
      if (on) first = false;
    });
    links.forEach((l) => {
      const on = l.dataset.page === page;
      l.classList.toggle("active", on);
      if (on) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
    scrollTo({ top: 0, behavior: "instant" });
    document.dispatchEvent(new CustomEvent("pagechange", { detail: { page } }));
  }

  addEventListener("hashchange", show);
  show();
}

function initHeaderScroll() {
  const header = $("#site-header");
  addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 8), { passive: true });
}

/* ---------------- hero ---------------- */
function ctaButton({ label, target }, solid) {
  const a = el("a", `btn ${solid ? "btn-solid" : ""}`, esc(label));
  a.href = pageHref(target);
  return a;
}

function renderHero(hero) {
  $("#hero-eyebrow").textContent = hero.eyebrow;
  $("#hero-title").innerHTML = hero.title; // trusted config markup (e.g. <em>)
  $("#hero-subtitle").textContent = hero.subtitle;
  $("#hero-ctas").append(ctaButton(hero.primaryCta, true), ctaButton(hero.secondaryCta, false));

  const stats = $("#hero-stats");
  hero.stats.forEach(({ value, label }) => {
    const wrap = el("div");
    wrap.append(el("dt", "", esc(value)), el("dd", "", esc(label)));
    stats.appendChild(wrap);
  });
}

/* ---------------- author ---------------- */
function renderAuthor(author) {
  $("#author-title").textContent = author.title;
  $("#author-name").textContent = author.name;
  $("#author-role").textContent = author.role;
  const img = $("#author-photo");
  img.src = author.photo;
  img.alt = author.photoAlt || author.name;
  const bio = $("#author-bio");
  author.bio.forEach((p) => bio.appendChild(el("p", "", esc(p))));
  const creds = $("#author-credentials");
  author.credentials.forEach((c) => creds.appendChild(el("li", "", esc(c))));
}

/* ---------------- course ---------------- */
function renderCourse(course) {
  const { intro, results, topics, program, stats, packages, pricing, bonuses, installments, guarantees } = course;
  const fillList = (target, items, cls) =>
    items.forEach((t) => target.appendChild(el("li", cls || "", esc(t))));
  const titled = (key, title) => ($(`#course-${key}-title`).textContent = title);

  $("#course-eyebrow").textContent = intro.eyebrow;
  $("#course-title").textContent = intro.title;
  $("#course-subtitle").textContent = intro.subtitle;
  fillList($("#course-highlights"), intro.highlights);

  titled("results", results.title);
  fillList($("#course-results"), results.items);

  titled("topics", topics.title);
  topics.items.forEach(({ title, points }, i) => {
    const card = el("div", "course-topic", `<h3 class="course-card-title"><span>${i + 1}.</span> ${esc(title)}</h3>`);
    const ul = el("ul", "dash-list");
    fillList(ul, points);
    card.appendChild(ul);
    $("#course-topics").appendChild(card);
  });

  titled("program", program.title);
  program.blocks.forEach(({ title, results: res }, i) => {
    const card = el(
      "div",
      "course-block",
      `<p class="course-block-label">${esc(program.blockLabel)} ${i + 1}</p>
       <h3 class="course-card-title">${esc(title)}</h3>
       <p class="course-block-result">${esc(program.resultLabel)}</p>`
    );
    const ul = el("ul", "check-list");
    fillList(ul, res);
    card.appendChild(ul);
    $("#course-blocks").appendChild(card);
  });

  titled("stats", stats.title);
  stats.items.forEach(({ value, label }) => {
    const item = el("div");
    item.append(el("dt", "", esc(value)), el("dd", "", esc(label)));
    $("#course-stats").appendChild(item);
  });

  titled("packages", packages.title);
  packages.items.forEach(({ name, tagline, features }) => {
    const card = el(
      "div",
      "course-package",
      `<h3 class="course-package-name">${esc(name)}</h3><p class="course-package-tagline">${esc(tagline)}</p>`
    );
    const ul = el("ul", "check-list");
    features.forEach(({ text, off }) => ul.appendChild(el("li", off ? "is-off" : "", esc(text))));
    card.appendChild(ul);
    $("#course-packages").appendChild(card);
  });

  $("#course-pricing-title").textContent = pricing.title;
  $("#course-pricing-subtitle").textContent = pricing.subtitle;
  const cur = esc(pricing.currency);
  const { labels } = pricing;
  pricing.items.forEach(({ name, regular, prepay, prepaySave, full, fullSave }) => {
    $("#course-prices").appendChild(
      el(
        "div",
        "course-price",
        `<h3 class="course-package-name">${esc(name)}</h3>
         <p class="course-price-row"><span>${esc(labels.regular)}</span><s>${cur} ${esc(regular)}</s></p>
         <p class="course-price-row"><span>${esc(labels.prepay)}</span><strong>${cur} ${esc(prepay)}</strong><em>−${cur} ${esc(prepaySave)}</em></p>
         <p class="course-price-row"><span>${esc(labels.full)}</span><strong>${cur} ${esc(full)}</strong><em>−${cur} ${esc(fullSave)}</em></p>`
      )
    );
  });

  titled("bonuses", bonuses.title);
  bonuses.items.forEach(({ label, text }) =>
    $("#course-bonuses").appendChild(
      el("div", "course-info", `<p class="course-block-label">${esc(label)}</p><p class="course-info-text">${esc(text)}</p>`)
    )
  );

  titled("installments", installments.title);
  installments.items.forEach(({ title, text }) =>
    $("#course-installments").appendChild(
      el("div", "course-info", `<h3 class="course-card-title">${esc(title)}</h3><p class="course-info-text">${esc(text)}</p>`)
    )
  );

  titled("guarantees", guarantees.title);
  guarantees.items.forEach(({ title, text }) =>
    $("#course-guarantees").appendChild(
      el("li", "course-info", `<h3 class="course-card-title">${esc(title)}</h3><p class="course-info-text">${esc(text)}</p>`)
    )
  );
}

/* ---------------- calculator ---------------- */
const WEEKS_PER_MONTH = 4.33;

function initCalculator(calc) {
  const currency = calc.currency || "€";
  const state = {
    laserCost: calc.defaults.laserCost,
    services: calc.defaults.services.map((s) => ({ ...s })),
  };

  $("#calc-title").textContent = calc.title;
  $("#calc-subtitle").textContent = calc.subtitle;
  $("#calc-laser-label").textContent = `${calc.labels.laserCost}, ${currency}`;
  $("#currency-affix").textContent = currency;
  $("#calc-services-label").textContent = calc.labels.services;
  $("#add-service").textContent = calc.labels.addService;
  $("#chart-caption").textContent = calc.chart.caption;

  const laserInput = $("#laser-cost");
  laserInput.value = state.laserCost;
  laserInput.addEventListener("input", () => {
    state.laserCost = parseFloat(laserInput.value) || 0;
    update();
  });

  $("#add-service").addEventListener("click", () => {
    state.services.push({ name: "", price: 0, frequency: 3, freqUnit: "week", consumables: 0, duration: 30 });
    renderServices();
    update();
  });

  function serviceCard(svc, idx) {
    const L = calc.labels;
    const card = el("div", "service-card");
    card.innerHTML = `
      <button type="button" class="service-remove" aria-label="${esc(L.remove)}">&times;</button>
      <div class="svc-grid">
        <div class="svc-field full">
          <label>${esc(L.serviceName)}</label>
          <input type="text" data-k="name" value="${esc(svc.name)}" placeholder="${esc(L.serviceName)}" />
        </div>
        <div class="svc-field">
          <label>${esc(L.price)}, ${esc(currency)}</label>
          <input type="number" data-k="price" min="0" step="5" value="${svc.price}" />
        </div>
        <div class="svc-field">
          <label>${esc(L.consumables)}, ${esc(currency)}</label>
          <input type="number" data-k="consumables" min="0" step="1" value="${svc.consumables}" />
        </div>
        <div class="svc-field">
          <label>${esc(L.frequency)}</label>
          <div class="freq-group">
            <input type="number" data-k="frequency" min="0" step="1" value="${svc.frequency}" />
            <select data-k="freqUnit">
              <option value="week" ${svc.freqUnit === "week" ? "selected" : ""}>${esc(L.perWeek)}</option>
              <option value="month" ${svc.freqUnit === "month" ? "selected" : ""}>${esc(L.perMonth)}</option>
            </select>
          </div>
        </div>
        <div class="svc-field">
          <label>${esc(L.duration)}</label>
          <input type="number" data-k="duration" min="0" step="5" value="${svc.duration}" />
        </div>
      </div>`;

    card.addEventListener("input", (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      svc[k] = e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
      update();
    });
    $(".service-remove", card).addEventListener("click", () => {
      state.services.splice(idx, 1);
      renderServices();
      update();
    });
    return card;
  }

  function renderServices() {
    const list = $("#services-list");
    list.innerHTML = "";
    state.services.forEach((svc, i) => list.appendChild(serviceCard(svc, i)));
  }

  function perWeek(svc) {
    const f = svc.frequency || 0;
    return svc.freqUnit === "month" ? f / WEEKS_PER_MONTH : f;
  }

  function totals() {
    let weekly = 0;
    let weeklyHours = 0;
    let weeklyProfit = 0;
    state.services.forEach((s) => {
      const w = perWeek(s);
      weekly += w;
      weeklyHours += (w * (s.duration || 0)) / 60;
      weeklyProfit += w * ((s.price || 0) - (s.consumables || 0));
    });
    const monthlyProfit = weeklyProfit * WEEKS_PER_MONTH;
    const monthlyRevenue = monthlyProfit + state.services.reduce(
      (sum, s) => sum + perWeek(s) * (s.consumables || 0) * WEEKS_PER_MONTH,
      0
    );
    const paybackMonths = monthlyProfit > 0 ? state.laserCost / monthlyProfit : Infinity;
    const breakeven = new Date();
    if (isFinite(paybackMonths)) breakeven.setMonth(breakeven.getMonth() + Math.ceil(paybackMonths));
    return { weeklyHours, monthlyProfit, monthlyRevenue, paybackMonths, breakeven };
  }

  const chart = $("#calc-chart");
  const ctx = chart.getContext("2d");
  document.addEventListener("themechange", () => drawChart(lastTotals));
  document.addEventListener("pagechange", () => drawChart(lastTotals));

  function statCard(label, value, sub, wide) {
    return `<div class="stat-card${wide ? " wide" : ""}">
      <p class="stat-label">${esc(label)}</p>
      <p class="stat-value">${esc(value)}</p>
      ${sub ? `<p class="stat-sub">${esc(sub)}</p>` : ""}
    </div>`;
  }

  const fmtMoney = (v) =>
    `${currency}${Math.round(v).toLocaleString("uk-UA")}`;
  const fmtDate = (d) =>
    d.toLocaleDateString("uk-UA", { month: "long", year: "numeric" });

  let lastTotals = null;
  function update() {
    const t = totals();
    lastTotals = t;
    const R = calc.results;
    const paybackText = isFinite(t.paybackMonths) ? t.paybackMonths.toFixed(1) : R.never;
    const paybackSub = isFinite(t.paybackMonths) ? R.paybackSub : R.neverSub;

    $("#stat-cards").innerHTML =
      statCard(R.monthlyProfit, fmtMoney(t.monthlyProfit), R.monthlyProfitSub) +
      statCard(R.weeklyHours, t.weeklyHours.toFixed(1), R.weeklyHoursSub) +
      statCard(R.payback, paybackText, paybackSub) +
      statCard(R.breakeven, isFinite(t.paybackMonths) ? fmtDate(t.breakeven) : "—", R.breakevenSub);
    drawChart(t);
  }

  function drawChart(t) {
    if (!t || !chart.clientWidth) return;
    const css = getComputedStyle(document.documentElement);
    const gold = css.getPropertyValue("--gold").trim() || "#c9a55c";
    const dim = css.getPropertyValue("--text-dim").trim() || "#999";
    const line = css.getPropertyValue("--line-soft").trim() || "rgba(128,128,128,.2)";

    const dpr = devicePixelRatio || 1;
    const w = chart.clientWidth;
    const h = chart.clientHeight;
    chart.width = w * dpr;
    chart.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const MONTHS = 24;
    const monthly = Math.max(t.monthlyProfit, 0);
    const data = Array.from({ length: MONTHS + 1 }, (_, m) => monthly * m);
    const maxY = Math.max(state.laserCost, data[MONTHS]) * 1.12 || 1;

    const pad = { l: 52, r: 14, t: 16, b: 26 };
    const x = (m) => pad.l + ((w - pad.l - pad.r) * m) / MONTHS;
    const y = (v) => h - pad.b - ((h - pad.t - pad.b) * v) / maxY;

    // gridlines
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    ctx.fillStyle = dim;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = (maxY * i) / 4;
      const yy = y(v);
      ctx.beginPath();
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(w - pad.r, yy);
      ctx.stroke();
      ctx.fillText(fmtMoney(v), pad.l - 8, yy + 3);
    }
    ctx.textAlign = "center";
    [0, 6, 12, 18, 24].forEach((m) =>
      ctx.fillText(`${m} ${calc.chart.month}`, x(m), h - 8)
    );

    // laser cost line
    ctx.strokeStyle = dim;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pad.l, y(state.laserCost));
    ctx.lineTo(w - pad.r, y(state.laserCost));
    ctx.stroke();
    ctx.setLineDash([]);

    // cumulative profit curve
    const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    grad.addColorStop(0, "rgba(201,165,92,.28)");
    grad.addColorStop(1, "rgba(201,165,92,0)");
    ctx.beginPath();
    ctx.moveTo(x(0), y(0));
    data.forEach((v, m) => ctx.lineTo(x(m), y(v)));
    ctx.lineTo(x(MONTHS), y(0));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.8;
    data.forEach((v, m) => (m === 0 ? ctx.moveTo(x(m), y(v)) : ctx.lineTo(x(m), y(v))));
    ctx.stroke();

    // break-even marker
    if (isFinite(t.paybackMonths) && t.paybackMonths <= MONTHS && monthly > 0) {
      const bx = x(t.paybackMonths);
      const by = y(state.laserCost);
      ctx.beginPath();
      ctx.arc(bx, by, 5, 0, Math.PI * 2);
      ctx.fillStyle = gold;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.strokeStyle = gold;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = gold;
      ctx.textAlign = "center";
      ctx.fillText(calc.results.breakeven, Math.min(Math.max(bx, pad.l + 40), w - pad.r - 40), by - 14);
    }

    // legend
    ctx.textAlign = "left";
    ctx.fillStyle = gold;
    ctx.fillText(`— ${calc.chart.profit}`, pad.l + 8, pad.t + 4);
    ctx.fillStyle = dim;
    ctx.fillText(`- - ${calc.chart.cost}`, pad.l + 8 + ctx.measureText(`— ${calc.chart.profit}`).width + 18, pad.t + 4);
  }

  addEventListener("resize", () => drawChart(lastTotals));
  renderServices();
  update();
}

/* ---------------- questionnaire ---------------- */
// Steps can be conditional: `showIf: { stepKey: [optionId, ...] }` shows a step
// only when every listed earlier answer matches. A step with `final: true`
// ends the flow (no contact form after it).
function initQuestionnaire(quiz, contact) {
  $("#quiz-title").textContent = quiz.title;
  $("#quiz-subtitle").textContent = quiz.subtitle;

  const answers = {};
  const steps = quiz.steps;
  let step = 0;

  // Answers of steps on the current path; answers to skipped steps are ignored.
  let active = {};
  const isVisible = (s) =>
    !s.showIf ||
    Object.entries(s.showIf).every(([key, ids]) => ids.includes(active[key]));

  // Steps the visitor goes through with the current answers.
  function path() {
    const out = [];
    active = {};
    for (let i = 0; i < steps.length; i++) {
      if (!isVisible(steps[i])) continue;
      out.push(i);
      const s = steps[i];
      if (s.final) break;
      if (s.type === "choice") {
        if (answers[s.key] == null) break;
        active[s.key] = answers[s.key];
      }
    }
    return out;
  }

  function renderProgress() {
    const prog = $("#quiz-progress");
    const p = path();
    const pos = p.indexOf(step);
    const last = p[p.length - 1];
    const pending = (s) => Object.keys(s.showIf || {}).some((k) => active[k] == null);
    const ahead =
      steps[last].type === "choice"
        ? steps.slice(last + 1).filter((s) => !s.final && (isVisible(s) || pending(s))).length
        : 0;
    const total = p.length + ahead;
    prog.innerHTML = "";
    for (let i = 0; i < total; i++) prog.appendChild(el("span", i <= pos ? "done" : ""));
  }

  function answeredSteps() {
    return path()
      .map((i) => steps[i])
      .filter((s) => s.type === "choice" && answers[s.key] != null)
      .map((s) => ({
        key: s.key,
        question: s.title,
        answer: s.options.find((o) => o.id === answers[s.key])?.label,
      }));
  }

  function renderStep() {
    const s = steps[step];
    const box = $("#quiz-step");
    box.innerHTML = `<h3 class="quiz-step-title">${esc(s.title)}</h3>
      ${s.hint ? `<p class="quiz-step-hint">${esc(s.hint)}</p>` : ""}`;

    if (s.type === "choice") {
      const opts = el("div", "quiz-options");
      s.options.forEach((opt) => {
        const btn = el("button", `quiz-option${answers[s.key] === opt.id ? " selected" : ""}`, esc(opt.label));
        btn.type = "button";
        btn.addEventListener("click", () => {
          answers[s.key] = opt.id;
          $$(".quiz-option", opts).forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          renderProgress();
          syncNav();
        });
        opts.appendChild(btn);
      });
      box.appendChild(opts);
    } else if (s.type === "info" && s.link?.url) {
      const actions = el("div", "quiz-info-actions");
      const a = el("a", "btn btn-solid", esc(s.link.label));
      a.href = s.link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      actions.appendChild(a);
      box.appendChild(actions);
    } else if (s.type === "contact") {
      box.appendChild(
        buildContactForm(contact, {
          exclude: s.exclude,
          required: s.required,
          submitLabel: s.submit,
          onSubmit: finish,
        })
      );
    }
    renderNavButtons();
    renderProgress();
    syncNav();
  }

  function renderNavButtons() {
    const nav = $("#quiz-nav");
    nav.innerHTML = "";
    const p = path();
    const pos = p.indexOf(step);
    const back = el("button", "btn btn-ghost btn-sm", esc(quiz.buttons.back));
    back.type = "button";
    back.disabled = pos <= 0;
    back.addEventListener("click", () => {
      if (pos > 0) {
        step = p[pos - 1];
        renderStep();
      }
    });
    nav.appendChild(back);
    if (steps[step].type !== "choice") return;
    const next = el("button", "btn btn-solid btn-sm", esc(quiz.buttons.next));
    next.type = "button";
    next.id = "quiz-next";
    next.addEventListener("click", () => {
      const p2 = path();
      const nextStep = p2[p2.indexOf(step) + 1];
      if (nextStep != null) {
        step = nextStep;
        renderStep();
      }
    });
    nav.appendChild(next);
  }

  function syncNav() {
    const next = $("#quiz-next");
    if (next) next.disabled = answers[steps[step].key] == null;
  }

  function finish(contactData) {
    // Static site: persist locally; wire to a real endpoint if needed.
    try {
      const leads = JSON.parse(localStorage.getItem("aurum-leads") || "[]");
      leads.push({ answers: answeredSteps(), contact: contactData, at: new Date().toISOString() });
      localStorage.setItem("aurum-leads", JSON.stringify(leads));
    } catch (_) { /* storage may be unavailable */ }
    const box = $("#quiz-step");
    box.innerHTML = `
      <div class="quiz-done">
        <div class="check">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>
      </div>
        <h3 class="quiz-step-title">${esc(quiz.done.title)}</h3>
        <p class="quiz-step-hint">${esc(quiz.done.text)}</p>
      </div>`;
    if (quiz.done.link?.url) {
      const a = el("a", "btn btn-solid btn-sm", esc(quiz.done.link.label));
      a.href = quiz.done.link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      $(".quiz-done", box).appendChild(a);
    }
    $("#quiz-nav").innerHTML = "";
    $$("#quiz-progress span").forEach((sp) => sp.classList.add("done"));
  }

  renderStep();
}

/* ---------------- testimonials ---------------- */
function renderTestimonials(t) {
  $("#testimonials-title").textContent = t.title;
  const grid = $("#testimonial-grid");
  t.items.forEach(({ name, role, photo, text }) => {
    const card = el("article", "testimonial-card");
    card.innerHTML = `
      <p class="testimonial-text">${esc(text)}</p>
      <div class="testimonial-meta">
        <img class="testimonial-avatar" src="${esc(photo)}" alt="${esc(name)}" loading="lazy" />
        <div>
          <p class="testimonial-name">${esc(name)}</p>
          <p class="testimonial-role">${esc(role)}</p>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* ---------------- contact form (UI only, nothing is sent) ---------------- */
function initContact(contact) {
  $("#contact-title").textContent = contact.title;
  $("#contact-subtitle").textContent = contact.subtitle;

  const mount = $("#contact-mount");
  const done = el("div", "contact-form quiz-done");
  done.hidden = true;

  const showForm = () => {
    mount.innerHTML = "";
    const form = buildContactForm(contact, {
      onSubmit: () => {
        form.hidden = true;
        done.hidden = false;
        done.innerHTML = `
      <div class="check">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>
      </div>
      <h3 class="quiz-step-title">${esc(contact.done.title)}</h3>
      <p class="quiz-step-hint">${esc(contact.done.text)}</p>`;
        const again = el("button", "btn btn-ghost btn-sm", esc(contact.buttons.again));
        again.type = "button";
        again.addEventListener("click", () => {
          done.hidden = true;
          showForm();
          $("input, textarea", mount)?.focus();
        });
        done.appendChild(again);
      },
    });
    mount.append(form, done);
  };
  showForm();
}

// Shared by the About page and the questionnaire's last step.
// `required` overrides which fields are mandatory (list of field keys).
function buildContactForm(contact, { exclude = [], required, submitLabel, onSubmit } = {}) {
  const form = el("form", "contact-form");
  form.noValidate = true;
  const fields = el("div", "contact-fields");
  const actions = el("div", "contact-actions");
  const submit = el("button", "btn btn-solid btn-sm", esc(submitLabel || contact.buttons.submit));
  submit.type = "submit";
  submit.disabled = true;
  actions.appendChild(submit);
  form.append(fields, actions);

  const uid = Math.random().toString(36).slice(2, 8);
  const inputs = contact.fields
    .filter((f) => !exclude.includes(f.key))
    .map((field) => {
      const f = required ? { ...field, required: required.includes(field.key) } : field;
      const wrap = el("div", "svc-field");
      const id = `contact-${f.key}-${uid}`;
      wrap.innerHTML = `<label for="${id}">${esc(f.label)}${f.required ? " *" : ""}</label>`;
      const input = document.createElement(f.type === "textarea" ? "textarea" : "input");
      if (f.type !== "textarea") input.type = f.type;
      else input.rows = f.rows || 5;
      input.id = id;
      input.name = f.key;
      input.placeholder = f.placeholder || "";
      input.required = !!f.required;
      wrap.appendChild(input);
      fields.appendChild(wrap);
      return input;
    });

  const valid = () => inputs.every((i) => !i.required || i.value.trim().length > 0) && form.checkValidity();
  form.addEventListener("input", () => (submit.disabled = !valid()));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!valid()) return;
    onSubmit?.(Object.fromEntries(inputs.map((i) => [i.name, i.value.trim()])));
  });
  return form;
}

/* ---------------- footer ---------------- */
function renderFooter(f) {
  $("#footer-brand").textContent = f.brand;
  $("#footer-note").textContent = f.note;
  const links = $("#footer-links");
  f.links.forEach(({ label, url }) => {
    const a = el("a", "", esc(label));
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    links.appendChild(a);
  });
}

/* ---------------- analytics ---------------- */
function injectAnalytics(analytics) {
  if (!analytics || !analytics.enabled) return;
  const id = analytics.ga4MeasurementId;
  if (!id || id === "G-XXXXXXXXXX") return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
}

document.addEventListener("DOMContentLoaded", boot);
