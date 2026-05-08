(function(){
  'use strict';

  // ════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════
  const state = {
    curriculum: null,
    gender:     'men',
    currentDay: 1,
    progress:   {},
    loaded:     false,
    theme:      'dark',
    loadError:  null
  };

  const todayIndex = () => {
    const n = new Date();
    const s = new Date(n.getFullYear(), 0, 0);
    return Math.max(1, Math.min(365, Math.floor((n - s) / 864e5)));
  };

  // ════════════════════════════════════════════
  // DOM
  // ════════════════════════════════════════════
  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function getEl(id) {
    const el = document.querySelector(id);
    if (!el) throw new Error(`Missing DOM: ${id}`);
    return el;
  }

  // ════════════════════════════════════════════
  // THEME
  // ════════════════════════════════════════════
  function loadTheme() {
    const t = localStorage.getItem('flourish-theme');
    if (t) state.theme = t;
    applyTheme();
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const btn = $('#theme-toggle');
    if (btn) btn.textContent = state.theme === 'dark' ? '🌙' : '☀️';
  }
  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('flourish-theme', state.theme);
    applyTheme();
  }

  // ════════════════════════════════════════════
  // CURRICULUM LOAD
  // ════════════════════════════════════════════
  async function loadCurriculum() {
    if (state.loaded) return;
    renderLoading();
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 30_000);
      const r = await fetch('data/curriculum-enriched.json', { signal: ctrl.signal });
      if (!r.ok) throw new Error('Failed to load curriculum');
      state.curriculum = await r.json();
      state.loaded = true;
      state.currentDay = todayIndex();
      loadProgress();
      loadGender();
      const page = location.hash.replace('#','') || 'devotional';
      showPage(page);
      toast(state.theme === 'dark' ? '🌙 Welcome back to the Garden.' : '☀️ Welcome back to the Garden.');
    } catch (err) {
      state.loadError = err.message || 'Connection failed.';
      renderError(state.loadError);
    }
  }

  function renderLoading() {
    const m = $('#main');
    m.innerHTML = `
      <div class="sacred-loader card-enter">
        <div class="seed-glyph">🌱</div>
        <p class="loader-text">Preparing your daily seed...</p>
        <p class="loader-sub">God's Word is being planted for Day ${todayIndex()}</p>
      </div>`;
    updateActiveNav('devotional');
  }

  function renderError(msg) {
    const m = $('#main');
    m.innerHTML = `
      <div class="error-state card-enter">
        <div class="error-icon">📶</div>
        <p class="error-msg">${esc(msg)}</p>
        <button class="btn btn-primary" style="width:auto" onclick="app.reload()">Try Again</button>
      </div>`;
  }

  // ════════════════════════════════════════════
  // STORAGE
  // ════════════════════════════════════════════
  function loadProgress() {
    try { state.progress = JSON.parse(localStorage.getItem('flourish-progress')||'{}'); }
    catch(e){ state.progress = {}; }
  }
  function saveProgress() {
    localStorage.setItem('flourish-progress', JSON.stringify(state.progress));
  }
  function loadGender() {
    const g = localStorage.getItem('flourish-gender');
    if (g) { state.gender = g; updateGenderUI(); }
  }
  function saveGender() {
    localStorage.setItem('flourish-gender', state.gender);
  }

  // ════════════════════════════════════════════
  // GENDER TOGGLE
  // ════════════════════════════════════════════
  function updateGenderUI() {
    const t = $('#gender-toggle');
    if (!t) return;
    t.classList.toggle('women', state.gender === 'women');
  }

  // ════════════════════════════════════════════
  // NAVIGATION
  // ════════════════════════════════════════════
  function showPage(name) {
    if (name === 'devotional' && !state.loaded) { renderLoading(); return; }
    if (!state.loaded && name !== 'devotional') { renderError('Still planting your seeds...'); return; }
    updateActiveNav(name);
    location.hash = name;
    window.scrollTo(0,0);
    switch(name) {
      case 'devotional': renderDevotional(); break;
      case 'progress':   renderProgress(); break;
      case 'churches':   renderChurches(); break;
      case 'events':     renderEvents(); break;
      case 'store':      renderStore(); break;
      case 'profile':    renderProfile(); break;
      default:           renderDevotional();
    }
  }

  function updateActiveNav(name) {
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  }

  // ════════════════════════════════════════════
  // PLANT SVG — THE SACRED GARDEN
  // ════════════════════════════════════════════
  function plantStage(pct) {
    // 0%=dormant_seed, 10%=sprouting, 25%=seedling, 50%=sapling,
    // 70%=young_tree, 85%=mature_tree, 100%=fruitful_tree
    let stage, name, next;
    if (pct >= 100)       { stage = 6; name = 'Fruitful Tree'; next = 'You have borne much fruit!'; }
    else if (pct >= 85)   { stage = 5; name = 'Mature Tree';   next = 'Bearing fruit — press on!'; }
    else if (pct >= 70)   { stage = 4; name = 'Young Tree';    next = 'Growing tall in the Lord.'; }
    else if (pct >= 50)   { stage = 3; name = 'Sapling';       next = 'Deep roots forming...'; }
    else if (pct >= 25)   { stage = 2; name = 'Seedling';       next = 'A shoot springs up!'; }
    else if (pct >= 10)   { stage = 1; name = 'Sprouting';      next = 'The seed breaks ground.'; }
    else                  { stage = 0; name = 'Dormant Seed';     next = 'Faith is the seed. Begin.'; }

    const leaves = (n,c) => Array.from({length:n},(_,i) =>
      `<circle cx="${100 + Math.cos(i*Math.PI*2/n)*35}" cy="${160 + Math.sin(i*Math.PI*2/n)*25}" r="${16+i*2}" fill="${c}" opacity="0.75"/>`
    ).join('');

    const stages = [
      // 0: Dormant seed
      `<ellipse cx="100" cy="195" rx="14" ry="10" fill="#8B6914" opacity="0.6"/>
       <path d="M 100 195 L 100 185" stroke="#5a8f6e" stroke-width="2" stroke-dasharray="4 2" opacity="0.4"/>`,
      // 1: Sprouting
      `<ellipse cx="100" cy="198" rx="16" ry="10" fill="#6B520F" opacity="0.5"/>
       <path d="M 100 195 Q 100 180 96 170 M 100 195 Q 102 178 106 172" stroke="#4a7a5e" stroke-width="2.5" fill="none"/>
       <ellipse cx="96" cy="168" rx="4" ry="6" fill="#5a9e6f" opacity="0.6"/>
       <ellipse cx="107" cy="170" rx="4" ry="5" fill="#5a9e6f" opacity="0.55"/>`,
      // 2: Seedling
      `<path d="M 100 200 Q 98 180 100 160 Q 102 140 100 120" stroke="#4a7a5e" stroke-width="3" fill="none"/>
       <ellipse cx="100" cy="200" rx="18" ry="10" fill="#6B520F" opacity="0.4"/>
       ${leaves(4,'#5a9e6f')}
       <path d="M 92 200 Q 88 190 85 185 M 108 200 Q 112 190 115 185" stroke="#7a6fae" stroke-width="1.5" fill="none" opacity="0.6"/>`,
      // 3: Sapling
      `<path d="M 100 200 Q 96 170 98 130 Q 100 100 100 80" stroke="#3d6b50" stroke-width="4" fill="none"/>
       <ellipse cx="100" cy="200" rx="22" ry="11" fill="#5e4208" opacity="0.35"/>
       ${leaves(7,'#5a9e6f')}
       <path d="M 100 140 Q 110 130 120 125 M 100 110 Q 90 100 82 95" stroke="#3d6b50" stroke-width="2.5" fill="none" opacity="0.7"/>
       <path d="M 90 200 Q 84 185 78 180 M 110 200 Q 116 185 122 180" stroke="#8b5a7c" stroke-width="1.5" fill="none" opacity="0.5"/>`,
      // 4: Young tree
      `<path d="M 100 200 Q 94 160 96 110 Q 100 60 100 40" stroke="#2d5a40" stroke-width="5" fill="none"/>
       <ellipse cx="100" cy="200" rx="28" ry="12" fill="#3a2a08" opacity="0.3"/>
       ${leaves(10,'#4a8a5e')}
       <circle cx="100" cy="55" r="25" fill="#3d6b50" opacity="0.15"/>
       <path d="M 100 90 Q 120 75 135 70 M 100 70 Q 80 55 70 50" stroke="#2d5a40" stroke-width="3" fill="none" opacity="0.6"/>
       <path d="M 84 200 Q 75 180 68 172 M 116 200 Q 125 180 132 172" stroke="#7a6fae" stroke-width="2" fill="none" opacity="0.45"/>`,
      // 5: Mature tree
      `<path d="M 100 200 Q 92 150 94 90 Q 98 40 100 20" stroke="#1a4a30" stroke-width="6" fill="none"/>
       <ellipse cx="100" cy="200" rx="35" ry="14" fill="#2a1905" opacity="0.25"/>
       ${leaves(14,'#3a8a55')}
       <circle cx="100" cy="35" r="40" fill="#2d5a40" opacity="0.12"/>
       <circle cx="100" cy="90" r="35" fill="#2d5a40" opacity="0.08"/>
       <path d="M 100 75 Q 130 55 150 45 M 100 55 Q 70 38 55 30" stroke="#1a4a30" stroke-width="3" fill="none" opacity="0.5"/>
       <path d="M 100 110 Q 125 95 140 90" stroke="#1a4a30" stroke-width="2.5" fill="none" opacity="0.4"/>
       <path d="M 78 200 Q 68 175 58 165 M 122 200 Q 132 175 142 165" stroke="#7a6fae" stroke-width="2" fill="none" opacity="0.4"/>`,
      // 6: Fruitful tree
      `<path d="M 100 200 Q 90 140 92 70 Q 96 25 100 5" stroke="#143d28" stroke-width="7" fill="none"/>
       <ellipse cx="100" cy="200" rx="42" ry="16" fill="#1f1403" opacity="0.2"/>
       ${leaves(18,'#2a9e50')}
       <circle cx="100" cy="25" r="50" fill="#1a4a30" opacity="0.1"/>
       <circle cx="100" cy="80" r="45" fill="#1a4a30" opacity="0.07"/>
       <path d="M 100 60 Q 140 35 165 22 M 100 45 Q 60 22 38 12" stroke="#143d28" stroke-width="3.5" fill="none" opacity="0.5"/>
       <path d="M 100 95 Q 135 75 155 65" stroke="#143d28" stroke-width="2.5" fill="none" opacity="0.4"/>
       // fruits of the Spirit
       <circle cx="85" cy="50" r="5" fill="#c9a84c" opacity="0.8"/>
       <circle cx="120" cy="65" r="4.5" fill="#c9a84c" opacity="0.75"/>
       <circle cx="105" cy="35" r="5.5" fill="#c9a84c" opacity="0.85"/>
       <circle cx="78" cy="80" r="4" fill="#c9a84c" opacity="0.7"/>
       <circle cx="130" cy="85" r="4.5" fill="#c9a84c" opacity="0.72"/>`
    ];

    const svg = stages[stage];
    return { stage, name, next, svg };
  }

  function renderPlant(pct) {
    const { stage, name, next, svg } = plantStage(pct);
    return `
      <svg class="plant-stage float" viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg"
           style="width:180px;height:200px;margin:0 auto;display:block;"
           role="img" aria-label="${name}">
        <defs>
          <linearGradient id="trunk" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="var(--accent-soft)"/>
            <stop offset="50%" stop-color="var(--accent)"/>
            <stop offset="100%" stop-color="var(--accent-soft)"/>
          </linearGradient>
          <filter id="soilGlow"><feGaussianBlur stdDeviation="2"/></filter>
        </defs>
        <ellipse cx="100" cy="210" rx="45" ry="8" fill="var(--surface-2)" opacity="0.5"/>
        ${svg}
      </svg>
      <script>/* no-op for hydration */</script>`;
  }

  // ════════════════════════════════════════════
  // PAGE: DEVOTIONAL
  // ════════════════════════════════════════════
  function renderDevotional() {
    const m = $('#main');
    const d = state.curriculum[state.currentDay - 1];
    if (!d) { m.innerHTML = '<div class="empty-state"><div class="e-icon">🌱</div>No seed for this day.</div>'; return; }

    const done = !!state.progress[d.day];
    const t = d[state.gender];
    const prev = d.day > 1 ? d.day - 1 : null;
    const next = d.day < 365 ? d.day + 1 : null;

    m.innerHTML = `
      <div class="devotional-page">
        <div class="day-header card-enter" style="animation-delay:.05s">
          <div class="day-nav-wrap">
            <button class="btn-nav-round" ${prev ? `onclick="app.gotoDay(${prev})"` : 'disabled'}>◀</button>
            <button class="btn-nav-round" ${next ? `onclick="app.gotoDay(${next})"` : 'disabled'}>▶</button>
          </div>
          <div class="day-info">
            <div class="day-eyebrow">${esc(d.pillar)} · Week ${d.week}</div>
            <div class="day-number">Day ${d.day}</div>
            <div class="day-topic">${esc(d.topic)}</div>
            <div class="day-meta">${esc(d.week_theme)}</div>
            <div style="margin-top:8px">
              <span class="pillar-chip ${d.pillar.toLowerCase()}">${d.pillar}</span>
            </div>
          </div>
        </div>

        <div class="scripture-block card-enter" style="animation-delay:.1s">
          <div class="scripture-ref">
            ${esc(d.scripture?.reference)} <span class="version">${esc(d.scripture?.version||'ESV')}</span>
          </div>
          <div class="scripture-text">${esc(d.scripture?.text)}</div>
        </div>

        <div class="card track-card card-enter ${state.gender}" style="animation-delay:.15s">
          <div class="track-label">${state.gender === 'men' ? "💪 The Warrior's Word" : "💜 The Beloved's Word"}</div>
          <div class="track-text">${esc(t?.lesson)}</div>
        </div>

        <div class="card card-enter" style="animation-delay:.2s">
          <div class="card-header"><span class="icon">💡</span> Understanding</div>
          <div style="line-height:1.75;font-size:15px;color:var(--text-muted)">${esc(t?.understanding)}</div>
        </div>

        <div class="card card-enter" style="animation-delay:.25s">
          <div class="card-header"><span class="icon">🙏</span> Prayer</div>
          <div style="line-height:1.75;font-style:italic;font-size:15px">${esc(t?.prayer)}</div>
        </div>

        <div class="card cross-pillar-card card-enter" style="animation-delay:.3s">
          <div class="card-header"><span class="icon">🔗</span> Cross-Pillar Connection</div>
          <div style="line-height:1.65;color:var(--text-muted);font-size:14px">${esc(d.cross_pillar)}</div>
        </div>

        ${enrich(d)}

        <div class="devotional-actions card-enter" style="animation-delay:.5s">
          <button id="mark-complete" class="btn btn-primary ${done?'done':''}" onclick="app.toggleComplete(${d.day})">
            ${done ? '✅ Completed' : 'Mark Complete'}
          </button>
          <button class="btn btn-ghost" onclick="app.shareDay(${d.day})">📤</button>
        </div>
      </div>`;
  }

  function enrich(day) {
    const e = day.enrichment || {};
    const parts = [];
    let delay = 0.35;
    if (e.historical_context) {
      parts.push(`
        <div class="card context-card card-enter" style="animation-delay:${delay}s">
          <div class="card-header"><span class="icon">📜</span> Historical Context</div>
          <div style="line-height:1.7;font-size:14px;color:var(--text-muted)">${esc(e.historical_context)}</div>
        </div>`);
      delay += 0.05;
    }
    if (e.word_study) {
      parts.push(`
        <div class="card word-card card-enter" style="animation-delay:${delay}s">
          <div class="card-header"><span class="icon">🔍</span> Word Study</div>
          <div style="line-height:1.7;font-size:14px;color:var(--text-muted)">${esc(e.word_study)}</div>
        </div>`);
      delay += 0.05;
    }
    if (e.christ_connection) {
      parts.push(`
        <div class="card christ-card card-enter" style="animation-delay:${delay}s">
          <div class="card-header"><span class="icon">✝️</span> Christ Connection</div>
          <div style="line-height:1.7;font-size:14px;color:var(--text-muted)">${esc(e.christ_connection)}</div>
        </div>`);
      delay += 0.05;
    }
    if (e.reflection_questions?.length) {
      parts.push(`
        <div class="card reflect-card card-enter" style="animation-delay:${delay}s">
          <div class="card-header"><span class="icon">💭</span> Reflection</div>
          <div class="reflect-list">
            ${e.reflection_questions.map((q,i)=>`
              <div class="reflect-q" data-n="${i+1}">${esc(q)}</div>
            `).join('')}
          </div>
        </div>`);
    }
    return parts.join('');
  }

  // ════════════════════════════════════════════
  // PAGE: PROGRESS
  // ════════════════════════════════════════════
  function renderProgress() {
    const m = $('#main');
    const done = Object.keys(state.progress).length;
    const pct = Math.min(100, Math.round((done/365)*100));
    const streak = computeStreak();

    const pillars = { Health:0, Wealth:0, Relationships:0, Integration:0 };
    Object.keys(state.progress).forEach(d=>{
      const day=state.curriculum?.[parseInt(d)-1];
      if(day && pillars[day.pillar] !== undefined) pillars[day.pillar]++;
    });

    m.innerHTML = `
      <div class="progress-page">
        <div class="progress-hero card-enter">
          ${renderPlant(pct)}
          <div class="progress-stat">${done}<span>/365</span></div>
          <div class="progress-label">Days Completed</div>
        </div>

        <div class="living-bar card-enter" style="animation-delay:.1s">
          <div class="fill" style="width:${pct}%"></div>
        </div>
        <div class="pct-label card-enter" style="animation-delay:.15s">${pct}% Complete</div>
        <div class="growth-status card-enter" style="animation-delay:.2s">
          <span class="stage-name">${plantStage(pct).name}</span> · ${plantStage(pct).next}
        </div>

        <div class="stats-grid card-enter" style="animation-delay:.25s">
          <div class="stat-diamond"><div class="stat-num">${streak}</div><div class="stat-label">Current Streak</div></div>
          <div class="stat-diamond"><div class="stat-num">${todayIndex()}</div><div class="stat-label">Today's Day</div></div>
          <div class="stat-diamond"><div class="stat-num">${365-done}</div><div class="stat-label">Days Ahead</div></div>
          <div class="stat-diamond"><div class="stat-num">${Math.max(0,Math.floor((done/todayIndex())*100))}%</div><div class="stat-label">On Track</div></div>
        </div>

        <div class="card card-enter" style="animation-delay:.3s">
          <div class="card-header"><span class="icon">🌿</span> The Four Gardens</div>
          <div class="pillar-garden">
            ${pillarBar('Health', pillars.Health, '#5a8f6e')}
            ${pillarBar('Wealth', pillars.Wealth, '#c9a84c')}
            ${pillarBar('Relationships', pillars.Relationships, '#7a6fae')}
            ${pillarBar('Spiritual', pillars.Integration, '#8b5a7c')}
          </div>
        </div>

        <div class="card card-enter" style="animation-delay:.35s">
          <div class="card-header"><span class="icon">📅</span> This Week</div>
          <div class="week-garden">${weekCells()}</div>
        </div>

        <div style="height:12px"></div>
        <button class="btn btn-danger card-enter" style="animation-delay:.4s" onclick="app.resetProgress()">Reset Journey</button>
      </div>`;
  }

  function pillarBar(name, count, hex) {
    const total = Object.keys(state.progress).length || 1;
    const pct = Math.round((count/total)*100);
    const iconMap = {'Health':'🌿','Wealth':'⚜️','Relationships':'💜','Spiritual':'🔥'};
    const cls = name.toLowerCase();
    return `
      <div class="pillar-row ${cls}">
        <div class="pillar-icon">${iconMap[name]||'•'}</div>
        <div class="pillar-info">
          <div class="pillar-name">${esc(name)}</div>
          <div class="pillar-track"><div class="pillar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="pillar-count">${count}</div>
      </div>`;
  }

  function weekCells() {
    const today = todayIndex();
    const start = Math.floor((today-1)/7)*7+1;
    const base = new Date(new Date().getFullYear(),0,1);
    let out='';
    for(let d=start; d<start+7 && d<=365; d++){
      const done=!!state.progress[d];const isToday=d===today;
      const label=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][(base.getDay()+d-1)%7];
      out+=`<div class="week-cell ${done?'done':''} ${isToday?'today':''}" onclick="app.gotoDay(${d})">
        <div class="w-label">${label}</div>
        <div class="w-num">${d}</div>
      </div>`;
    }
    return out;
  }

  function computeStreak() {
    let s=0,d=todayIndex();
    while(d>0 && state.progress[d]){ s++; d--; }
    return s;
  }

  // ════════════════════════════════════════════
  // PAGES: CHURCHES / EVENTS / STORE / PROFILE
  // ════════════════════════════════════════════
  function renderChurches() {
    $('#main').innerHTML = `
      <div class="page">
        <div class="page-title">Find Your Flock</div>
        <div class="card card-enter">
          <div class="card-header"><span class="icon">⛪</span> Nearby Churches</div>
          <input type="text" class="search-box" placeholder="Search by city or ZIP...">
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            ${churchCard('Grace Community Church','Dallas, TX','2.3 mi','Reformed')}
            ${churchCard('Resurrection Life Fellowship','Plano, TX','5.1 mi','Charismatic')}
            ${churchCard('Sovereign Grace Bible Church','Frisco, TX','7.8 mi','Baptist')}
          </div>
        </div>
      </div>`;
  }
  function churchCard(name,loc,dist,denom){
    return `<div class="card" style="margin:0 0 10px;padding:14px">
      <div style="font-weight:600;font-size:15px;color:var(--text)">${esc(name)}</div>
      <div style="font-size:12px;color:var(--text-dim);margin-top:4px">${esc(loc)} · ${esc(dist)} · ${esc(denom)}</div>
      <button class="btn btn-ghost" style="margin-top:10px;font-size:13px;padding:8px 14px">Visit</button>
    </div>`;
  }

  function renderEvents() {
    $('#main').innerHTML = `
      <div class="page card-enter">
        <div class="page-title">Kingdom Calendar</div>
        <div class="card">
          <div class="card-header"><span class="icon">📅</span> Upcoming Events</div>
          ${eventItem('MAY','10',"Men's Discipleship Retreat","Private · Grace Community",'private')}
          ${eventItem('MAY','15','Financial Stewardship Seminar','Public · Zoom','public')}
          ${eventItem('MAY','22','Marriage Intensive','Private · Resurrection Life','private')}
        </div>
      </div>`;
  }
  function eventItem(mon,day,title,meta,tag){
    return `<div class="event-item">
      <div class="event-date-block">
        <div class="d-month">${mon}</div>
        <div class="d-day">${day}</div>
      </div>
      <div class="event-body">
        <div class="event-title">${esc(title)}</div>
        <div class="event-meta">${esc(meta)}</div>
        <span class="event-tag ${tag}">${tag}</span>
      </div>
    </div>`;
  }

  function renderStore() {
    $('#main').innerHTML = `
      <div class="page card-enter">
        <div class="page-title">Equip the Journey</div>
        <div class="store-grid">
          <div class="store-card">
            <div class="thumb">📘</div>
            <div class="info">
              <div class="store-title">365-Day Study Guide</div>
              <div class="store-desc">A companion journal for every day of the year.</div>
              <div class="store-footer">
                <span class="store-price">$24.99</span>
                <button class="btn btn-primary" style="width:auto;padding:8px 16px;font-size:13px">Add</button>
              </div>
            </div>
          </div>
          <div class="store-card">
            <div class="thumb">🧢</div>
            <div class="info">
              <div class="store-title">Flourish Cap</div>
              <div class="store-desc">Wear your calling. Adjustable twill cap.</div>
              <div class="store-footer">
                <span class="store-price">$29.99</span>
                <button class="btn btn-primary" style="width:auto;padding:8px 16px;font-size:13px">Add</button>
              </div>
            </div>
          </div>
          <div class="store-card">
            <div class="thumb">👕</div>
            <div class="info">
              <div class="store-title">Armor of God Tee</div>
              <div class="store-desc">Premium cotton. Ephesians 6:10-18.</div>
              <div class="store-footer">
                <span class="store-price">$34.99</span>
                <button class="btn btn-primary" style="width:auto;padding:8px 16px;font-size:13px">Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderProfile() {
    const done = Object.keys(state.progress).length;
    const pct = Math.min(100, Math.round((done/365)*100));
    $('#main').innerHTML = `
      <div class="page card-enter">
        <div class="profile-hero">
          <div class="avatar-ring"><div class="avatar-inner">👤</div></div>
          <div class="profile-name">Disciple</div>
          <div class="profile-meta">${plantStage(pct).name} · ${pct}% Complete</div>
        </div>
        <div class="card">
          <div class="card-header"><span class="icon">⚙️</span> Settings</div>
          <div class="setting-row"><span class="s-label">Gender Track</span><span class="s-val">${state.gender==='men'?'Man':'Woman'}</span></div>
          <div class="setting-row"><span class="s-label">Notifications</span><div class="toggle-switch on" onclick="this.classList.toggle('on')"><div class="knob"></div></div></div>
          <div class="setting-row"><span class="s-label">Daily Reminder</span><div class="toggle-switch on" onclick="this.classList.toggle('on')"><div class="knob"></div></div></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="icon">💰</span> Tithe History</div>
          <div class="tithe-row"><span>May 2026</span><span class="amount">$250.00</span></div>
          <div class="tithe-row"><span>April 2026</span><span class="amount">$200.00</span></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="icon">🙏</span> Prayer Requests</div>
          <div class="prayer-list">
            <div class="prayer-item status-answered">✅ Family salvation — Answered!</div>
            <div class="prayer-item status-active">🟡 New job provision — Active</div>
            <div class="prayer-item status-urgent">🔴 Mother's healing — Urgent</div>
          </div>
          <input type="text" class="search-box" placeholder="Add a new prayer request..." style="margin-top:8px">
        </div>
      </div>`;
  }

  // ════════════════════════════════════════════
  // UTILS
  // ════════════════════════════════════════════
  function esc(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function toast(msg, ms=3000) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), ms);
  }

  // ════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════
  window.app = {
    gotoDay(n){
      if(!state.loaded)return;
      state.currentDay=n;
      showPage('devotional');
    },
    toggleComplete(day){
      if(!state.loaded)return;
      state.progress[day]?delete state.progress[day]:state.progress[day]=Date.now();
      saveProgress();
      renderDevotional();
      toast(state.progress[day]?'🌿 Planted. Keep going!':'Seed removed.')
    },
    shareDay(day){
      const d=state.curriculum?.[day-1];if(!d)return;
      const txt=`Flourish Day ${day}: ${d.scripture?.reference} — "${(d.scripture?.text||'').split(' ').slice(0,8).join(' ')}..."`;
      navigator.share?.({title:`Flourish Day ${day}`,text:txt})||alert(txt);
    },
    resetProgress(){
      if(!confirm('Reset your entire journey? This cannot be undone.'))return;
      state.progress={};saveProgress();toast('🌑 Garden cleared.');renderProgress();
    },
    reload(){location.reload();}
  };

  // ════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════
  loadTheme();

  $('#gender-toggle')?.addEventListener('click',()=>{
    state.gender=state.gender==='men'?'women':'men';
    updateGenderUI();saveGender();refreshPage();
  });
  $('#theme-toggle')?.addEventListener('click', toggleTheme);

  $$('.nav-btn').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
  window.addEventListener('hashchange',()=>showPage(location.hash.replace('#','')||'devotional'));

  loadCurriculum();

  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(console.error);
})();
