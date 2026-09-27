// Krafting with Kay — tiny interactions, no dependencies.

document.getElementById("year").textContent = new Date().getFullYear();

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
    d.setDate(d.getDate() + ((r.weekday - d.getDay() + 7) % 7));
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
  return s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : s.startTime || "";
}

async function initEvents() {
  const homeList = document.getElementById("upcomingList");
  const calList = document.getElementById("calendarList");
  if (!homeList && !calList) return;
  let data;
  try {
    data = await (await fetch("events.json")).json();
  } catch {
    if (homeList) homeList.innerHTML = '<p class="muted">Check Instagram for the latest schedule.</p>';
    if (calList) calList.innerHTML = '<p class="muted">Check Instagram for the latest schedule.</p>';
    initBooking([]);
    return;
  }
  const sessions = buildSessions(data);

  if (homeList) {
    homeList.innerHTML = sessions.slice(0, 3).map((s) => `
      <div class="upcoming-row">
        <div class="upcoming-date"><strong>${fmtShortDate(s.date)}</strong><span>${sessionTime(s)}</span></div>
        <div class="upcoming-info"><span class="event-tag">${s.tag}</span> ${s.title}</div>
      </div>`).join("") ||
      '<p class="muted">No sessions scheduled right now — check back soon!</p>';
  }

  if (calList) {
    if (!sessions.length) {
      calList.innerHTML = '<p class="muted">No sessions scheduled right now — check back soon!</p>';
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
          <a class="link-arrow" href="index.html?session=${isoDate(s.date)}#book">Book with KWK →</a>
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
}
initEvents();

/* ---------- booking form ---------- */
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
    opt.value = `${s.title} — ${fmtDate(s.date)} (${sessionTime(s)})`;
    opt.dataset.iso = iso;
    opt.textContent = `${fmtShortDate(s.date)} — ${s.title} (${sessionTime(s)})`;
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
      note.textContent = "Online booking opens soon — KWK is getting it connected. Check back shortly!";
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
      payload.session = `Custom date — ${fmtDate(parseISODate(customDate.value))}`;
      delete payload.customDate;
    }
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...payload, _subject: `KWK booking request: ${payload.session}` }),
      });
      if (!res.ok) throw new Error("send failed");
      form.reset();
      note.className = "form-note ok";
      note.textContent = "Request sent! KWK will confirm your spots by email shortly.";
    } catch {
      note.className = "form-note err";
      note.textContent = "Hmm, that didn't go through. Please try again or reach KWK on Instagram @krafting_w_kay.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send booking request";
    }
  });
}
