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
          <a class="link-arrow" href="https://www.instagram.com/krafting_w_kay" target="_blank" rel="noopener">RSVP via DM →</a>
        </div>
      </article>`;
    });
    calList.innerHTML = html;
    calList.querySelectorAll(".event-card").forEach((el) => {
      el.classList.add("reveal");
      io.observe(el);
    });
  }
}
initEvents();
