/* ============================================================
   js/standings.js — 積分榜頁 + 建賽表單邏輯
   ============================================================ */

/* ============================================================
   積分榜
   ============================================================ */

async function fetchStandings(tournamentId) {
  /* 用 participants + matches 計算積分 */
  const { data: participants } = await db
    .from('participants')
    .select('id, name, beyblade, bey_type, seed')
    .eq('tournament_id', tournamentId);

  const { data: matches } = await db
    .from('matches')
    .select('winner_id, player1_id, player2_id, status')
    .eq('tournament_id', tournamentId)
    .eq('status', 'done');

  if (!participants) return [];

  /* 統計每位選手的勝/負場數 */
  const stats = {};
  participants.forEach(p => {
    stats[p.id] = { ...p, wins: 0, losses: 0, played: 0 };
  });

  (matches || []).forEach(m => {
    if (m.player1_id && stats[m.player1_id]) {
      stats[m.player1_id].played++;
      if (m.winner_id === m.player1_id) stats[m.player1_id].wins++;
      else stats[m.player1_id].losses++;
    }
    if (m.player2_id && stats[m.player2_id]) {
      stats[m.player2_id].played++;
      if (m.winner_id === m.player2_id) stats[m.player2_id].wins++;
      else stats[m.player2_id].losses++;
    }
  });

  /* 積分：勝 3 分，負 0 分 */
  return Object.values(stats)
    .map(s => ({ ...s, pts: s.wins * 3 }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins);
}

function rankClass(i) {
  if (i === 0) return 'gold';
  if (i === 1) return 'silver';
  if (i === 2) return 'bronze';
  return '';
}

function winRate(wins, played) {
  if (!played) return 0;
  return Math.round((wins / played) * 100);
}

function renderStandingsRow(player, index) {
  const rc  = rankClass(index);
  const wr  = winRate(player.wins, player.played);
  const dim = index >= 3 ? 'dim' : '';
  const top = index === 0 ? 'top' : '';
  const initials = player.name.slice(0, 1);
  const rankDisplay = index < 3
    ? `<span class="s-rank ${rc}">${index + 1}</span>`
    : `<span class="s-rank">${index + 1}</span>`;

  return `
    <div class="standings-row">
      ${rankDisplay}
      <div class="s-player">
        <div class="s-avatar ${dim}">${initials}</div>
        <div>
          <div class="s-name">${player.name}</div>
          <div class="s-bey">${player.beyblade || '—'} ${player.bey_type ? `· ${player.bey_type}` : ''}</div>
        </div>
      </div>
      <div class="s-num win">${player.wins}</div>
      <div class="s-num lose">${player.losses}</div>
      <div class="s-pts ${top}">${player.pts}</div>
      <div class="s-bar-wrap">
        <div class="s-bar"><div class="s-bar-fill" style="width:${wr}%"></div></div>
      </div>
    </div>`;
}

async function initStandings() {
  const container = document.getElementById('page-standings');
  container.innerHTML = `
    <div class="standings-header">
      <h2 id="standingsTitle">積分榜</h2>
    </div>
    <div class="standings-selector">
      <select id="standingsSelect">
        <option value="">— 選擇賽事 —</option>
      </select>
    </div>
    <div id="standingsBody">
      <div class="empty-state">請從上方選擇賽事</div>
    </div>`;

  const tournaments = await fetchTournamentList();
  const sel = document.getElementById('standingsSelect');
  tournaments.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });

  const loadStandings = async () => {
    const tid = sel.value;
    if (!tid) return;

    const t = tournaments.find(x => x.id === tid);
    document.getElementById('standingsTitle').textContent = `積分榜 — ${t?.name ?? ''}`;

    const body = document.getElementById('standingsBody');
    body.innerHTML = `<div class="loading-state"><div class="spinner"></div>計算積分中...</div>`;

    const rows = await fetchStandings(tid);

    if (rows.length === 0) {
      body.innerHTML = `<div class="empty-state">尚無參賽者資料</div>`;
      return;
    }

    body.innerHTML = `
      <div class="standings-thead">
        <span>#</span>
        <span style="padding-left:44px">選手 / 陀螺</span>
        <span style="text-align:center">勝</span>
        <span style="text-align:center">負</span>
        <span style="text-align:right">積分</span>
        <span style="text-align:right">勝率</span>
      </div>
      ${rows.map(renderStandingsRow).join('')}`;
  };

  sel.addEventListener('change', loadStandings);
}


/* ============================================================
   建賽表單
   ============================================================ */

function initCreate() {
  const container = document.getElementById('page-create');
  container.innerHTML = `
    <div class="create-wrap">
      <h2>舉辦新賽事</h2>
      <p class="create-sub">填寫資訊後，系統自動生成對陣籤表</p>

      <div class="field">
        <label>賽事名稱</label>
        <input id="cName" placeholder="例：2026 夏季公開賽" />
      </div>

      <div class="field">
        <label>舉辦地點</label>
        <input id="cLocation" placeholder="例：台北市 XX 店" />
      </div>

      <div class="field">
        <label>開始日期</label>
        <input id="cDate" type="date" />
      </div>

      <div class="field">
        <label>參賽人數上限</label>
        <div class="size-grid" id="sizeGrid">
          <button class="size-opt" data-size="16"><div class="size-num">16</div><div class="size-lbl">人</div></button>
          <button class="size-opt sel" data-size="32"><div class="size-num">32</div><div class="size-lbl">人</div></button>
          <button class="size-opt" data-size="48"><div class="size-num">48</div><div class="size-lbl">人</div></button>
          <button class="size-opt" data-size="96"><div class="size-num">96</div><div class="size-lbl">人</div></button>
        </div>
        <p class="field-hint">系統依人數自動配置輪次</p>
      </div>

      <div class="field">
        <label>賽制格式</label>
        <div class="fmt-grid" id="fmtGrid">
          <button class="fmt-opt sel" data-fmt="single">
            <div class="fmt-name">單淘汰</div>
            <div class="fmt-desc">輸一場即淘汰，速度最快</div>
          </button>
          <button class="fmt-opt" data-fmt="double">
            <div class="fmt-name">雙敗制</div>
            <div class="fmt-desc">需輸兩場才淘汰</div>
          </button>
          <button class="fmt-opt" data-fmt="swiss">
            <div class="fmt-name">瑞士制</div>
            <div class="fmt-desc">積分配對，適合大型賽</div>
          </button>
          <button class="fmt-opt" data-fmt="group">
            <div class="fmt-name">小組 + 淘汰</div>
            <div class="fmt-desc">分組賽後進行決賽</div>
          </button>
        </div>
      </div>

      <div class="field">
        <label>附加說明（選填）</label>
        <textarea id="cNote" rows="3" placeholder="規則補充、道具限制、入場費..."></textarea>
      </div>

      <div class="divider"></div>

      <div class="create-actions">
        <button class="btn-draft" id="draftBtn">儲存草稿</button>
        <button class="btn-publish" id="publishBtn">發布賽事 →</button>
      </div>
    </div>`;

  /* 人數選擇 */
  container.querySelectorAll('.size-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.size-opt').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
    });
  });

  /* 賽制選擇 */
  container.querySelectorAll('.fmt-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.fmt-opt').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
    });
  });

  /* 收集表單資料 */
  function collectForm(status) {
    const name     = document.getElementById('cName').value.trim();
    const location = document.getElementById('cLocation').value.trim();
    const date     = document.getElementById('cDate').value;
    const note     = document.getElementById('cNote').value.trim();
    const size     = parseInt(container.querySelector('.size-opt.sel')?.dataset.size || 32);
    const format   = container.querySelector('.fmt-opt.sel')?.dataset.fmt || 'single';
    return { name, location, starts_at: date || null, note, size, format, status };
  }

  /* 發布 */
  document.getElementById('publishBtn').addEventListener('click', async () => {
    const data = collectForm('open');
    if (!data.name) { showToast('請填寫賽事名稱', 'error'); return; }

    const btn = document.getElementById('publishBtn');
    btn.disabled = true;
    btn.textContent = '發布中...';

    const { error } = await db.from('tournaments').insert(data);
    if (error) {
      showToast('發布失敗：' + error.message, 'error');
    } else {
      showToast('賽事已成功發布！');
      navigateTo('home');
    }
    btn.disabled = false;
    btn.textContent = '發布賽事 →';
  });

  /* 草稿 */
  document.getElementById('draftBtn').addEventListener('click', async () => {
    const data = collectForm('upcoming');
    if (!data.name) { showToast('請填寫賽事名稱', 'error'); return; }
    const { error } = await db.from('tournaments').insert(data);
    if (error) showToast('儲存失敗', 'error');
    else showToast('已儲存為草稿');
  });
}