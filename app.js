/* ============================================================
   ISI DI SINI: tempel link Web App dari Google Apps Script
   (Deploy > New deployment > Web app > salin "Web app URL")
   Contoh: https://script.google.com/macros/s/AKfyc.../exec
   ============================================================ */
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwWmHZFDuhytlnkWd6unqg7-8JVznhneBaV84BcLNCfVtIY9m3T3GA6490lpIZPHrUPnQ/exec";

/* Daftar alat musik. Nama harus sama persis dengan yang ada di code.gs */
const INSTRUMENTS = [
  { name: "Gitar",     icon: "🎸" },
  { name: "Piano",     icon: "🎹" },
  { name: "Drum",      icon: "🥁" },
  { name: "Biola",     icon: "🎻" },
  { name: "Saksofon",  icon: "🎷" },
  { name: "Terompet",  icon: "🎺" }
];

const $ = (id) => document.getElementById(id);
const configured = () => /^https:\/\/script\.google\.com\/.+/.test(WEB_APP_URL);
let barsVisible = false;
let lastCounts = null;

/* ---------- Scroll reveal ---------- */
let io = null;
if ("IntersectionObserver" in window) {
  io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
} else {
  document.documentElement.classList.add("no-io");
}
const watch = (el) => { if (io) io.observe(el); };

/* Bar hasil baru beranimasi saat panel terlihat */
if (io) {
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { barsVisible = true; fillBars(); }
  }, { threshold: 0.3 }).observe($("bars"));
} else { barsVisible = true; }

/* Navbar berubah saat discroll */
const nav = $("nav");
const onScroll = () => nav.classList.toggle("solid", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Render pilihan ---------- */
const options = $("options");
INSTRUMENTS.forEach((it, i) => {
  const label = document.createElement("label");
  label.className = "opt reveal";
  label.style.setProperty("--rd", (i * 0.07) + "s");
  label.innerHTML =
    '<input type="radio" name="alat" value="' + it.name + '"' + (i === 0 ? " required" : "") + '>' +
    '<span class="card"><b aria-hidden="true">' + it.icon + '</b>' + it.name + '</span>';
  options.appendChild(label);
});
document.querySelectorAll(".reveal").forEach(watch);

/* ---------- Kirim survei ---------- */
const form = $("form"), msg = $("msg"), btn = $("kirim");
const say = (text, type) => { msg.textContent = text; msg.className = "msg " + (type || ""); };

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if ($("website").value) return; // jebakan bot
  const pick = form.querySelector('input[name="alat"]:checked');
  if (!pick) { say("Pilih satu alat musik dulu ya.", "err"); options.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  if (!configured()) { say("Link Web App belum diisi di app.js.", "err"); return; }

  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = "Mengirim...";
  say("");
  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // hindari preflight CORS
      body: JSON.stringify({
        alat: pick.value,
        nama: $("nama").value.trim(),
        kota: $("kota").value.trim(),
        alasan: $("alasan").value.trim()
      })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Gagal menyimpan.");
    say("Terima kasih! Suaramu untuk " + pick.value + " sudah masuk.", "ok");
    form.reset();
    await loadResults();
    setTimeout(() => $("hasil").scrollIntoView({ behavior: "smooth" }), 900);
  } catch (err) {
    say("Suara belum terkirim: " + (err.message || "periksa koneksi lalu coba lagi."), "err");
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
});

/* ---------- Hasil ---------- */
function fillBars() {
  if (!barsVisible) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll(".fill").forEach((f) => { f.style.width = f.dataset.w + "%"; });
  }));
}

function countUp(el, to) {
  const from = parseInt(el.textContent, 10) || 0;
  if (from === to) return;
  const t0 = performance.now(), dur = 900;
  (function step(t) {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

function renderResults(counts) {
  lastCounts = counts;
  const total = INSTRUMENTS.reduce((s, it) => s + (Number(counts[it.name]) || 0), 0);
  countUp($("total"), total);
  const box = $("bars");
  if (!total) { box.innerHTML = '<p class="empty">Belum ada suara. Jadilah yang pertama memilih!</p>'; return; }
  const rows = INSTRUMENTS.map((it) => ({ ...it, n: Number(counts[it.name]) || 0 }))
    .sort((a, b) => b.n - a.n);
  const max = rows[0].n;
  box.innerHTML = rows.map((r, i) => {
    const pct = Math.round((r.n / total) * 100);
    const w = max ? (r.n / max) * 100 : 0;
    return '<div class="row' + (i === 0 ? " top" : "") + '">' +
      '<div class="ic" aria-hidden="true">' + r.icon + '</div>' +
      '<div><div class="name"><span>' + r.name + '</span><span>' + r.n + ' suara</span></div>' +
      '<div class="track"><div class="fill" style="--rd:' + (i * 0.08) + 's" data-w="' + w.toFixed(1) + '"></div></div></div>' +
      '<div class="pct">' + pct + '%</div></div>';
  }).join("");
  fillBars();
}

async function loadResults() {
  if (!configured()) {
    $("bars").innerHTML = '<p class="empty">Isi WEB_APP_URL di app.js agar hasil tampil di sini.</p>';
    return;
  }
  try {
    const res = await fetch(WEB_APP_URL + "?action=results&t=" + Date.now());
    const data = await res.json();
    if (!data.ok) throw new Error(data.error);
    renderResults(data.counts || {});
  } catch (e) {
    if (!lastCounts) $("bars").innerHTML = '<p class="empty">Hasil belum bisa dimuat. Periksa link Web App lalu tekan Muat ulang.</p>';
  }
}

$("refresh").addEventListener("click", async (e) => {
  e.currentTarget.textContent = "Memuat...";
  await loadResults();
  e.currentTarget.textContent = "Muat ulang";
});

loadResults();
