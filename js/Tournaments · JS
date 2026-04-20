/* ============================================================
   js/tournaments.js — 賽事列表頁邏輯（首頁）
   ============================================================ */

let allTournaments = [];   /* 快取從 DB 取得的資料 */
let activeFilter   = 'all';
let searchKeyword  = '';

/* ── 從 Supabase 取得賽事列表 ── */
async function fetchTournaments() {
  const { data, error } = await db
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('載入賽事失敗，請重新整理', 'error');
    return [];
  }
  return data || [];
}

/* ── 套用篩選 ── */
function applyFilter(tournaments) {
  return tournaments.filter(t => {
    const statusOk = activeFilter === 'all' || t.status === activeFilter || String(t.size) === activeFilter;
    const searchOk = !searchKeyword || t.name.includes(searchKeyword) || (t.location || '').includes(searchKeyword);
    return statusOk && searchOk;
  });
}

/* ── 渲染單張卡片 ── */
function renderCard(t) {
  const current = t.participants_count ?? '?';
  const svgIcon = `
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,2 18,7 18,14 10,18 2,14 2,7" stroke="#f01e7a" stroke-width="1.5"/>
      <circle cx="10" cy="10" r="2.5" fill="#f01e7a"/>
    </svg>`;

  return `
    <div class="t-card" data-id="${t.id}" role="button" tabindex="0" aria-label="查看 ${t.name} 對陣表">
      <div class="t-card-top">
        <div class="t-card-icon">${svgIcon}</div>
        ${statusBadge(t.status)}
      </div>
      <h3>${t.name}</h3>
      <p class="t-card-sub">${formatLabel(t.format)} · ${t.location || '地點未定'}</p>
      <div class="t-card-meta">
        <span class="t-card-players"><strong>${current}</strong> / ${t.size} 人</span>
        <span class="tag">${t.size}人制</span>
      </div>
    </div>`;
}

/* ── 渲染「新增卡片」── */
function renderAddCard() {
  return `
    <div class="t-card t-card-add" role="button" tabindex="0" aria-label="舉辦新賽事" id="addCardBtn">
      <div class="t-card-add-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <line x1="8" y1="2" x2="8" y2="14" stroke="#f01e7a" stroke-width="2"/>
          <line x1="2" y1="8" x2="14" y2="8" stroke="#f01e7a" stroke-width="2"/>
        </svg>
      </div>
      <span>舉辦新賽事</span>
    </div>`;
}

/* ── 更新統計數字 ── */
function updateStats(tournaments) {
  const liveCount  = tournaments.filter(t => t.status === 'live').length;
  const totalPax   = tournaments.reduce((acc, t) => acc + (t.participants_count || 0), 0);
  const el = document.getElementById('page-home');
  const statLive  = el.querySelector('[data-stat="live"]');
  const statPax   = el.querySelector('[data-stat="pax"]');
  if (statLive) statLive.textContent = liveCount;
  if (statPax)  statPax.textContent  = totalPax.toLocaleString();
}

/* ── 渲染整個列表 ── */
function renderList() {
  const grid = document.querySelector('.tournament-grid');
  if (!grid) return;

  const filtered = applyFilter(allTournaments);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>找不到符合條件的賽事</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(renderCard).join('') + renderAddCard();

  /* 卡片點擊 → 前往對陣表 */
  grid.querySelectorAll('.t-card[data-id]').forEach(card => {
    const go = () => {
      window.activeTournamentId = card.dataset.id;
      navigateTo('bracket');
    };
    card.addEventListener('click', go);
    card.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  });

  /* 新增卡片點擊 */
  const addBtn = document.getElementById('addCardBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => navigateTo('create'));
    addBtn.addEventListener('keydown', e => { if (e.key === 'Enter') navigateTo('create'); });
  }
}

/* ── 初始化首頁 ── */
async function initHome() {
  const container = document.getElementById('page-home');
  container.innerHTML = `
    <!-- Hero -->
    <section class="home-hero">
      <div class="home-hero-tag">BEYBLADE X 認證賽事平台</div>
      <h1>戰陣已開，勇者入場</h1>
      <p>全台最大 BeybladeX 競技賽事管理系統 — 追蹤戰況、查看籤表、即時積分</p>
      <div class="home-stats">
        <div class="home-stat">
          <label>進行中賽事</label>
          <div class="val val-pink" data-stat="live">—</div>
        </div>
        <div class="home-stat">
          <label>本月參賽人次</label>
          <div class="val" data-stat="pax">—</div>
        </div>
        <div class="home-stat">
          <label>登錄陀螺數</label>
          <div class="val">200+</div>
        </div>
      </div>
    </section>

    <!-- 篩選列 -->
    <div class="home-filters">
      <input class="home-search" id="homeSearch" placeholder="搜尋賽事名稱或地點..." type="search" />
      <button class="filter-chip active" data-filter="all">全部</button>
      <button class="filter-chip" data-filter="live">進行中</button>
      <button class="filter-chip" data-filter="open">報名中</button>
      <button class="filter-chip" data-filter="done">已結束</button>
      <button class="filter-chip" data-filter="16">16人</button>
      <button class="filter-chip" data-filter="32">32人</button>
      <button class="filter-chip" data-filter="48">48人</button>
      <button class="filter-chip" data-filter="96">96人</button>
    </div>

    <!-- 卡片格線 -->
    <div class="tournament-grid">
      <div class="loading-state" style="grid-column:1/-1">
        <div class="spinner"></div>載入賽事中...
      </div>
    </div>`;

  /* 搜尋 */
  document.getElementById('homeSearch').addEventListener('input', e => {
    searchKeyword = e.target.value.trim();
    renderList();
  });

  /* 篩選 Chip */
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderList();
    });
  });

  /* 載入資料 */
  allTournaments = await fetchTournaments();
  updateStats(allTournaments);
  renderList();
}