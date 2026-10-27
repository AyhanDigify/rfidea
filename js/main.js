(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // header shadow + back-to-top
  const header = $(".site-header"), toTop = $(".to-top");
  const onScroll = () => {
    const y = window.scrollY;
    header && header.classList.toggle("is-scrolled", y > 8);
    toTop && toTop.classList.toggle("is-visible", y > 700);
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // overlays (drawer + search)
  const open = (el) => { el.classList.add("is-open"); el.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; };
  const close = (el) => { el.classList.remove("is-open"); el.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; };
  const drawer = $("[data-drawer]"), search = $("[data-search]");
  $("[data-menu-open]")?.addEventListener("click", () => open(drawer));
  $("[data-menu-close]")?.addEventListener("click", () => close(drawer));
  drawer?.addEventListener("click", (e) => { if (e.target === drawer) close(drawer); });

  // search
  const input = $("[data-search-input]"), results = $("[data-search-results]");
  let index = null, focus = -1;
  const loadIndex = async () => { if (!index) index = await (await fetch("/rfidea/search.json")).json(); return index; };
  const openSearch = async () => { open(search); setTimeout(() => input.focus(), 50); loadIndex(); };
  $$("[data-search-open]").forEach((b) => b.addEventListener("click", openSearch));
  $("[data-search-close]")?.addEventListener("click", () => close(search));
  search?.addEventListener("click", (e) => { if (e.target === search) close(search); });
  const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[−–]/g, "-").replace(/[^\w\s.°-]/g, " ");
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  input?.addEventListener("input", async () => {
    const q = norm(input.value.trim()); focus = -1;
    if (q.length < 2) { results.innerHTML = '<p class="search-hint">Type at least 2 characters.</p>'; return; }
    const idx = await loadIndex(), words = q.split(/\s+/);
    const hits = idx.map((p) => {
      const hay = norm(`${p.n} ${p.c} ${p.s} ${p.k} ${p.t}`);
      if (!words.every((w) => hay.includes(w))) return null;
      return { p, score: (norm(p.n + " " + p.c).includes(q) ? 2 : 0) + (norm(p.c).startsWith(q) ? 3 : 0) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 12);
    results.innerHTML = hits.length ? hits.map(({ p }) =>
      `<a class="s-item" href="${p.u}"><img src="${p.i}" alt=""><span><b>${esc(p.n)}</b><small>${esc(p.c)} · ${esc(p.k)}</small></span></a>`).join("")
      : `<p class="search-hint">No results for “${esc(input.value)}”. <a href="/rfidea/contact/">Ask our team</a>.</p>`;
  });
  input?.addEventListener("keydown", (e) => {
    const items = $$(".s-item", results); if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); focus = (focus + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle("is-focus", i === focus)); items[focus].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && focus >= 0) { location.href = items[focus].href; }
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") { [drawer, search].forEach((el) => el?.classList.contains("is-open") && close(el)); $("[data-filters]")?.classList.remove("is-open"); }
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  // gallery
  const main = $("[data-main]");
  $$("[data-thumb]").forEach((t) => t.addEventListener("click", () => {
    main.style.opacity = 0;
    setTimeout(() => { main.src = t.dataset.thumb; main.style.opacity = 1; }, 150);
    $$("[data-thumb]").forEach((x) => x.classList.toggle("is-active", x === t));
  }));

  // catalogue filters
  const grid = $("[data-grid]");
  if (grid) {
    const cards = $$(".p-card", grid), q = $("[data-filter-q]"), boxes = $$("[data-filter-cat]");
    const count = $("[data-count]"), empty = $("[data-empty]"), pills = $$("[data-group-pill]");
    let group = "";
    const apply = () => {
      const cats = boxes.filter((b) => b.checked).map((b) => b.value), term = norm(q.value.trim());
      let n = 0;
      cards.forEach((c) => {
        const ok = (!group || c.dataset.group === group) && (!cats.length || cats.includes(c.dataset.cat)) &&
          (!term || term.split(/\s+/).every((w) => norm(c.dataset.search).includes(w)));
        c.hidden = !ok; if (ok) n++;
      });
      count.textContent = n; empty.hidden = n > 0;
      pills.forEach((p) => p.classList.toggle("is-active", p.dataset.groupPill === group));
    };
    q.addEventListener("input", apply);
    boxes.forEach((b) => b.addEventListener("change", apply));
    pills.forEach((p) => p.addEventListener("click", (e) => { e.preventDefault(); group = p.dataset.groupPill; apply(); }));
    $("[data-filter-reset]").addEventListener("click", () => { q.value = ""; boxes.forEach((b) => (b.checked = false)); group = ""; apply(); });
    $("[data-filters-toggle]")?.addEventListener("click", () => $("[data-filters]").classList.toggle("is-open"));
    const params = new URLSearchParams(location.search);
    if (params.get("group")) group = params.get("group");
    if (params.get("q")) q.value = params.get("q");
    apply();
  }

  // contact form
  const form = $("[data-contact-form]");
  if (form) {
    const params = new URLSearchParams(location.search);
    if (params.get("product")) form.product.value = params.get("product");
    if (params.get("type")) { const r = form.querySelector(`input[name=type][value="${params.get("type")}"]`); if (r) r.checked = true; }
    if (params.get("interest")) { const o = [...form.interest.options].find((x) => x.text === params.get("interest")); if (o) o.selected = true; }
    const status = $("[data-form-status]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let ok = true;
      $$("[required]", form).forEach((f) => {
        const bad = f.type === "checkbox" ? !f.checked : !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
        f.classList.toggle("is-invalid", bad); if (bad) ok = false;
      });
      if (!ok) { status.className = "form-status err"; status.textContent = "Please complete the required fields."; return; }
      if (form.querySelector("altcha-widget") && !form.querySelector("input[name=altcha]")?.value) {
        status.className = "form-status err"; status.textContent = "Please confirm that you are not a robot."; return;
      }
      const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
      status.className = "form-status"; status.textContent = "Sending…";
      try {
        const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Send failed");
        location.href = "/rfidea/thank-you/";
      } catch (err) {
        status.className = "form-status err";
        status.innerHTML = `Sorry, the message could not be sent. Please email us directly at <a href="mailto:${form.dataset.email || "info@rfidea.net"}">${form.dataset.email || "info@rfidea.net"}</a>.`;
        btn.disabled = false;
      }
    });
  }

  // reveal on scroll
  if ("IntersectionObserver" in window) {
    const els = $$(".sec-head, .g-card, .p-card, .cat-tile, .why, .ind-card, .steps li, .cap, .ind-row");
    els.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }
})();
