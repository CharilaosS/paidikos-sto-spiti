'use strict';

const DAYS = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
const MONTHS = ['Ιανουαρίου','Φεβρουαρίου','Μαρτίου','Απριλίου','Μαΐου','Ιουνίου',
                'Ιουλίου','Αυγούστου','Σεπτεμβρίου','Οκτωβρίου','Νοεμβρίου','Δεκεμβρίου'];

const KIND_LABEL = {
  move:'κίνηση', art:'τέχνη', word:'λόγος', faith:'πίστη', sense:'αίσθηση',
  practical:'πρακτικά', nature:'φύση', free:'ελεύθερο'
};

let DATA = {};
let view = 'today';

// --- ημερομηνίες (τοπική ώρα, χωρίς UTC μετατοπίσεις) ---
const iso  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const daysBetween = (a,b) => Math.round((fromIso(b) - fromIso(a)) / 86400000);
const prettyDate = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const shortDate = s => { const d = fromIso(s); return `${d.getDate()}/${d.getMonth()+1}`; };

const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function currentTheme(today) {
  const t = iso(today);
  return DATA.themes.find(x => x.start <= t && t <= x.end)
      || (t < DATA.themes[0].start ? DATA.themes[0] : DATA.themes[DATA.themes.length-1]);
}

// Δύο δραστηριότητες την ημέρα: μία Α (πρωί) και μία Β (απόγευμα).
// Η επιλογή είναι σταθερή για κάθε ημερομηνία — ίδια σε κάθε συσκευή, ίδια όλη μέρα.
function activitiesFor(theme, today) {
  const all = DATA.activities[String(theme.id)] || [];
  const A = all.filter(a => a.slot === 'A');
  const B = all.filter(a => a.slot === 'B');
  let i = daysBetween(theme.start, iso(today));
  if (i < 0) i = 0;
  return [ A.length ? A[i % A.length] : null, B.length ? B[i % B.length] : null ].filter(Boolean);
}

function feastsOn(dateStr) {
  return DATA.feasts.filter(f => f.date === dateStr);
}

// --- rendering blocks ---
function actCard(a, label) {
  const mats = a.materials && a.materials.length
    ? `<p class="mats"><b>Υλικά:</b> ${esc(a.materials.join(' · '))}</p>`
    : `<p class="mats"><b>Υλικά:</b> τίποτα — μόνο εσείς οι δύο</p>`;
  const steps = a.steps.map(s => `<li>${esc(s)}</li>`).join('');
  const where = a.place === 'out' ? 'έξω' : 'μέσα';
  return `<article class="card act">
    <div class="slot">${esc(label)} · ${esc(KIND_LABEL[a.kind] || a.kind)} · ${where}</div>
    <h3>${esc(a.title)}</h3>
    ${mats}
    <details open><summary>Πώς το κάνουμε</summary><ul>${steps}</ul></details>
  </article>`;
}

function routineList(now) {
  const steps = DATA.routine.steps;
  const nowMin = now.getHours()*60 + now.getMinutes();
  const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  let cur = -1;
  steps.forEach((s,i) => { if (toMin(s.time) <= nowMin) cur = i; });

  return steps.map((s,i) => {
    const cls = i === cur ? 'step now' : (i < cur ? 'step past' : 'step');
    const d = s.detail ? `<div class="d">${esc(s.detail)}</div>` : '';
    return `<div class="${cls}"><div class="t">${esc(s.time)}</div>
      <div class="b"><b>${esc(s.title)}</b>${d}</div></div>`;
  }).join('');
}

function themeCard(th, today) {
  const feasts = (th.feasts || []).map(f => `<span class="pill faith">${esc(f)}</span>`).join('');
  const goals = (th.goals || []).map(g => `<li>${esc(g)}</li>`).join('');
  return `<section class="card theme">
    <div class="theme-emoji">${esc(th.emoji || '•')}</div>
    <div class="theme-title">${esc(th.title)}</div>
    <div class="theme-dates">${shortDate(th.start)} – ${shortDate(th.end)}</div>
    ${feasts ? `<div style="margin-top:10px">${feasts}</div>` : ''}
    ${goals ? `<p class="small muted" style="margin:12px 0 0"><b>Τι δουλεύουμε</b></p><ul class="small">${goals}</ul>` : ''}
    ${th.song ? `<p class="small muted" style="margin:10px 0 0">🎵 ${esc(th.song)}<br>📖 ${esc(th.book || '')}</p>` : ''}
  </section>`;
}

// --- views ---
function viewToday() {
  const now = new Date();
  const th = currentTheme(now);
  const acts = activitiesFor(th, now);
  const todaysFeasts = feastsOn(iso(now));

  const feastHtml = todaysFeasts.map(f => `<section class="card">
      <span class="pill ${f.kind === 'national' ? 'national' : 'faith'}">${f.kind === 'national' ? 'Εθνική εορτή' : 'Γιορτή'}</span>
      <h3>${esc(f.title)}</h3><p class="small">${esc(f.kid)}</p></section>`).join('');

  return `
    ${feastHtml}
    ${themeCard(th, now)}
    <h2>Οι δραστηριότητες σήμερα</h2>
    ${acts.length ? acts.map((a,i) => actCard(a, i === 0 ? 'Πρωί — 09:40' : 'Απόγευμα — 15:45')).join('')
                  : '<p class="muted">Δεν έχουν γραφτεί ακόμη δραστηριότητες για αυτή τη θεματική.</p>'}
    <h2>Η μέρα μας</h2>
    <section class="card">${routineList(now)}</section>`;
}

function viewWeek() {
  const now = new Date();
  const th = currentTheme(now);
  const all = DATA.activities[String(th.id)] || [];

  const mats = [...new Set(all.flatMap(a => a.materials || []))].sort((a,b) => a.localeCompare(b,'el'));
  const matsHtml = mats.length
    ? `<ul>${mats.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`
    : '<p class="muted small">Δεν χρειάζεται τίποτα ιδιαίτερο.</p>';

  return `
    ${themeCard(th, now)}
    <h2>Να ετοιμαστούν</h2>
    <section class="card">
      <p class="small muted">Όλα τα υλικά που ζητούν οι δραστηριότητες αυτής της θεματικής.</p>
      ${matsHtml}
    </section>
    <h2>Όλες οι δραστηριότητες της θεματικής</h2>
    ${all.map(a => actCard(a, a.slot === 'A' ? 'Πρωινή' : 'Απογευματινή')).join('')}`;
}

function viewRoutine() {
  return `<h2>Ημερήσιο πρόγραμμα</h2>
    <section class="card">${routineList(new Date())}</section>
    <section class="card">
      <h3>Τρεις κανόνες</h3>
      <ul class="small">
        <li>Η προσοχή σε αυτή την ηλικία κρατάει 5-10 λεπτά. Σταματάμε όταν χαθεί το ενδιαφέρον, όχι όταν τελειώσει το πλάνο.</li>
        <li>Καμία δραστηριότητα δεν είναι υποχρεωτική. Ό,τι δεν θέλει σήμερα, το ξαναπροτείνουμε άλλη μέρα.</li>
        <li>Η επανάληψη είναι το ζητούμενο. Το ίδιο τραγούδι για δέκα μέρες είναι φυσιολογικό.</li>
      </ul>
    </section>`;
}

function viewThemes() {
  const now = iso(new Date());
  const rows = DATA.themes.map(t => {
    const on = (t.start <= now && now <= t.end) ? ' on' : '';
    return `<div class="row${on}"><span>${esc(t.emoji || '')} ${esc(t.title)}</span>
      <span class="d">${shortDate(t.start)}–${shortDate(t.end)}</span></div>`;
  }).join('');
  return `<h2>Οι θεματικές της χρονιάς</h2>
    <p class="muted small">Οι γιορτές είναι κλειδωμένες στην ημερομηνία τους. Οι υπόλοιπες μετακινούνται ελεύθερα — αν κάτι τον κερδίσει, μένει περισσότερο.</p>
    <section class="card">${rows}</section>`;
}

function viewFeasts() {
  const today = iso(new Date());
  const upcoming = DATA.feasts.filter(f => f.date >= today);
  const list = (upcoming.length ? upcoming : DATA.feasts).slice(0, 12);
  return `<h2>Τι γιορτάζουμε</h2>
    ${list.map(f => `<section class="card">
      <span class="pill ${f.kind === 'national' ? 'national' : 'faith'}">${shortDate(f.date)}</span>
      <h3>${esc(f.title)}</h3><p class="small">${esc(f.kid)}</p></section>`).join('')}`;
}

const VIEWS = { today: viewToday, week: viewWeek, routine: viewRoutine, themes: viewThemes, feasts: viewFeasts };

function render() {
  document.getElementById('app').innerHTML = VIEWS[view]();
  window.scrollTo(0, 0);
}

document.getElementById('tabs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  view = b.dataset.view;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  render();
});

(async function init() {
  document.getElementById('topDate').textContent = prettyDate(new Date());
  try {
    const [routine, themes, activities, feasts] = await Promise.all(
      ['routine','themes','activities','feasts'].map(n =>
        fetch(`data/${n}.json?v=1`).then(r => {
          if (!r.ok) throw new Error(`${n}: ${r.status}`);
          return r.json();
        }))
    );
    DATA = { routine, themes, activities, feasts };
    render();
  } catch (err) {
    document.getElementById('app').innerHTML =
      `<section class="card"><h3>Κάτι δεν φόρτωσε</h3><p class="small muted">${esc(err.message)}</p></section>`;
  }
})();
