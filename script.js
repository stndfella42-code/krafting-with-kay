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
  .querySelectorAll(".card, .tile, .steps li, .photo-frame")
  .forEach((el) => {
    el.classList.add("reveal");
    io.observe(el);
  });
