(function(){
  'use strict';

  // ════════════════════════════════════════════
  // QR CODE GENERATOR — Pure JS (no deps)
  // ════════════════════════════════════════════
  const QR = (function(){
    const EXP=[1,2,4,8,16,32,64,128,29,58,116,232,205,135,19,38,76,152,45,90,180,117,234,201,143,3,6,12,24,48,96,192,157,39,78,156,37,74,148,53,106,212,181,119,238,193,159,35,70,140,5,10,20,40,80,160,93,186,105,210,185,111,222,161,95,190,97,194,153,47,94,188,101,202,137,15,30,60,120,240,253,231,211,187,107,214,177,127,254,225,223,163,91,182,113,226,217,175,67,134,17,34,68,136,13,26,52,104,208,189,103,206,129,31,62,124,248,237,199,147,59,118,236,197,151,51,102,204,133,23,46,92,184,109,218,169,79,158,33,66,132,21,42,84,168,77,154,41,82,164,85,170,73,146,57,114,228,213,183,115,230,209,191,99,198,145,63,126,252,229,215,179,123,246,241,255,227,219,171,75,150,49,98,196,149,55,110,220,165,87,174,65,130,25,50,100,200,141,7,14,28,56,112,224,221,167,83,166,81,162,89,178,121,242,249,239,195,155,43,86,172,69,138,9,18,36,72,144,61,122,244,245,247,243,251,235,203,139,11,22,44,88,176,125,250,233,207,131,27,54,108,216,173,71,142];
    const LOG=Array(256).fill(0); for(let i=0;i<255;i++) LOG[EXP[i]]=i; LOG[0]=0;
    function mul(a,b){ if(!a||!b) return 0; return EXP[(LOG[a]+LOG[b])%255]; }
    function polyMul(a,b){ const r=Array(a.length+b.length-1).fill(0); for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) r[i+j]^=mul(a[i],b[j]); return r; }
    function rsGen(n){ let g=[1]; for(let i=0;i<n;i++) g=polyMul(g,[1,EXP[i]]); return g; }
    function rsEnc(msg,ec){ const g=rsGen(ec); const out=msg.slice().concat(Array(ec).fill(0)); for(let i=0;i<msg.length;i++){ const c=out[i]; if(c) for(let j=0;j<g.length;j++) out[i+j]^=mul(g[j],c); } return out.slice(msg.length); }
    const SZ=29, D=26, E=10; // Version 3, L ECC
    function modeBits(data){ const bytes=new TextEncoder().encode(data); const bits=[0,1,0,0]; for(let i=7;i>=0;i--) bits.push((bytes.length>>>i)&1); for(const b of bytes) for(let i=7;i>=0;i--) bits.push((b>>>i)&1); while(bits.length%8) bits.push(0); const pad=[236,17]; while(bits.length/8<D) for(let j=7;j>=0;j--) bits.push((pad[(bits.length/8)%2]>>>j)&1); return bits; }
    function interleave(bits){ const cw=[]; for(let i=0;i<bits.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|bits[i+j]; cw.push(b); } const ec=rsEnc(cw.slice(0,D),E); return cw.concat(ec); }
    function create(data){ const m=Array.from({length:SZ},()=>Array(SZ).fill(-1));
      function finder(x,y){ for(let i=0;i<7;i++) for(let j=0;j<7;j++) m[y+i][x+j]=(i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4))?1:0; }
      finder(0,0); finder(SZ-7,0); finder(0,SZ-7);
      for(let i=0;i<8;i++) for(let j=0;j<8;j++){ if(i===7||j===7){ if(i<SZ&&j<SZ&&m[i][j]===-1) m[i][j]=0; } }
      for(let i=0;i<8;i++) for(let j=0;j<8;j++){ [[i,SZ-8+j],[SZ-8+i,j]].forEach(([px,py])=>{ if(px<SZ&&py<SZ&&m[py][px]===-1) m[py][px]=0; }); }
      for(let i=8;i<SZ-8;i++){ m[6][i]=i%2===0?1:0; m[i][6]=i%2===0?1:0; }
      m[SZ-8][8]=1;
      const words=interleave(modeBits(data)); let bi=0, dir=-1, col=SZ-1;
      while(col>0){ if(col===6) col--; for(let i=0;i<SZ;i++){ const row=dir===1?i:SZ-1-i; for(let c=0;c<2;c++){ const cc=col-c; if(m[row][cc]===-1){ m[row][cc]=(bi<words.length*8)?(words[Math.floor(bi/8)]>>>(7-(bi%8)))&1:0; bi++; } } } dir=-dir; col-=2; }
      return m;
    }
    function toSVG(data, opts={}){ const {size=200,color='#1a3c1a',bg='#f5f0e8'}=opts; const mod=create(data); const n=mod.length; const cell=Math.floor(size/n); const actual=cell*n; let paths=''; for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(mod[y][x]) paths+=`M${x*cell},${y*cell}h${cell}v${cell}h-${cell}z`; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${actual} ${actual}" width="${actual}" height="${actual}"><rect width="${actual}" height="${actual}" fill="${bg}"/><path d="${paths}" fill="${color}"/></svg>`; }
    return { create: toSVG, raw: create };
  })();

  // ════════════════════════════════════════════
  // STATE
  // ════════════════════════════════════════════
  const state = {
    curriculum: null,
    gender:     'men',
    currentDay: 1,
    progress:   {},
    churches:   [],      // [{id, name, city, joinedAt}]
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
      const r = await fetch('data/data-v8.json?v=8', { signal: ctrl.signal });
      if (!r.ok) throw new Error('Failed to load curriculum');
      state.curriculum = await r.json();
      state.loaded = true;
      state.currentDay = todayIndex();
      loadProgress();
      loadGender();
      loadChurches();
      // Render whatever page the user navigated to (or initial hash)
      showPage();
      checkJoinFromURL();
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

  function loadChurches() {
    try { state.churches = JSON.parse(localStorage.getItem('flourish-churches')||'[]'); }
    catch(e){ state.churches = []; }
  }
  function saveChurches() {
    localStorage.setItem('flourish-churches', JSON.stringify(state.churches));
  }
  function isJoined(churchId) {
    return state.churches.some(c => c.id === churchId);
  }
  function joinChurch(church) {
    if(isJoined(church.id)) return false;
    state.churches.push({...church, joinedAt: Date.now()});
    saveChurches();
    return true;
  }
  function leaveChurch(churchId) {
    state.churches = state.churches.filter(c => c.id !== churchId);
    saveChurches();
  }
  // URL join handler — call after curriculum loads
  function checkJoinFromURL() {
    const params = new URLSearchParams(location.search);
    const joinId = params.get('join');
    if(!joinId) return;
    const name = params.get('name') || joinId;
    const city = params.get('city') || '';
    const pastor = params.get('pastor') || '';
    if(!isJoined(joinId)){
      joinChurch({id: joinId, name, city, pastor});
      toast(`⛪ Joined ${esc(name)}! Welcome to the flock.`);
    }
    // Clean URL so refresh doesn't re-trigger
    history.replaceState({}, '', location.pathname + location.hash);
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
  function showPage(override) {
    const raw = override || location.hash.replace('#','') || 'devotional';
    const page = raw.split('?')[0];

    if (page === 'devotional' && !state.loaded) { renderLoading(); return; }
    if (!state.loaded && page !== 'devotional') { renderError('Still planting your seeds...'); return; }
    updateActiveNav(page);
    window.scrollTo(0,0);
    switch(page) {
      case 'devotional': renderDevotional(); break;
      case 'progress':   renderProgress(); break;
      case 'churches':   renderChurches(); break;
      case 'events':     renderEvents(); break;
      case 'pillars':    renderPillars(); break;
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

        <div class="card card-enter" style="animation-delay:.26s">
          <div class="card-header"><span class="icon">✅</span> Life Application</div>
          <div style="line-height:1.7;font-size:15px;color:var(--text-muted)">
            ${(Array.isArray(d.application) ? d.application : []).map((a,i) => `
              <div style="display:flex;gap:10px;margin-bottom:14px;align-items:flex-start">
                <span style="flex-shrink:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--accent);color:#1a1a1a;font-size:12px;font-weight:700">${i+1}</span>
                <span>${esc(a)}</span>
              </div>
            `).join('')}
          </div>
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
    const my = state.churches;
    const hasChurch = my.length > 0;
    $('#main').innerHTML = `
      <div class="page">
        <div class="page-title">Find Your Flock</div>
        
        ${hasChurch ? `<div class="card card-enter" style="border-left:3px solid var(--accent)">
          <div class="card-header"><span class="icon">🏠</span> My Church${my.length>1?'es':''}</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${my.map(c => `<div class="church-my-row" onclick="app.showChurchDetail('${esc(c.id)}')">
              <div class="church-my-icon">⛪</div>
              <div class="church-my-info">
                <div class="church-my-name">${esc(c.name)}</div>
                <div class="church-my-meta">${esc(c.city||'')} · Joined ${new Date(c.joinedAt).toLocaleDateString()}</div>
              </div>
              <div class="church-my-arrow">→</div>
            </div>`).join('')}
          </div>
        </div>` : ''}
        
        <div class="card card-enter">
          <div class="card-header"><span class="icon">📷</span> Scan Church QR</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Scan a church's QR code to instantly join their community.</p>
          <button class="btn btn-primary" onclick="app.openQRScanner()">Open QR Scanner</button>
        </div>
        
        <div class="card card-enter">
          <div class="card-header"><span class="icon">⛪</span> Nearby Churches</div>
          <input type="text" class="search-box" placeholder="Search by city or ZIP..." oninput="app.filterChurches(this.value)">
          <div id="church-list" style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            ${churchCard('grace-dallas','Grace Community Church','Dallas, TX','2.3 mi','Reformed','Pastor Mike')}
            ${churchCard('resurrection-plano','Resurrection Life Fellowship','Plano, TX','5.1 mi','Charismatic','Pastor Sarah')}
            ${churchCard('sovereign-frisco','Sovereign Grace Bible Church','Frisco, TX','7.8 mi','Baptist','Pastor James')}
          </div>
        </div>
        
        <div style="height:20px"></div>
      </div>`;
  }
  function churchCard(id,name,loc,dist,denom,pastor){
    const joined = isJoined(id);
    return `<div class="card church-card ${joined?'joined':''}" style="margin:0;padding:14px">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div class="church-avatar">⛪</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:15px;color:var(--text)">${esc(name)} ${joined?'<span style="color:var(--accent);font-size:12px">✓ Member</span>':''}</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:2px">${esc(loc)} · ${esc(dist)} · ${esc(denom)}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Pastor: ${esc(pastor)}</div>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="app.showChurchDetail('${esc(id)}')">Details</button>
            ${joined 
              ? `<button class="btn btn-danger" style="font-size:12px;padding:6px 12px" onclick="app.leaveChurchConfirm('${esc(id)}')">Leave</button>`
              : `<button class="btn btn-primary" style="font-size:12px;padding:6px 12px" onclick="app.joinChurchFromCard('${esc(id)}','${esc(name)}','${esc(loc)}','${esc(pastor)}')">Join</button>`
            }
          </div>
        </div>
      </div>
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
  // PAGE: PILLARS — THE CURRICULUM CATHEDRAL
  // ════════════════════════════════════════════
  function renderPillars() {
    const m = $('#main');
    const hash = location.hash;
    const qp = new URLSearchParams(hash.split('?')[1] || '');
    const p = qp.get('p');
    const w = qp.get('w');

    if (p && w) { renderWeekDetail(p, parseInt(w)); return; }
    if (p) { renderPillarDetail(p); return; }

    const pillarMeta = {
      Health: { icon:'🌿', color:'#5a8f6e', desc:'Spiritual vitality, mental discipline, and physical stewardship as acts of worship.' },
      Wealth: { icon:'⚜️', color:'#c9a84c', desc:'Biblical stewardship, debt freedom, and generational legacy building.' },
      Relationships: { icon:'💜', color:'#7a6fae', desc:'Family hierarchy, covenant friendship, and romantic leadership rooted in scripture.' },
      Integration: { icon:'🔥', color:'#8b5a7c', desc:'Where Health, Wealth, and Relationships converge into unified Kingdom living.' }
    };

    const counts = { Health:0, Wealth:0, Relationships:0, Integration:0 };
    state.curriculum?.forEach(d => { if (counts[d.pillar] !== undefined) counts[d.pillar]++; });

    m.innerHTML = `
      <div class="pillars-page">
        <div class="page-title card-enter">The Four Pillars</div>
        <div class="page-subtitle card-enter" style="animation-delay:.05s">
          A 365-day architecture for Biblical Life Mastery
        </div>
        <div class="pillars-grid card-enter" style="animation-delay:.1s">
          ${Object.entries(pillarMeta).map(([name,meta])=>{
            const count = counts[name]||0;
            const cls = name.toLowerCase();
            return `
            <div class="pillar-tile ${cls}" onclick="app.showPillar('${name}')">
              <div class="pillar-tile-icon" style="background:${meta.color}20;color:${meta.color}">${meta.icon}</div>
              <div class="pillar-tile-name">${esc(name)}</div>
              <div class="pillar-tile-count">${count} days</div>
              <div class="pillar-tile-desc">${esc(meta.desc)}</div>
              <div class="pillar-tile-cta">Enter →</div>
            </div>`;
          }).join('')}
        </div>
        <div class="card card-enter" style="animation-delay:.2s;margin-top:8px">
          <div class="card-header"><span class="icon">📖</span> How the Pillars Work</div>
          <div style="line-height:1.7;font-size:14px;color:var(--text-muted)">
            Each pillar is not isolated — they <strong>cross-pollinate</strong>. A lesson on Identity (Health)
            directly impacts how you steward money (Wealth) and lead your family (Relationships).
            The Integration pillar weaves all three together into unified Kingdom living.
          </div>
        </div>
      </div>`;
  }

  function renderPillarDetail(pillar) {
    const m = $('#main');
    const meta = {
      Health: { icon:'🌿', color:'#5a8f6e', title:'The Garden of Health', subtitle:'Spiritual, Mental & Physical Mastery' },
      Wealth: { icon:'⚜️', color:'#c9a84c', title:'The Treasury of Wealth', subtitle:'Stewardship, Generation & Legacy' },
      Relationships: { icon:'💜', color:'#7a6fae', title:'The Covenant of Relationships', subtitle:'Family, Friendship & Partnership' },
      Integration: { icon:'🔥', color:'#8b5a7c', title:'The Furnace of Integration', subtitle:'Unified Kingdom Living' }
    }[pillar] || { icon:'📖', color:'var(--accent)', title:pillar, subtitle:'Biblical Life Mastery' };

    const weeks = {};
    state.curriculum?.forEach(d => {
      if (d.pillar === pillar) {
        if (!weeks[d.week]) weeks[d.week] = { theme: d.week_theme, days: [] };
        weeks[d.week].days.push(d);
      }
    });

    const sortedWeeks = Object.entries(weeks).sort((a,b)=>parseInt(a[0])-parseInt(b[0]));
    const doneInPillar = state.curriculum?.filter(d=>d.pillar===pillar && state.progress[d.day]).length || 0;
    const totalInPillar = Object.values(weeks).reduce((s,w)=>s+w.days.length,0);
    const pct = Math.round((doneInPillar/totalInPillar)*100)||0;

    m.innerHTML = `
      <div class="pillars-page">
        <div class="pillar-hero card-enter" style="border-color:${meta.color}40">
          <div class="pillar-hero-icon" style="background:${meta.color}20;color:${meta.color}">${meta.icon}</div>
          <div class="pillar-hero-title">${esc(meta.title)}</div>
          <div class="pillar-hero-subtitle">${esc(meta.subtitle)}</div>
          <div class="pillar-hero-stats">
            <span>${totalInPillar} days</span> · <span>${doneInPillar} completed</span> · <span style="color:${meta.color}">${pct}%</span>
          </div>
        </div>
        <div class="week-list">
          ${sortedWeeks.map(([weekNum, wData], i) => {
            const wDone = wData.days.filter(d=>state.progress[d.day]).length;
            const wTotal = wData.days.length;
            const wPct = Math.round((wDone/wTotal)*100);
            const cls = pillar.toLowerCase();
            return `
            <div class="week-card card-enter ${cls}" style="animation-delay:${i*0.04}s" onclick="app.showWeek('${pillar}',${weekNum})">
              <div class="week-card-header">
                <div class="week-num">Week ${weekNum}</div>
                <div class="week-progress">
                  <div class="week-bar"><div class="week-fill ${cls}" style="width:${wPct}%"></div></div>
                  <span class="week-pct">${wPct}%</span>
                </div>
              </div>
              <div class="week-theme">${esc(wData.theme)}</div>
              <div class="week-days-preview">
                ${wData.days.slice(0,5).map(d=>`<span class="day-dot ${state.progress[d.day]?'done':''} ${d.day===state.currentDay?'today':''}">${d.day}</span>`).join('')}
                ${wData.days.length>5?'<span class="day-dot more">+'+(wData.days.length-5)+'</span>':''}
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="height:20px"></div>
      </div>`;
  }

  function renderWeekDetail(pillar, week) {
    const m = $('#main');
    const days = state.curriculum?.filter(d => d.pillar === pillar && d.week === week) || [];
    if (!days.length) { m.innerHTML = '<div class="empty-state">No days found.</div>'; return; }

    const weekTheme = days[0]?.week_theme || '';
    const done = days.filter(d=>state.progress[d.day]).length;
    const cls = pillar.toLowerCase();

    m.innerHTML = `
      <div class="pillars-page">
        <div class="week-detail-header card-enter">
          <button class="btn-nav-round" onclick="app.showPillar('${pillar}')">◀</button>
          <div class="week-detail-info">
            <div class="week-detail-eyebrow">${esc(pillar)} · Week ${week}</div>
            <div class="week-detail-theme">${esc(weekTheme)}</div>
            <div class="week-detail-progress">${done}/${days.length} days complete</div>
          </div>
        </div>
        <div class="day-list">
          ${days.map((d,i) => {
            const t = d[state.gender];
            const isDone = !!state.progress[d.day];
            return `
            <div class="day-row card-enter ${isDone?'done':''} ${d.day===state.currentDay?'today':''}" style="animation-delay:${i*0.05}s" onclick="app.gotoDay(${d.day})">
              <div class="day-row-left">
                <div class="day-row-num ${cls}">${d.day}</div>
                <div class="day-row-info">
                  <div class="day-row-topic">${esc(d.topic)}</div>
                  <div class="day-row-scripture">${esc(d.scripture?.reference)}</div>
                  <div class="day-row-excerpt">${esc((t?.lesson||'').substring(0,80))}${(t?.lesson||'').length>80?'...':''}</div>
                </div>
              </div>
              <div class="day-row-right">
                <div class="day-row-status ${isDone?'done':''}">${isDone?'✅':'○'}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
        <div style="height:20px"></div>
      </div>`;
  }

  
  // ════════════════════════════════════════════
  // QR / CHURCH FEATURES
  // ════════════════════════════════════════════
  function renderChurchDetail(churchId) {
    const m = $('#main');
    const c = state.churches.find(ch => ch.id === churchId);
    const sample = {id:churchId, name:'Grace Community Church', city:'Dallas, TX', pastor:'Pastor Mike', dist:'2.3 mi', denom:'Reformed'};
    const ch = c || sample;
    const joined = isJoined(churchId);
    const qrURL = generateJoinURL(ch);
    const qrSVG = QR.create(qrURL, {size:240, color:'var(--accent)', bg:'var(--surface)'});
    
    m.innerHTML = `
      <div class="page">
        <div class="church-hero card-enter">
          <button class="btn-nav-round" onclick="app.showPage('churches')">◀</button>
          <div class="church-hero-icon">⛪</div>
          <div class="church-hero-name">${esc(ch.name)}</div>
          <div class="church-hero-meta">${esc(ch.city||'')} · ${esc(ch.dist||'')} · ${esc(ch.denom||'')}</div>
          <div class="church-hero-pastor">${esc(ch.pastor||'')}</div>
        </div>
        
        <div class="card card-enter">
          <div class="card-header"><span class="icon">📷</span> Church QR Code</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Share this QR code so members can join your church instantly.</p>
          <div style="display:flex;justify-content:center;padding:16px;background:var(--surface-2);border-radius:12px;margin-bottom:12px">
            ${qrSVG}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="flex:1" onclick="app.downloadQR('${esc(qrURL)}','${esc(ch.name)}')">💾 Download QR</button>
            <button class="btn btn-ghost" style="flex:1" onclick="app.copyJoinLink('${esc(qrURL)}')">📋 Copy Link</button>
          </div>
        </div>
        
        <div class="card card-enter">
          <div class="card-header"><span class="icon">📅</span> Upcoming Events</div>
          ${eventItem('JUN','15',"Men's Breakfast","8:00 AM · Fellowship Hall",'public')}
          ${eventItem('JUN','22','Youth Group Outing','2:00 PM · Lake Park','public')}
        </div>
        
        <div style="display:flex;gap:10px;padding:0 4px">
          ${joined 
            ? `<button class="btn btn-danger" style="flex:1" onclick="app.leaveChurchConfirm('${esc(churchId)}')">Leave Church</button>`
            : `<button class="btn btn-primary" style="flex:1" onclick="app.joinChurchFromCard('${esc(churchId)}','${esc(ch.name)}','${esc(ch.city||'')}','${esc(ch.pastor||'')}')">Join This Church</button>`
          }
        </div>
        <div style="height:20px"></div>
      </div>`;
  }
  
  function generateJoinURL(ch) {
    const base = location.origin + location.pathname;
    const params = new URLSearchParams({join: ch.id, name: ch.name, city: ch.city||'', pastor: ch.pastor||''});
    return base + '?' + params.toString();
  }
  
  function renderQRScanner() {
    const m = $('#main');
    m.innerHTML = `
      <div class="page">
        <div class="page-title">Scan QR Code</div>
        
        <div class="card card-enter">
          <div class="card-header"><span class="icon">📷</span> Camera Scanner</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Point your camera at a church QR code to join instantly.</p>
          <div id="qr-video-wrap" style="width:100%;height:280px;background:var(--surface-2);border-radius:12px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
            <div style="text-align:center;color:var(--text-muted)">
              <div style="font-size:48px;margin-bottom:8px">📷</div>
              <div style="font-size:14px">Camera access required</div>
              <div style="font-size:12px;margin-top:4px">Use manual entry below if camera unavailable</div>
            </div>
          </div>
        </div>
        
        <div class="card card-enter">
          <div class="card-header"><span class="icon">⌨️</span> Manual Entry</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Paste a church join link or enter a church code.</p>
          <input type="text" id="qr-manual-input" class="search-box" placeholder="Paste URL or enter church code...">
          <button class="btn btn-primary" style="margin-top:10px" onclick="app.processManualQR()">Join Church</button>
        </div>
        
        <div class="card card-enter">
          <div class="card-header"><span class="icon">🏠</span> Generate Your Church QR</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Are you a church leader? Create a QR code for your church.</p>
          <input type="text" id="gen-church-id" class="search-box" placeholder="Church ID (e.g., grace-dallas)">
          <input type="text" id="gen-church-name" class="search-box" style="margin-top:8px" placeholder="Church Name">
          <input type="text" id="gen-church-city" class="search-box" style="margin-top:8px" placeholder="City">
          <button class="btn btn-primary" style="margin-top:10px" onclick="app.generateChurchQR()">Generate QR</button>
          <div id="gen-qr-result" style="margin-top:16px"></div>
        </div>
        
        <div style="height:20px"></div>
      </div>`;
    
    // Attempt camera init
    requestCamera();
  }
  
  async function requestCamera() {
    const wrap = document.getElementById('qr-video-wrap');
    if(!wrap || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      wrap.innerHTML = '';
      const video = document.createElement('video');
      video.style.cssText = 'width:100%;height:100%;object-fit:cover';
      video.srcObject = stream;
      video.setAttribute('playsinline','true');
      video.setAttribute('autoplay','true');
      wrap.appendChild(video);
      
      // Simulated scan detection (real QR scanning needs a library like jsQR)
      // For now: show tap-to-capture overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none';
      overlay.innerHTML = `<div style="width:180px;height:180px;border:2px dashed var(--accent);border-radius:16px;box-shadow:0 0 20px rgba(201,168,76,0.3)"></div>
        <div style="position:absolute;bottom:20px;color:var(--accent);font-size:14px;font-weight:600;background:rgba(0,0,0,0.5);padding:6px 14px;border-radius:20px">Tap to capture</div>`;
      wrap.appendChild(overlay);
      wrap.addEventListener('click', () => {
        toast('📷 Capture simulated. Use manual entry for now.');
      });
    } catch(e) {
      console.log('Camera denied:', e);
    }
  }
  
  function renderJoinPopup(churchId, name, city, pastor) {
    const m = $('#main');
    const joined = isJoined(churchId);
    if(joined) { toast('✓ Already a member of ' + name); return; }
    
    m.insertAdjacentHTML('afterbegin', `
      <div id="join-popup" class="join-overlay">
        <div class="join-popup card-enter">
          <div class="join-popup-icon">⛪</div>
          <div class="join-popup-title">Join ${esc(name)}?</div>
          <div class="join-popup-meta">${esc(city||'')} · ${esc(pastor||'')}</div>
          <p class="join-popup-desc">Joining connects you to this church's events, announcements, and community.</p>
          <div class="join-popup-actions">
            <button class="btn btn-ghost" onclick="document.getElementById('join-popup').remove()">Not Now</button>
            <button class="btn btn-primary" onclick="app.confirmJoin('${esc(churchId)}','${esc(name)}','${esc(city||'')}','${esc(pastor||'')}')">Join Church</button>
          </div>
        </div>
      </div>`);
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
    showPage,
    gotoDay(n){
      if(!state.loaded)return;
      state.currentDay=n;
      location.hash = 'devotional';
      showPage('devotional');
    },
    showPillar(p){
      location.hash = `pillars?p=${encodeURIComponent(p)}`;
      showPage();
    },
    showWeek(p,w){
      location.hash = `pillars?p=${encodeURIComponent(p)}&w=${w}`;
      showPage();
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
    reload(){location.reload();},
    // QR / Church API
    openQRScanner(){ renderQRScanner(); updateActiveNav('churches'); },
    showChurchDetail(id){ renderChurchDetail(id); updateActiveNav('churches'); },
    joinChurchFromCard(id,name,city,pastor){ renderJoinPopup(id,name,city,pastor); },
    confirmJoin(id,name,city,pastor){
      const ok = joinChurch({id,name,city,pastor});
      if(ok){ toast('⛪ Welcome to '+name+'!'); document.getElementById('join-popup')?.remove(); renderChurches(); }
      else { toast('Already a member.'); }
    },
    leaveChurchConfirm(id){
      const c = state.churches.find(ch=>ch.id===id);
      if(!c) return;
      if(confirm('Leave '+c.name+'?')){ leaveChurch(id); toast('Left '+c.name); renderChurches(); }
    },
    generateChurchQR(){
      const id = document.getElementById('gen-church-id')?.value?.trim();
      const name = document.getElementById('gen-church-name')?.value?.trim();
      const city = document.getElementById('gen-church-city')?.value?.trim();
      if(!id||!name){ toast('Please enter church ID and name'); return; }
      const url = generateJoinURL({id,name,city});
      const svg = QR.create(url, {size:280, color:'var(--accent)', bg:'var(--surface)'});
      document.getElementById('gen-qr-result').innerHTML = `
        <div style="display:flex;justify-content:center;padding:16px;background:var(--surface-2);border-radius:12px">${svg}</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary" style="flex:1" onclick="app.downloadQR('${esc(url)}','${esc(name)}')">Download</button>
          <button class="btn btn-ghost" style="flex:1" onclick="app.copyJoinLink('${esc(url)}')">Copy Link</button>
        </div>`;
    },
    downloadQR(url, name){
      const svg = QR.create(url, {size:600, color:'#1a3c1a', bg:'#f5f0e8'});
      const blob = new Blob([svg], {type:'image/svg+xml'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (name||'church') + '-qr.svg';
      a.click();
      toast('💾 QR downloaded');
    },
    copyJoinLink(url){
      navigator.clipboard?.writeText(url).then(()=>toast('📋 Link copied')).catch(()=>toast('Copy failed'));
    },
    processManualQR(){
      const input = document.getElementById('qr-manual-input')?.value?.trim();
      if(!input){ toast('Enter a URL or church code'); return; }
      try {
        let url = input;
        if(!url.startsWith('http')) url = location.origin + location.pathname + '?join=' + encodeURIComponent(url);
        const u = new URL(url);
        const id = u.searchParams.get('join');
        const name = u.searchParams.get('name') || id;
        const city = u.searchParams.get('city') || '';
        const pastor = u.searchParams.get('pastor') || '';
        if(id){ renderJoinPopup(id, name, city, pastor); }
        else { toast('Invalid join link'); }
      } catch(e){ toast('Invalid URL format'); }
    },
    filterChurches(q){
      const list = document.getElementById('church-list');
      if(!list) return;
      const cards = list.querySelectorAll('.church-card');
      const term = q.toLowerCase();
      cards.forEach(c => {
        const txt = c.textContent.toLowerCase();
        c.style.display = txt.includes(term) ? '' : 'none';
      });
    }
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

  $$('.nav-btn').forEach(b=>b.addEventListener('click',()=>{
    const target = b.dataset.page;
    location.hash = target;
    showPage(target);
  }));

  loadCurriculum();

  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(console.error);
})();
