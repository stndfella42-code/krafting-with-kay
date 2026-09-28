// Krafting with Kay: tiny interactions, no dependencies.

document.getElementById("year").textContent = new Date().getFullYear();

// Transparent header over the hero, solid on scroll
const header = document.querySelector(".site-header");
const setHeader = () => header.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", setHeader, { passive: true });
setHeader();

// Mobile nav
const nav = document.getElementById("siteNav");
const toggle = document.getElementById("navToggle");
toggle.addEventListener("click", () => nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => nav.classList.remove("open"))
);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Reveal-on-scroll
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    }),
  { threshold: 0.12 }
);
document
  .querySelectorAll(".card, .tile, .steps li, .photo-frame, .pillar, .event-card")
  .forEach((el) => {
    el.classList.add("reveal");
    io.observe(el);
  });

/* ---------- dynamic events ----------
   events.json is the single source of truth. The homepage
   "Upcoming sessions" list and events.html both render from it. */

/* Booking form: paste the Formspree form ID here to go live.
   Get one free at https://formspree.io (create a form, copy the ID
   from the endpoint URL https://formspree.io/f/YOUR_ID). */
const FORMSPREE_FORM_ID = "";

function isoDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function fmtShortDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtMonth(d) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function parseISODate(s) {
  const [y, m, dd] = s.split("-").map(Number);
  return new Date(y, m - 1, dd, 12);
}

function buildSessions(data) {
  const sessions = [];
  const r = data.recurring;
  if (r) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + ((r.dayOfWeek - d.getDay() + 7) % 7));
    for (let i = 0; i < (r.weeksOut || 8); i++) {
      sessions.push({
        title: r.title, date: new Date(d),
        startTime: r.startTime, endTime: r.endTime,
        location: r.location, price: r.price,
        description: r.description, tag: "Weekly",
      });
      d.setDate(d.getDate() + 7);
    }
  }
  (data.events || []).forEach((e) => {
    sessions.push({
      title: e.title, date: parseISODate(e.date),
      startTime: e.startTime || r?.startTime, endTime: e.endTime || r?.endTime,
      location: e.location || r?.location, price: e.price || r?.price,
      description: e.description || "", tag: e.tag || "Special",
    });
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return sessions.filter((s) => s.date >= today).sort((a, b) => a.date - b.date);
}

function sessionTime(s) {
  return s.startTime && s.endTime ? `${s.startTime} to ${s.endTime}` : s.startTime || "";
}

/* ---------- KwK wordmark hearts ---------- */
function kwkHearts(s) {
  return String(s).replace(/KwK/g, '<span class="kwk">K<span class="kwkh">♥</span>w<span class="kwkh">♥</span>K</span>');
}
function heartifyKwK(root) {
  const skip = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION", "SELECT", "TITLE"]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  let n;
  while ((n = walker.nextNode())) {
    const p = n.parentNode;
    if (!p || skip.has(p.tagName)) continue;
    if (n.nodeValue.includes("KwK")) targets.push(n);
  }
  for (const t of targets) {
    const frag = document.createDocumentFragment();
    t.nodeValue.split(/(KwK)/g).forEach((part) => {
      if (part === "KwK") {
        const tpl = document.createElement("template");
        tpl.innerHTML = kwkHearts(part);
        frag.appendChild(tpl.content);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    t.parentNode.replaceChild(frag, t);
  }
}

/* ---------- workshop info (rendered from events.json, never hardcoded) ---------- */
function populateWorkshopInfo(r) {
  if (!r) return;
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el && v) el.textContent = v;
  };
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[r.dayOfWeek] || "Wednesday";
  const range = r.startTime && r.endTime ? `${r.startTime} to ${r.endTime}` : (r.startTime || r.endTime || "");
  set("wsTitle", r.title);
  set("wsDayName", "every " + dayName);
  set("wsTime", range);
  set("wsDay", "Every " + dayName);
  if (r.price) {
    set("wsPrice", r.price);
    const sub = document.getElementById("wsPriceSub");
    if (sub) sub.style.display = "none";
  }
  const dealCard = document.getElementById("wsDealCard");
  if (r.discountNote) {
    set("wsDeal", r.discountNote);
    const dsub = document.getElementById("wsDealSub");
    if (dsub) dsub.style.display = "none";
    if (dealCard) dealCard.style.display = "";
  } else if (dealCard) {
    dealCard.style.display = "none";
  }
  const visit = document.getElementById("visitLede");
  if (visit && r.title && range) visit.textContent = `${r.title} every ${dayName}, ${range}.`;
}

async function initEvents() {
  const homeList = document.getElementById("upcomingList");
  const calList = document.getElementById("calendarList");
  if (!homeList && !calList) return;
  let data;
  try {
    data = await (await fetch("events.json")).json();
  } catch {
    if (homeList) homeList.innerHTML = '<p class="muted">New sessions are added regularly, please check back soon.</p>';
    if (calList) calList.innerHTML = '<p class="muted">New sessions are added regularly, please check back soon.</p>';
    initBooking([]);
    return;
  }
  const sessions = buildSessions(data);
  populateWorkshopInfo(data.recurring);

  if (homeList) {
    homeList.innerHTML = sessions.slice(0, 3).map((s) => `
      <div class="upcoming-row">
        <div class="upcoming-date"><strong>${fmtShortDate(s.date)}</strong><span>${sessionTime(s)}</span></div>
        <div class="upcoming-info"><span class="event-tag">${s.tag}</span> ${s.title}</div>
        <a class="link-arrow upcoming-book" href="book.html?session=${isoDate(s.date)}">Book →</a>
      </div>`).join("") ||
      '<p class="muted">No sessions scheduled right now. Check back soon!</p>';
  }

  if (calList) {
    if (!sessions.length) {
      calList.innerHTML = '<p class="muted">No sessions scheduled right now. Check back soon!</p>';
      return;
    }
    let html = "", lastMonth = "";
    sessions.forEach((s) => {
      const month = fmtMonth(s.date);
      if (month !== lastMonth) {
        html += `<h2 class="cal-month">${month}</h2>`;
        lastMonth = month;
      }
      const dow = s.date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const day = s.date.getDate();
      const mon = s.date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      html += `
      <article class="event-card">
        <div class="event-date"><span class="dow">${dow}</span><span class="day">${day}</span><span class="mon">${mon}</span></div>
        <div class="event-body">
          <span class="event-tag">${s.tag}</span>
          <h3>${s.title}</h3>
          <p class="event-meta">${sessionTime(s)}${s.location ? " · " + s.location : ""}</p>
          ${s.price ? `<p class="event-price">${s.price}</p>` : ""}
          ${s.description ? `<p class="muted small">${s.description}</p>` : ""}
          <a class="link-arrow" href="book.html?session=${isoDate(s.date)}">Book with KwK →</a>
        </div>
      </article>`;
    });
    calList.innerHTML = html;
    calList.querySelectorAll(".event-card").forEach((el) => {
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  initBooking(sessions);
  heartifyKwK(document.body);
}
initEvents();

/* ---------- booking page: init the form when the homepage lists aren't present ---------- */
async function initBookingPage() {
  if (
    document.getElementById("bookForm") &&
    !document.getElementById("upcomingList") &&
    !document.getElementById("calendarList")
  ) {
    try {
      const data = await (await fetch("events.json")).json();
      initBooking(buildSessions(data));
    } catch {
      initBooking([]);
    }
  }
}
initBookingPage();

/* ---------- creations (rendered from creations.json) ---------- */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
async function renderCreations() {
  const strip = document.getElementById("creationsStrip");
  const grid = document.getElementById("creationsGrid");
  const target = strip || grid;
  if (!target) return;
  try {
    const items = await (await fetch("creations.json")).json();
    target.innerHTML = items.map((c) => `
      <article class="card${strip ? " strip-card" : ""}">
        ${c.image ? `<img class="card-img" src="${esc(c.image)}" alt="${esc(c.title)}" loading="lazy" />` : ""}
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description)}</p>
      </article>`).join("");
    if (strip) loopify(strip);
    target.querySelectorAll(".card").forEach((el) => {
      el.classList.add("reveal");
      io.observe(el);
    });
  } catch {
    target.innerHTML = '<p class="muted">Check back soon!</p>';
  }
}
renderCreations();

async function renderFeatured() {
  const grid = document.getElementById("featuredGrid");
  if (!grid) return;
  try {
    const items = (await (await fetch("creations.json")).json()).slice(0, 3);
    grid.innerHTML = items.map((c) => `
      <article class="card">
        ${c.image ? `<img class="card-img" src="${esc(c.image)}" alt="${esc(c.title)}" loading="lazy" />` : ""}
        <h3>${esc(c.title)}</h3>
        <p>${esc(c.description)}</p>
      </article>`).join("");
    grid.querySelectorAll(".card").forEach((el) => {
      el.classList.add("reveal");
      io.observe(el);
    });
  } catch {
    grid.innerHTML = '<p class="muted">Check back soon!</p>';
  }
}
renderFeatured();

/* ---------- site-wide editable text (site.json) ---------- */
async function loadSite() {
  try {
    const res = await fetch("site.json");
    if (!res.ok) return;
    const s = await res.json();
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el && typeof v === "string" && v) el.textContent = v;
    };
    set("heroLede", s.heroLede);
    set("missionText", s.missionText);
    set("monthlyTheme", s.monthlyTheme);
    if (s.instagramHandle) {
      const f = document.getElementById("instaFooter");
      if (f) f.textContent = s.instagramHandle;
    }
    renderGallery(s.gallery);
  } catch {
    /* baked-in copy stays as the fallback */
  }
  heartifyKwK(document.body);
}

/* ---------- gallery strip: sideways scroll, tiles open an on-site lightbox ---------- */
function renderGallery(items) {
  const strip = document.getElementById("galleryStrip");
  if (!strip) return;
  const list = Array.isArray(items) ? items.filter((g) => g && (g.caption || g.image)) : [];
  strip.innerHTML = "";
  if (!list.length) {
    strip.style.display = "none";
    return;
  }
  strip.style.display = "";
  list.forEach((g, i) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "gtile g" + ((i % 6) + 1);
    el.dataset.image = g.image || "";
    el.dataset.caption = g.caption || "";
    el.setAttribute("aria-label", (g.caption || "Gallery photo") + " (view larger)");
    if (g.image) {
      const img = document.createElement("img");
      img.src = g.image;
      img.alt = g.caption || "";
      img.loading = "lazy";
      el.appendChild(img);
    }
    const cap = document.createElement("span");
    cap.textContent = g.caption || "";
    el.appendChild(cap);
    strip.appendChild(el);
  });
  if (!strip.dataset.lbBound) {
    strip.addEventListener("click", (e) => {
      const tile = e.target.closest("button.gtile");
      if (tile && strip.contains(tile) && tile.dataset.image) {
        openLightbox(tile.dataset.image, tile.dataset.caption);
      }
    });
    strip.dataset.lbBound = "1";
  }
  loopify(strip);
}

/* ---------- lightbox: keep visitors on the site instead of sending them to IG ---------- */
function openLightbox(src, caption) {
  if (!src) return;
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  const img = document.getElementById("lightboxImg");
  img.src = src;
  img.alt = caption || "";
  document.getElementById("lightboxCap").textContent = caption || "";
  lb.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.hidden = true;
  document.body.style.overflow = "";
}
(function initLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lb.hidden) closeLightbox();
  });
})();
loadSite();

/* ---------- endless loop: duplicate strip content once, then wrap the scroll
   position seamlessly. Both copies are identical, so the wrap is invisible. ---------- */
const loopedStrips = [];
function loopify(strip) {
  strip.querySelectorAll("[data-clone]").forEach((c) => c.remove());
  delete strip.dataset.copyW;
  const kids = [...strip.children];
  if (!kids.length) return;
  const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
  const copyW = strip.scrollWidth + gap; // one full copy plus the gap into the next
  kids.forEach((k) => {
    const c = k.cloneNode(true);
    c.setAttribute("data-clone", "1");
    c.setAttribute("aria-hidden", "true");
    c.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    if (c.id) c.removeAttribute("id");
    if (c.tabIndex >= 0) c.tabIndex = -1;
    c.querySelectorAll("button, a").forEach((n) => { n.tabIndex = -1; });
    strip.appendChild(c);
  });
  strip.dataset.copyW = String(copyW);
  if (!loopedStrips.includes(strip)) loopedStrips.push(strip);
}
let loopResizeT = null;
window.addEventListener("resize", () => {
  clearTimeout(loopResizeT);
  loopResizeT = setTimeout(() => loopedStrips.forEach(loopify), 250);
});

/* ---------- auto-scroll: slow endless drift, pauses when touched ---------- */
function initAutoScroll(strip) {
  if (!strip) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let paused = false;
  let resumeT = null;
  let snapT = null;
  const pause = (ms = 6000) => {
    paused = true;
    clearTimeout(snapT);
    strip.style.scrollSnapType = ""; // snap back on for manual swipes
    clearTimeout(resumeT);
    resumeT = setTimeout(() => { paused = false; }, ms);
  };
  ["pointerdown", "touchstart", "wheel"].forEach((e) =>
    strip.addEventListener(e, () => pause(), { passive: true })
  );
  strip.addEventListener("pointerenter", () => pause(999999));
  strip.addEventListener("pointerleave", () => pause(2500));
  strip.addEventListener("focusin", () => pause(999999));
  strip.addEventListener("focusout", () => pause(2500));
  setInterval(() => {
    if (paused || document.hidden) return;
    const copyW = parseFloat(strip.dataset.copyW);
    if (!copyW || copyW <= strip.clientWidth + 8) return;
    // snap fights programmatic scrolling, so drop it just for the drift
    strip.style.scrollSnapType = "none";
    clearTimeout(snapT);
    snapT = setTimeout(() => { strip.style.scrollSnapType = ""; }, 200);
    strip.scrollLeft += 1;
    if (strip.scrollLeft >= copyW) strip.scrollLeft -= copyW; // seamless wrap
  }, 40);
}
initAutoScroll(document.getElementById("galleryStrip"));
initAutoScroll(document.getElementById("creationsStrip"));
function formatAddr(p) {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const city = p.city || p.town || p.village || "";
  const region = [city, p.state].filter(Boolean).join(", ");
  const tail = [region, p.postcode].filter(Boolean).join(" ");
  return [street || p.name, tail].filter(Boolean).join(", ");
}
function initAddressAutocomplete() {
  const input = document.getElementById("addressInput");
  const box = document.getElementById("addressSuggestions");
  if (!input || !box) return;
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 4) {
      box.hidden = true;
      return;
    }
    timer = setTimeout(async () => {
      try {
        const url =
          "https://photon.komoot.io/api/?" +
          `q=${encodeURIComponent(q)}&limit=5&lang=en&lat=39.7294&lon=-104.8319&location_bias_scale=0.6`;
        const data = await (await fetch(url)).json();
        const feats = (data.features || []).filter(
          (f) => f.properties.countrycode === "US" && (f.properties.housenumber || f.properties.street)
        );
        if (!feats.length) {
          box.hidden = true;
          return;
        }
        box.innerHTML = "";
        feats.forEach((f) => {
          const label = formatAddr(f.properties);
          const b = document.createElement("button");
          b.type = "button";
          b.className = "addr-opt";
          b.textContent = label;
          b.addEventListener("click", () => {
            input.value = label;
            box.hidden = true;
          });
          box.appendChild(b);
        });
        box.hidden = false;
      } catch {
        box.hidden = true;
      }
    }, 300);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") box.hidden = true;
  });
  document.addEventListener("click", (e) => {
    if (!box.contains(e.target) && e.target !== input) box.hidden = true;
  });
}
initAddressAutocomplete();
function initBooking(sessions) {
  const form = document.getElementById("bookForm");
  if (!form) return;
  const select = document.getElementById("sessionSelect");
  const note = document.getElementById("formNote");
  const submitBtn = document.getElementById("bookSubmit");

  select.innerHTML = '<option value="" disabled selected>Choose a session…</option>';
  sessions.forEach((s) => {
    const iso = isoDate(s.date);
    const opt = document.createElement("option");
    opt.value = `${s.title}: ${fmtDate(s.date)} (${sessionTime(s)})`;
    opt.dataset.iso = iso;
    opt.textContent = `${fmtShortDate(s.date)}: ${s.title} (${sessionTime(s)})`;
    select.appendChild(opt);
  });
  const priv = document.createElement("option");
  priv.value = "Private class or party";
  priv.dataset.iso = "private";
  priv.textContent = "Private class / birthday party";
  select.appendChild(priv);
  const calOpt = document.createElement("option");
  calOpt.value = "__calendar__";
  calOpt.dataset.iso = "calendar";
  calOpt.textContent = "Pick a date from the calendar…";
  select.appendChild(calOpt);

  const customDateWrap = document.getElementById("customDateWrap");
  const customDate = document.getElementById("customDate");
  customDate.min = isoDate(new Date());
  select.addEventListener("change", () => {
    const isCal = select.value === "__calendar__";
    customDateWrap.hidden = !isCal;
    customDate.required = isCal;
  });

  const want = new URLSearchParams(location.search).get("session");
  if (want) {
    const match = [...select.options].find((o) => o.dataset.iso === want);
    if (match) match.selected = true;
  }

  const kidRows = document.getElementById("kidRows");
  function kidRow(removable) {
    const div = document.createElement("div");
    div.className = "kid-row";
    div.innerHTML =
      '<label>Child\'s name<input type="text" name="kid_name" required placeholder="Maya" /></label>' +
      '<label>Age<input type="number" name="kid_age" required min="2" max="17" placeholder="7" /></label>' +
      (removable
        ? '<button type="button" class="kid-remove" aria-label="Remove this child">×</button>'
        : '<span></span>');
    const btn = div.querySelector(".kid-remove");
    if (btn) btn.addEventListener("click", () => div.remove());
    return div;
  }
  kidRows.appendChild(kidRow(false));
  document.getElementById("addKidBtn").addEventListener("click", () => {
    kidRows.appendChild(kidRow(true));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!FORMSPREE_FORM_ID) {
      note.className = "form-note";
      note.innerHTML = kwkHearts("Online booking opens soon. KwK is getting it connected. Check back shortly!");
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    note.className = "form-note";
    note.textContent = "";
    const fd = new FormData(form);
    const kids = [];
    kidRows.querySelectorAll(".kid-row").forEach((row) => {
      const n = row.querySelector("[name=kid_name]").value.trim();
      const a = row.querySelector("[name=kid_age]").value.trim();
      if (n || a) kids.push(a ? `${n} (${a})` : n);
    });
    fd.delete("kid_name");
    fd.delete("kid_age");
    const payload = Object.fromEntries(fd.entries());
    payload.kids = kids.join(", ");
    if (payload.session === "__calendar__") {
      if (!customDate.value) {
        customDate.reportValidity();
        return;
      }
      payload.session = `Custom date: ${fmtDate(parseISODate(customDate.value))}`;
      delete payload.customDate;
    }
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...payload, _subject: `KwK booking request: ${payload.session}` }),
      });
      if (!res.ok) throw new Error("send failed");
      form.reset();
      note.className = "form-note ok";
      note.innerHTML = kwkHearts("Request sent! KwK will confirm your spots by email shortly.");
    } catch {
      note.className = "form-note err";
      note.innerHTML = kwkHearts("Hmm, that didn't go through. Please try again or reach KwK on Instagram @krafting_w_kay.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send booking request";
    }
  });
}

/* hearts on anything rendered after load */
heartifyKwK(document.body);

/* ---------- cycling emblem: one badge flips through Reduce / Reuse / Reimagine ---------- */
(function initPillarCycle() {
  const cycles = document.querySelectorAll(".pillar-cycle");
  if (!cycles.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const data = [
    { word: "Reduce", text: "Environmental stewardship starts small: seeing new possibility in what others throw away.", bg: "var(--sage-deep)" },
    { word: "Reuse", text: "Everyday materials get a second life through hands-on building, crafting, and creating.", bg: "var(--olive)" },
    { word: "Reimagine", text: "Children discover their talents, build confidence, and make a positive impact in their community.", bg: "var(--clay)" },
  ];
  cycles.forEach((root) => {
    const badge = root.querySelector(".cycle-badge");
    const icons = root.querySelectorAll(".cycle-icon");
    const word = root.querySelector(".cycle-word");
    const text = root.querySelector(".cycle-text");
    let i = 0;
    setInterval(() => {
      badge.style.transform = "rotateY(90deg)";
      word.style.opacity = "0";
      text.style.opacity = "0";
      setTimeout(() => {
        i = (i + 1) % data.length;
        icons.forEach((ic, k) => ic.classList.toggle("active", k === i));
        word.textContent = data[i].word;
        text.textContent = data[i].text;
        badge.style.background = data[i].bg;
        badge.style.transform = "rotateY(0deg)";
        word.style.opacity = "1";
        text.style.opacity = "1";
      }, 340);
    }, 3400);
  });
})();
