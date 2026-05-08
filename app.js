(function(){
  'use strict';

  // ==========================================================
  // STATE
  // ==========================================================
  const state = {
    curriculum: null,
    gender: 'men',
    currentDay: 1,
    progress: {},
    loaded: false,
    loadError: null
  };

  const todayIndex = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(365, diff));
  };

  // ==========================================================
  // DOM UTILS (null-safe)
  // ==========================================================
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const htmlEl = () => {
    const el = $('#main');
    if (!el) console.error('FATAL: #main not found');
    return el;
  };

  function updateActiveNav(name) {
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === name));
  }

  // ==========================================================
  // CURRICULUM LOADING
  // ==========================================================
  async function loadCurriculum() {
    if (state.loaded) return;
    showLoading('Loading day 1 of 365...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      const res = await fetch('data/curriculum-enriched.json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Failed to load curriculum');
      state.curriculum = await res.json();
      state.loaded = true;
      state.currentDay = todayIndex();
      loadProgress();
      loadGender();
      const page = location.hash.replace('#','') || 'devotional';
      showPage(page);
    } catch(err) {
      state.loadError = err.message || 'Connection failed. Please try again.';
      showError(state.loadError);
      console.error(err);
    }
  }

  function showLoading(msg) {
    const html = htmlEl(); if (!html) return;
    html.innerHTML = `
      <div class="page centered-message">
        <div class="loader"></div>
        <p class="loading-text">${msg}</p>
        <p class="loading-sub">Preparing your daily devotional</p>
      </div>`;
    updateActiveNav('devotional');
  }
  function showError(msg) {
    const html = htmlEl(); if (!html) return;
    html.innerHTML = `
      <div class="page centered-message">
        <div style="font-size:48px;">📶</div>
        <p class="error-text">${msg}</p>
        <button class="btn-primary" style="width:auto;min-width:120px;" onclick="location.reload()">Try Again</button>
        <p style="margin-top:12px;color:var(--text-dim);font-size:12px;">Offline mode coming soon</p>
      </div>`;
    updateActiveNav('devotional');
  }

  // ==========================================================
  // STORAGE
  // ==========================================================
  function loadProgress() {
    try {
      const raw = localStorage.getItem('flourish-progress');
      if (raw) state.progress = JSON.parse(raw);
    } catch(e) { state.progress = {}; }
  }
  function saveProgress() {
    try { localStorage.setItem('flourish-progress', JSON.stringify(state.progress)); } catch(e) {}
  }
  function loadGender() {
    const g = localStorage.getItem('flourish-gender');
    if (g) state.gender = g;
    updateGenderUI();
  }
  function saveGender() {
    try { localStorage.setItem('flourish-gender', state.gender); } catch(e) {}
  }

  // ==========================================================
  // GENDER TOGGLE
  // ==========================================================
  const genderToggle = $('#gender-toggle');
  if (genderToggle) {
    genderToggle.addEventListener('click', () => {
      state.gender = state.gender === 'men' ? 'women' : 'men';
      updateGenderUI();
      saveGender();
      refreshPage();
    });
  }

  function updateGenderUI() {
    const toggle = $('#gender-toggle');
    if (!toggle) return;
    toggle.classList.toggle('women', state.gender === 'women');
    $$('#gender-toggle .g-label').forEach(el => {
      const isActive = el.textContent.toLowerCase().includes(state.gender);
      el.classList.toggle('dim', !isActive);
    });
  }

  // ==========================================================
  // NAVIGATION
  // ==========================================================
  function showPage(name) {
    updateActiveNav(name);
    location.hash = name;
    if (!state.loaded) {
      if (name === 'devotional') return;
      showError('Curriculum is still loading. Please wait...');
      return;
    }
    switch(name) {
      case 'devotional': renderDevotional(); break;
      case 'progress': renderProgress(); break;
      case 'churches': renderChurches(); break;
      case 'events': renderEvents(); break;
      case 'store': renderStore(); break;
      case 'profile': renderProfile(); break;
      default: renderDevotional();
    }
    window.scrollTo(0,0);
  }
  function refreshPage() {
    const page = location.hash.replace('#','') || 'devotional';
    if (state.loaded) showPage(page);
  }

  // Wire nav buttons
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });
  window.addEventListener('hashchange', () => showPage(location.hash.replace('#','') || 'devotional'));

  // ==========================================================
  // PAGE: DEVOTIONAL
  // ==========================================================
  function renderDevotional() {
    const html = htmlEl(); if (!html) return;
    const dayIdx = state.currentDay - 1;
    const day = state.curriculum ? state.curriculum[dayIdx] : null;
    if (!day) { html.innerHTML = '<div class="page centered-message">No data for this day.</div>'; return; }

    const isComplete = !!state.progress[day.day];
    const track = day[state.gender];
    const nextDay = day.day < 365 ? day.day + 1 : null;
    const prevDay = day.day > 1 ? day.day - 1 : null;

    html.innerHTML = `
      <div class="page devotional-page">
        <div class="day-header">
          <button class="day-nav ${prevDay ? '' : 'disabled'}" ${prevDay ? `onclick="app.gotoDay(${prevDay})"` : ''}>◀</button>
          <div class="day-info">
            <div class="day-number">Day ${day.day}</div>
            <div class="day-topic">${escapeHtml(day.topic)}</div>
            <div class="day-meta">Week ${day.week} · ${escapeHtml(day.week_theme)} · ${escapeHtml(day.pillar)}</div>
          </div>
          <button class="day-nav ${nextDay ? '' : 'disabled'}" ${nextDay ? `onclick="app.gotoDay(${nextDay})"` : ''}>▶</button>
        </div>

        <section class="card scripture-card">
          <div class="card-header">📜 Scripture</div>
          <div class="scripture-ref">${day.scripture?.reference || ''} (${day.scripture?.version || 'ESV'})</div>
          <div class="scripture-text">${escapeHtml(day.scripture?.text || '')}</div>
        </section>

        <section class="card lesson-card">
          <div class="card-header">🎯 ${state.gender === 'men' ? "The Warrior's Word" : "The Beloved's Word"}</div>
          <div class="lesson-text">${escapeHtml(track?.lesson || '')}</div>
        </section>

        <section class="card understand-card">
          <div class="card-header">💡 Understanding</div>
          <div class="understand-text">${escapeHtml(track?.understanding || '')}</div>
        </section>

        <section class="card prayer-card">
          <div class="card-header">🙏 Prayer</div>
          <div class="prayer-text">${escapeHtml(track?.prayer || '')}</div>
        </section>

        <section class="card cross-card">
          <div class="card-header">🔗 Cross-Pillar Connection</div>
          <div class="cross-text">${escapeHtml(day.cross_pillar || '')}</div>
        </section>

        ${renderEnrichment(day)}

        <div class="devotional-actions">
          <button id="mark-complete" class="btn-primary ${isComplete ? 'done' : ''}" onclick="app.toggleComplete(${day.day})">
            ${isComplete ? '✓ Completed' : 'Mark Complete'}
          </button>
          <button class="btn-secondary" onclick="app.shareDay(${day.day})">📤 Share</button>
        </div>
      </div>
    `;
  }

  function renderEnrichment(day) {
    const e = day.enrichment || {};
    const parts = [];
    if (e.historical_context) parts.push(`<section class="card context-card"><div class="card-header">📜 Historical Context</div><div class="context-text">${escapeHtml(e.historical_context)}</div></section>`);
    if (e.word_study) parts.push(`<section class="card word-card"><div class="card-header">🔍 Word Study</div><div class="word-text">${escapeHtml(e.word_study)}</div></section>`);
    if (e.christ_connection) parts.push(`<section class="card christ-card"><div class="card-header">✝️ Christ Connection</div><div class="christ-text">${escapeHtml(e.christ_connection)}</div></section>`);
    if (e.reflection_questions && e.reflection_questions.length) {
      const qs = e.reflection_questions.map((q,i) => `<div class="reflect-q"><span>${i+1}.</span> ${escapeHtml(q)}</div>`).join('');
      parts.push(`<section class="card reflect-card"><div class="card-header">💭 Reflection Questions</div><div class="reflect-list">${qs}</div></section>`);
    }
    return parts.join('');
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==========================================================
  // PAGE: PROGRESS
  // ==========================================================
  function renderProgress() {
    const html = htmlEl(); if (!html) return;
    const completed = Object.keys(state.progress).length;
    const pct = Math.min(100, Math.round((completed / 365) * 100));
    const streak = computeStreak();

    const pillarCounts = { Health:0, Wealth:0, Relationships:0, Integration:0 };
    Object.keys(state.progress).forEach(d => {
      const day = state.curriculum ? state.curriculum[parseInt(d)-1] : null;
      if (day && pillarCounts[day.pillar] !== undefined) pillarCounts[day.pillar]++;
    });

    html.innerHTML = `
      <div class="page progress-page">
        <div class="progress-hero">
          <div class="big-stat">${completed}<span>/365</span></div>
          <div class="big-label">Days Completed</div>
          <div class="progress-bar"><div style="width:${pct}%"></div></div>
          <div class="pct-label">${pct}% Complete</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card"><div class="stat-num">${streak}</div><div class="stat-label">Current Streak</div></div>
          <div class="stat-card"><div class="stat-num">${todayIndex()}</div><div class="stat-label">Today's Day</div></div>
          <div class="stat-card"><div class="stat-num">${365 - completed}</div><div class="stat-label">Days Remaining</div></div>
          <div class="stat-card"><div class="stat-num">${Math.max(0, Math.floor((completed / todayIndex()) * 100))}%</div><div class="stat-label">On Track</div></div>
        </div>

        <div class="card">
          <div class="card-header">📊 Pillar Balance</div>
          <div class="pillar-bars">
            ${renderPillarBar('Health', pillarCounts.Health, '#4caf50')}
            ${renderPillarBar('Wealth', pillarCounts.Wealth, '#d4af37')}
            ${renderPillarBar('Relationships', pillarCounts.Relationships, '#5b9bd5')}
            ${renderPillarBar('Integration', pillarCounts.Integration, '#a3b5a3')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">📅 Weekly View</div>
          <div class="week-grid">
            ${renderWeekDays()}
          </div>
        </div>

        <div style="height:20px"></div>
        <button class="btn-danger" onclick="app.resetProgress()">Reset All Progress</button>
      </div>
    `;
  }

  function renderPillarBar(name, count, color) {
    const t = Object.keys(state.progress).length || 1;
    const pct = Math.round((count / t) * 100);
    return `
      <div class="pillar-bar">
        <span class="pillar-name">${escapeHtml(name)}</span>
        <div class="p-track"><div style="width:${pct}%;background:${color}"></div></div>
        <span class="pillar-count">${count}</span>
      </div>`;
  }

  function renderWeekDays() {
    const today = todayIndex();
    const weekStart = Math.floor((today - 1) / 7) * 7 + 1;
    let out = '';
    const baseDate = new Date(new Date().getFullYear(), 0, 1);
    for (let d = weekStart; d < weekStart + 7 && d <= 365; d++) {
      const done = !!state.progress[d];
      const isToday = d === today;
      const label = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][(baseDate.getDay() + d - 1) % 7];
      out += `
        <div class="week-day ${done?'done':''} ${isToday?'today':''}" onclick="app.gotoDay(${d})">
          <div class="w-label">${label}</div>
          <div class="w-num">${d}</div>
          ${done?'<div class="w-check">✓</div>':''}
        </div>`;
    }
    return out;
  }

  function computeStreak() {
    let streak = 0;
    let d = todayIndex();
    while (d > 0 && state.progress[d]) { streak++; d--; }
    return streak;
  }

  // ==========================================================
  // PAGE: CHURCHES
  // ==========================================================
  function renderChurches() {
    const html = htmlEl(); if (!html) return;
    html.innerHTML = `
      <div class="page">
        <div class="card">
          <div class="card-header">⛪ Find a Church</div>
          <input type="text" class="search-input" placeholder="Search city or zip...">
          <div class="church-list">
            <div class="church-item">
              <div class="church-name">Grace Community Church</div>
              <div class="church-meta">Dallas, TX · 2.3 mi · Reformed</div>
              <button class="btn-small">Visit</button>
            </div>
            <div class="church-item">
              <div class="church-name">Resurrection Life Fellowship</div>
              <div class="church-meta">Plano, TX · 5.1 mi · Charismatic</div>
              <button class="btn-small">Visit</button>
            </div>
            <div class="church-item">
              <div class="church-name">Sovereign Grace Bible Church</div>
              <div class="church-meta">Frisco, TX · 7.8 mi · Baptist</div>
              <button class="btn-small">Visit</button>
            </div>
          </div>
          <div style="margin-top:12px;color:var(--text-dim);font-size:12px;text-align:center;">
            Geo-search powered by your browser location (simulated demo)
          </div>
        </div>
      </div>`;
  }

  // ==========================================================
  // PAGE: EVENTS
  // ==========================================================
  function renderEvents() {
    const html = htmlEl(); if (!html) return;
    html.innerHTML = `
      <div class="page">
        <div class="card">
          <div class="card-header">📅 Upcoming Events</div>
          <div class="event-list">
            <div class="event-item">
              <div class="event-date">MAY 10</div>
              <div class="event-info">
                <div class="event-title">Men's Discipleship Retreat</div>
                <div class="event-meta">Private · Grace Community Church</div>
              </div>
            </div>
            <div class="event-item">
              <div class="event-date">MAY 15</div>
              <div class="event-info">
                <div class="event-title">Financial Stewardship Seminar</div>
                <div class="event-meta">Public · Zoom</div>
              </div>
            </div>
            <div class="event-item">
              <div class="event-date">MAY 22</div>
              <div class="event-info">
                <div class="event-title">Marriage Intensive</div>
                <div class="event-meta">Private · Resurrection Life</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  // ==========================================================
  // PAGE: STORE
  // ==========================================================
  function renderStore() {
    const html = htmlEl(); if (!html) return;
    html.innerHTML = `
      <div class="page">
        <div class="card">
          <div class="card-header">🛒 Flourish Store</div>
          <div class="store-grid">
            <div class="store-item">
              <div style="width:100%;height:120px;background:var(--surface-3);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:48px;">📘</div>
              <div class="store-title">365-Day Study Guide</div>
              <div class="store-price">$24.99</div>
              <button class="btn-primary">Buy Now</button>
            </div>
            <div class="store-item">
              <div style="width:100%;height:120px;background:var(--surface-3);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:48px;">🧢</div>
              <div class="store-title">Flourish Cap</div>
              <div class="store-price">$29.99</div>
              <button class="btn-primary">Buy Now</button>
            </div>
            <div class="store-item">
              <div style="width:100%;height:120px;background:var(--surface-3);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:48px;">👕</div>
              <div class="store-title">Armor of God Tee</div>
              <div class="store-price">$34.99</div>
              <button class="btn-primary">Buy Now</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  // ==========================================================
  // PAGE: PROFILE
  // ==========================================================
  function renderProfile() {
    const html = htmlEl(); if (!html) return;
    const completed = Object.keys(state.progress).length;
    const pct = Math.min(100, Math.round((completed / 365) * 100));
    html.innerHTML = `
      <div class="page">
        <div class="profile-hero">
          <div class="avatar">👤</div>
          <div class="profile-name">Disciple</div>
          <div class="profile-meta">Flourish Member · ${pct}% Complete</div>
        </div>

        <div class="card">
          <div class="card-header">⚙️ Settings</div>
          <div class="setting-row"><span>Gender Track</span><span>${state.gender === 'men' ? 'Men' : 'Women'}</span></div>
          <div class="setting-row"><span>Notifications</span><label class="toggle"><input type="checkbox" checked><span></span></label></div>
          <div class="setting-row"><span>Daily Reminder</span><label class="toggle"><input type="checkbox" checked><span></span></label></div>
        </div>

        <div class="card">
          <div class="card-header">💰 Tithe History</div>
          <div class="tithe-row"><span>May 2026</span><span>$250.00</span></div>
          <div class="tithe-row"><span>April 2026</span><span>$200.00</span></div>
          <div class="tithe-row"><span>March 2026</span><span>$200.00</span></div>
        </div>

        <div class="card">
          <div class="card-header">🙏 Prayer Requests</div>
          <div class="prayer-list">
            <div class="prayer-item">🟡 Family salvation</div>
            <div class="prayer-item">🟢 Job provision</div>
            <div class="prayer-item">🔴 Healing for my mother</div>
          </div>
          <div style="margin-top:8px;"><input type="text" class="search-input" placeholder="Add new prayer request..."></div>
        </div>
      </div>`;
  }

  // ==========================================================
  // PUBLIC API
  // ==========================================================
  window.app = {
    gotoDay(n) {
      if (!state.loaded) return;
      state.currentDay = n;
      renderDevotional();
      window.scrollTo(0,0);
    },
    toggleComplete(day) {
      if (!state.loaded) return;
      if (state.progress[day]) delete state.progress[day];
      else state.progress[day] = Date.now();
      saveProgress();
      renderDevotional();
    },
    shareDay(day) {
      const d = state.curriculum ? state.curriculum[day-1] : null;
      if (!d) return;
      const text = `Flourish Day ${day}: ${d.scripture?.reference || ''} — "${(d.scripture?.text || '').split(' ').slice(0,8).join(' ')}..."`;
      if (navigator.share) { navigator.share({ title: `Flourish Day ${day}`, text }); }
      else { alert(text); }
    },
    resetProgress() {
      if (confirm('Reset all progress? This cannot be undone.')) {
        state.progress = {}; saveProgress(); renderProgress();
      }
    }
  };

  // ==========================================================
  // INIT
  // ==========================================================
  loadCurriculum();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
  }
})();
