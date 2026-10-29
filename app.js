'use strict';

const DAYS = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
const MONTHS = ['Ιανουαρίου','Φεβρουαρίου','Μαρτίου','Απριλίου','Μαΐου','Ιουνίου',
                'Ιουλίου','Αυγούστου','Σεπτεμβρίου','Οκτωβρίου','Νοεμβρίου','Δεκεμβρίου'];

// Κατηγορίες δραστηριοτήτων: εικονίδιο + ετικέτα
const CATS = {
  move:      ['🤸', 'Κίνηση'],
  musicmove: ['💃', 'Μουσικοκινητική & χορός'],
  music:     ['🎵', 'Μουσική & τραγούδι'],
  art:       ['🎨', 'Ζωγραφική'],
  craft:     ['✂️', 'Κατασκευή'],
  messy:     ['🫧', 'Messy play'],
  story:     ['📖', 'Λόγος & παραμύθι'],
  drama:     ['🎭', 'Κουκλοθέατρο & ρόλοι'],
  math:      ['🧩', 'Ταξινόμηση & μέτρημα'],
  practical: ['🧺', 'Πρακτική ζωή'],
  cook:      ['🍪', 'Μαγειρική'],
  nature:    ['🌿', 'Φύση'],
  faith:     ['☦️', 'Πίστη'],
};
const PLACE = { in:'μέσα', balcony:'μπαλκόνι', park:'παιδική χαρά', yard:'αυλή (χωριό)', church:'εκκλησία' };

let DATA = {};
let view = 'today';
let ideasCat = '';

// --- ημερομηνίες (τοπική ώρα, χωρίς UTC μετατοπίσεις) ---
const iso  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a,b) => Math.round((fromIso(b) - fromIso(a)) / 86400000);
const prettyDate = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const shortDate = s => { const d = fromIso(s); return `${d.getDate()}/${d.getMonth()+1}`; };
const weekday = s => { const w = fromIso(s).getDay(); return w === 0 ? 7 : w; };   // 1=Δευτέρα … 7=Κυριακή

const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function currentTheme(dateStr) {
  return DATA.themes.find(x => x.start <= dateStr && dateStr <= x.end)
      || (dateStr < DATA.themes[0].start ? DATA.themes[0] : DATA.themes[DATA.themes.length-1]);
}

// Δύο δραστηριότητες την ημέρα: η Α (πρωί) και η Β (απόγευμα) της συγκεκριμένης μέρας της εβδομάδας.
// Ίδιες σε κάθε συσκευή και όλη μέρα, γιατί προκύπτουν μόνο από την ημερομηνία.
function activitiesFor(theme, dateStr) {
  const all = DATA.activities[String(theme.id)] || [];
  const day = weekday(dateStr);
  const pick = slot => all.find(a => a.day === day && a.slot === slot)
                    || fallback(all.filter(a => a.slot === slot), daysBetween(theme.start, dateStr));
  return [pick('A'), pick('B')].filter(Boolean);
}
const fallback = (list, i) => list.length ? list[Math.max(i, 0) % list.length] : null;

const feastsOn = dateStr => DATA.feasts.filter(f => f.date === dateStr);

// Πρωινή εκκλησία: κάθε Κυριακή και στις μεγάλες γιορτές με πρωινή λειτουργία
function morningChurch(dateStr) {
  return weekday(dateStr) === 7 || feastsOn(dateStr).some(f => f.church && f.churchTime !== 'evening');
}

// --- rendering blocks ---
function catTag(a) {
  const [ic, label] = CATS[a.cat] || ['•', a.cat || ''];
  return `${ic} ${esc(label)}`;
}

function actCard(a, label, open = true) {
  const mats = a.materials && a.materials.length
    ? `<p class="mats"><b>Υλικά:</b> ${esc(a.materials.join(' · '))}</p>`
    : `<p class="mats"><b>Υλικά:</b> τίποτα — μόνο εσείς οι δύο</p>`;
  const steps = (a.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
  const meta = [PLACE[a.place] || '', a.minutes ? `${a.minutes}′` : ''].filter(Boolean).join(' · ');
  const res = (a.resources || []).map(r =>
    `<a class="res" href="${esc(r.href)}" target="_blank" rel="noopener">📄 ${esc(r.label)}</a>`).join('');
  return `<article class="card act cat-${esc(a.cat || '')}">
    <div class="slot">${label ? esc(label) + ' · ' : ''}${catTag(a)}</div>
    <h3>${esc(a.title)}</h3>
    <div class="meta">${esc(meta)}</div>
    ${mats}
    ${res ? `<div class="resrow">${res}</div>` : ''}
    <details ${open ? 'open' : ''}><summary>Πώς το κάνουμε</summary><ol>${steps}</ol>
      ${a.why ? `<p class="small muted"><b>Τι κερδίζει:</b> ${esc(a.why)}</p>` : ''}
      ${a.tip ? `<p class="small muted"><b>Συμβουλή:</b> ${esc(a.tip)}</p>` : ''}
      ${a.alt ? `<p class="small muted"><b>Αν μείνουμε στην πόλη:</b> ${esc(a.alt)}</p>` : ''}
      ${/^https?:\/\//.test(a.source || '') ? `<p class="small muted"><a href="${esc(a.source)}" target="_blank" rel="noopener">Πηγή της ιδέας ↗</a></p>` : ''}
    </details>
  </article>`;
}

function routineSteps(dateStr) {
  const steps = DATA.routine.steps;
  if (!morningChurch(dateStr) || !DATA.routine.church) return steps;
  const kept = steps.filter(s => !s.skipOnChurch);
  const after = { time: '11:30', title: 'Δραστηριότητα Α', kind: 'activityA',
                  detail: 'Μετά την εκκλησία — ήπια και σύντομη.' };
  return [...kept, DATA.routine.church, after].sort((a,b) => a.time.localeCompare(b.time));
}

function routineList(now) {
  const steps = routineSteps(iso(now));
  const nowMin = now.getHours()*60 + now.getMinutes();
  const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  let cur = -1;
  steps.forEach((s,i) => { if (toMin(s.time) <= nowMin) cur = i; });

  return steps.map((s,i) => {
    const cls = i === cur ? 'step now' : (i < cur ? 'step past' : 'step');
    const d = s.detail ? `<div class="d">${esc(s.detail)}</div>` : '';
    return `<div class="${cls}${s.kind === 'church' ? ' church' : ''}"><div class="t">${esc(s.time)}</div>
      <div class="b"><b>${esc(s.title)}</b>${d}</div></div>`;
  }).join('');
}

function feastCard(f) {
  const tag = f.kind === 'national' ? ['national', 'Εθνική εορτή']
            : f.kind === 'custom' ? ['custom', 'Έθιμο'] : ['faith', 'Γιορτή'];
  const church = f.church ? `<p class="small church-note">⛪ ${f.churchTime === 'evening' ? 'Το απόγευμα πάμε εκκλησία.' : 'Σήμερα πάμε εκκλησία.'}</p>` : '';
  return `<section class="card feast">
    <span class="pill ${tag[0]}">${tag[1]}</span>
    <h3>${esc(f.title)}</h3>${f.kid ? `<p class="small">${esc(f.kid)}</p>` : ''}${church}</section>`;
}

function themeCard(th, compact = false) {
  const feasts = DATA.feasts.filter(f => f.date >= th.start && f.date <= th.end)
    .map(f => `<span class="pill ${f.kind === 'national' ? 'national' : 'faith'}">${shortDate(f.date)} · ${esc(f.title)}</span>`).join('');
  const goals = (th.goals || []).map(g => `<li>${esc(g)}</li>`).join('');
  const words = (th.words || []).length ? `<p class="small" style="margin:10px 0 0"><b>Λέξεις της εβδομάδας:</b> ${esc(th.words.join(' · '))}</p>` : '';
  return `<section class="card theme">
    <div class="theme-emoji">${esc(th.emoji || '•')}</div>
    <div class="theme-title">${esc(th.title)}</div>
    <div class="theme-dates">Εβδομάδα ${shortDate(th.start)} – ${shortDate(th.end)}</div>
    ${feasts ? `<div style="margin-top:10px">${feasts}</div>` : ''}
    ${th.song ? `<p class="small" style="margin:10px 0 0">🎵 <b>Τραγούδι:</b> ${esc(th.song)}${th.book ? `<br>📖 <b>Βιβλίο:</b> ${esc(th.book)}` : ''}</p>` : ''}
    ${compact ? '' : words}
    ${!compact && goals ? `<p class="small muted" style="margin:12px 0 0"><b>Τι δουλεύουμε</b></p><ul class="small">${goals}</ul>` : ''}
  </section>`;
}

// Μικρά παιχνίδια στο games/ — ανοίγουν σε πλήρη οθόνη, κλείνουν μόνα τους μετά από ~5 λεπτά
function gameCard() {
  return `<a class="card game" href="games/kairos/">
    <img src="games/kairos/img/icon-180.png" alt="">
    <span><b>🎮 Παιχνίδι: Ο καιρός του Πέτρου</b>
    Ήλιος, βροχή ή χιόνι — ο Πέτρος ντύνεται ανάλογα. Κλείνει μόνο του σε 5 λεπτά·
    για έξοδο νωρίτερα, κρατήστε πατημένο το ✕ πάνω αριστερά.</span>
  </a>`;
}

// --- views ---
function viewToday() {
  const now = new Date();
  const today = iso(now);
  const th = currentTheme(today);
  const acts = activitiesFor(th, today);
  const church = morningChurch(today);
  const wkend = weekday(today) >= 6;
  const labels = [church ? 'Μετά την εκκλησία' : 'Πρωί — 09:45', 'Απόγευμα — 16:45'];

  return `
    ${feastsOn(today).map(feastCard).join('')}
    ${church && !feastsOn(today).some(f => f.church) ? `<section class="card feast"><h3>⛪ Κυριακή — πάμε εκκλησία</h3><p class="small">Η πρωινή δραστηριότητα γίνεται ήπια, μετά την εκκλησία.</p></section>` : ''}
    ${themeCard(th, true)}
    ${gameCard()}
    <h2>Οι δραστηριότητες σήμερα</h2>
    ${wkend ? '<p class="small muted">Σαββατοκύριακο — αν είμαστε στο χωριό, ό,τι γίνεται έξω πάει στην αυλή.</p>' : ''}
    ${acts.length ? acts.map((a,i) => actCard(a, labels[i])).join('')
                  : '<p class="muted">Δεν έχουν γραφτεί ακόμη δραστηριότητες για αυτή την εβδομάδα.</p>'}
    <h2>Η μέρα μας</h2>
    <section class="card">${routineList(now)}</section>`;
}

function viewWeek() {
  const today = iso(new Date());
  const th = currentTheme(today);
  const all = DATA.activities[String(th.id)] || [];

  const mats = [...new Set(all.flatMap(a => a.materials || []))].sort((a,b) => a.localeCompare(b,'el'));
  const buy = [...new Set(all.flatMap(a => a.buy || []))];
  const matsHtml = mats.length ? `<ul class="small cols">${mats.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`
                               : '<p class="muted small">Δεν χρειάζεται τίποτα ιδιαίτερο.</p>';

  const days = [0,1,2,3,4,5,6].map(i => {
    const d = addDays(th.start, i);
    const on = d === today ? ' on' : '';
    const fe = feastsOn(d).map(f => `<span class="pill faith">${esc(f.title)}</span>`).join('');
    const items = activitiesFor(th, d).map((a,j) =>
      `<details class="mini"><summary><span class="slotmini">${j === 0 ? 'Α' : 'Β'}</span> ${(CATS[a.cat] || ['•'])[0]} ${esc(a.title)}</summary>${actCard(a, j === 0 ? 'Πρωί' : 'Απόγευμα')}</details>`).join('');
    return `<section class="card day${on}">
      <div class="day-head"><b>${DAYS[fromIso(d).getDay()]} ${shortDate(d)}</b>${morningChurch(d) ? ' ⛪' : ''}</div>
      ${fe ? `<div style="margin:6px 0 0">${fe}</div>` : ''}
      ${items}
    </section>`;
  }).join('');

  return `
    ${themeCard(th)}
    ${th.parent_note ? `<section class="card"><h3>Για να στήσουμε την εβδομάδα</h3><p class="small">${esc(th.parent_note)}</p></section>` : ''}
    <h2>Μέρα-μέρα</h2>
    ${days}
    <h2>Να ετοιμαστούν</h2>
    <section class="card">
      <p class="small muted">Όσα ζητούν οι δραστηριότητες της εβδομάδας.</p>
      ${matsHtml}
      ${buy.length ? `<p class="small" style="margin-top:12px"><b>Αν θέλουμε να αγοράσουμε:</b> ${esc(buy.join(' · '))}</p>` : ''}
    </section>`;
}

function viewIdeas() {
  const th = currentTheme(iso(new Date()));
  const chips = Object.entries(CATS).map(([k,[ic,l]]) =>
    `<button class="chip${ideasCat === k ? ' on' : ''}" data-cat="${k}">${ic} ${esc(l)}</button>`).join('');
  // Αυτή και η επόμενη εβδομάδα — για να διαλέξει άλλη δραστηριότητα αν η σημερινή δεν «κάθεται»
  const next = DATA.themes.find(t => t.start > th.end);
  const pool = [th, next].filter(Boolean).flatMap(t =>
    (DATA.activities[String(t.id)] || []).map(a => ({...a, _t: t})));
  const list = pool.filter(a => !ideasCat || a.cat === ideasCat);
  return `<h2>Ιδέες ανά κατηγορία</h2>
    <p class="small muted">Αν η σημερινή δραστηριότητα δεν τον τραβάει, διάλεξε άλλη από αυτή ή την επόμενη εβδομάδα.</p>
    <div class="chips">${chips}</div>
    ${list.length ? list.map(a => actCard(a, `${a._t.emoji} ${a._t.title}`, false)).join('')
                  : '<p class="muted small">Καμία δραστηριότητα σε αυτή την κατηγορία αυτές τις δύο εβδομάδες.</p>'}`;
}

function viewRoutine() {
  return `<h2>Ημερήσιο πρόγραμμα</h2>
    <section class="card">${routineList(new Date())}</section>
    <section class="card">
      <h3>Τρεις κανόνες</h3>
      <ul class="small">
        <li>Η προσοχή σε αυτή την ηλικία κρατάει 5-10 λεπτά. Σταματάμε όταν χαθεί το ενδιαφέρον, όχι όταν τελειώσει το πλάνο.</li>
        <li>Καμία δραστηριότητα δεν είναι υποχρεωτική. Ό,τι δεν θέλει σήμερα, το ξαναπροτείνουμε άλλη μέρα.</li>
        <li>Η επανάληψη είναι το ζητούμενο. Το ίδιο τραγούδι όλη την εβδομάδα είναι φυσιολογικό.</li>
      </ul>
    </section>
    <section class="card">
      <h3>⛪ Κυριακές & μεγάλες γιορτές</h3>
      <p class="small">Το πρωί πάμε εκκλησία. Γυμναστική, κύκλος και βόλτα παραλείπονται· η δραστηριότητα Α γίνεται ήπια, μετά την εκκλησία.</p>
    </section>`;
}

function viewThemes() {
  const now = iso(new Date());
  const rows = DATA.themes.map(t => {
    const cls = (t.start <= now && now <= t.end) ? ' on' : (t.end < now ? ' past' : '');
    return `<div class="row${cls}"><span>${esc(t.emoji || '')} ${esc(t.title)}</span>
      <span class="d">${shortDate(t.start)}</span></div>`;
  }).join('');
  return `<h2>Οι θεματικές της χρονιάς</h2>
    <p class="muted small">Μία θεματική την εβδομάδα. Οι γιορτές είναι κλειδωμένες στην ημερομηνία τους· οι υπόλοιπες μπορούν να μετακινηθούν.</p>
    <section class="card">${rows}</section>`;
}

function viewFeasts() {
  const today = iso(new Date());
  const upcoming = DATA.feasts.filter(f => f.date >= today);
  const list = (upcoming.length ? upcoming : DATA.feasts).slice(0, 14);
  return `<h2>Τι γιορτάζουμε</h2>
    ${list.map(f => `<section class="card">
      <span class="pill ${f.kind === 'national' ? 'national' : 'faith'}">${DAYS[fromIso(f.date).getDay()]} ${shortDate(f.date)}</span>
      <h3>${esc(f.title)}</h3>${f.kid ? `<p class="small">${esc(f.kid)}</p>` : ''}
      ${f.church ? `<p class="small church-note">⛪ ${f.churchTime === 'evening' ? 'Εκκλησία το απόγευμα' : 'Εκκλησία το πρωί'}</p>` : ''}</section>`).join('')}`;
}

const VIEWS = { today: viewToday, week: viewWeek, ideas: viewIdeas, routine: viewRoutine, themes: viewThemes, feasts: viewFeasts };

function render() {
  document.getElementById('app').innerHTML = VIEWS[view]();
}

document.getElementById('tabs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  view = b.dataset.view;
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  render();
  window.scrollTo(0, 0);
});

document.getElementById('app').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  ideasCat = ideasCat === c.dataset.cat ? '' : c.dataset.cat;
  render();
});

(async function init() {
  document.getElementById('topDate').textContent = prettyDate(new Date());
  try {
    const [routine, themes, activities, feasts] = await Promise.all(
      ['routine','themes','activities','feasts'].map(n =>
        fetch(`data/${n}.json`, { cache: 'no-cache' }).then(r => {
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
