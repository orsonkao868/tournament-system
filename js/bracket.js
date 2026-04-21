/* ============================================================
   js/bracket.js — 對陣表頁邏輯
   ============================================================ */

/* ── 取得賽事列表（給 select 用）── */
async function fetchTournamentList() {
  const { data } = await db
    .from('tournaments')
    .select('id, name, format, size, status, location')
    .order('created_at', { ascending: false });
  return data || [];
}

/* ── 取得指定賽事的所有對戰 ── */
async function fetchMatches(tournamentId) {
  const { data } = await db
    .from('matches')
    .select(`
      id, round, position, status, score1, score2,
      player1:player1_id ( id, name, seed, beyblade ),
      player2:player2_id ( id, name, seed, beyblade ),
      winner:winner_id   ( id )
    `)
    .eq('tournament_id', tournamentId)
    .order('round')
    .order('position');
  return data || [];
}

/* ── 計算對陣表共有幾輪 ── */
function calcRounds(size) {
  /* 單淘汰：ceil(log2(size)) 輪 */
  return Math.ceil(Math.log2(size));
}

/* ── 建立輪次 label ── */
function roundLabel(round, totalRounds) {
  const labels = {
    [totalRounds]:     '決賽',
    [totalRounds - 1]: '準決賽',
    [totalRounds - 2]: '四分之一決賽',
  };
  return labels[round] || `第 ${round} 輪`;
}

/* ── 渲染選手列 ── */
function renderMatchPlayer(player, score, isWinner, isLive) {
  if (!player) {
    return `<div class="match-player tbd">
      <span class="mp-seed">—</span>
      <span class="mp-name" style="color:var(--text-muted)">待定</span>
      <span class="mp-score">—</span>
    </div>`;
  }

  const winnerClass = isWinner ? 'winner' : '';
  const scoreHTML   = isLive
    ? `<span class="mp-live">直播中</span>`
    : `<span class="mp-score">${score ?? '—'}</span>`;

  return `
    <div class="match-player ${winnerClass}">
      <span class="mp-seed">${player.seed ?? ''}</span>
      <span class="mp-name">${player.name}</span>
      ${scoreHTML}
    </div>`;
}

/* ── 渲染單場對戰卡片 ── */
function renderMatchCard(match) {
  const isLive    = match.status === 'live';
  const p1Wins    = match.winner?.id === match.player1?.id;
  const p2Wins    = match.winner?.id === match.player2?.id;

  return `
    <div class="match-card ${isLive ? 'live' : ''} ${match.status === 'pending' && !match.player1 ? 'tbd' : ''}">
      ${isLive ? '<div class="match-live-bar"></div>' : ''}
      ${renderMatchPlayer(match.player1, match.score1, p1Wins, isLive)}
      ${renderMatchPlayer(match.player2, match.score2, p2Wins, isLive)}
    </div>`;
}

/* ── 將對戰資料組成輪次結構 ── */
function groupByRound(matches) {
  const rounds = {};
  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round][m.position - 1] = m;
  });
  return rounds;
}

/* ── 渲染完整對陣表 ── */
function renderBracket(matches, tournament) {
  const container = document.querySelector('.bracket-scroll');
  if (!container) return;

  if (matches.length === 0) {
    container.innerHTML = `<div class="empty-state">尚未產生對陣表，請等待主辦方設置</div>`;
    return;
  }

  const byRound    = groupByRound(matches);
  const roundNums  = Object.keys(byRound).map(Number).sort((a, b) => a - b);
  const totalRound = roundNums[roundNums.length - 1];

  const roundsHTML = roundNums.map(round => {
    const roundMatches = byRound[round] || [];
    const cardsHTML    = roundMatches.map(m => m ? renderMatchCard(m) : '<div class="match-card tbd"></div>').join('');
    /* 偏移：讓後輪對戰垂直置中對齊 */
    const offsetPx = Math.pow(2, round - 1) * 18 - 18;
    return `
      <div class="bracket-round">
        <div class="round-label">${roundLabel(round, totalRound)}</div>
        <div style="margin-top:${offsetPx}px">${cardsHTML}</div>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="bracket-rounds">${roundsHTML}</div>`;
}

/* ── 初始化對陣表頁 ── */
async function initBracket() {
  const container = document.getElementById('page-bracket');
  container.innerHTML = `
    <div class="bracket-header">
      <div class="bracket-header-left">
        <h2 id="bracketTitle">對陣表</h2>
        <p id="bracketMeta">請選擇賽事</p>
      </div>
      <button class="btn-outline-pink" id="shareBtn">分享</button>
    </div>

    <div class="bracket-selector">
      <select id="tournamentSelect">
        <option value="">— 選擇賽事 —</option>
      </select>
    </div>

    <div class="bracket-scroll">
      <div class="empty-state">請從上方選擇賽事</div>
    </div>`;

  /* 分享按鈕 */
  document.getElementById('shareBtn').addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({ title: 'BXHUB 對陣表', url: location.href });
    } else {
      navigator.clipboard.writeText(location.href);
      showToast('已複製連結！');
    }
  });

  /* 載入賽事清單 */
  const tournaments = await fetchTournamentList();
  const sel = document.getElementById('tournamentSelect');
  tournaments.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.name}（${t.size}人 · ${formatLabel(t.format)}）`;
    sel.appendChild(opt);
  });

  /* 若首頁點擊卡片傳入 ID，直接選中 */
  if (window.activeTournamentId) {
    sel.value = window.activeTournamentId;
    window.activeTournamentId = null;
  }

  const loadBracket = async () => {
    const tid = sel.value;
    if (!tid) return;

    const t = tournaments.find(x => x.id === tid);
    document.getElementById('bracketTitle').textContent = t?.name ?? '對陣表';
    document.getElementById('bracketMeta').textContent  =
      `BeybladeX · ${formatLabel(t?.format)} · ${t?.size}人制 · ${t?.location ?? ''}`;

    document.querySelector('.bracket-scroll').innerHTML =
      `<div class="loading-state"><div class="spinner"></div>載入對陣表...</div>`;

    const matches = await fetchMatches(tid);
    renderBracket(matches, t);
  };

  sel.addEventListener('change', loadBracket);
  if (sel.value) loadBracket();
}