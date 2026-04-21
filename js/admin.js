/* ============================================================
   js/admin.js — 主辦後台：管理賽事、參賽者、比分、籤表
   ============================================================ */

/* ── 初始化主辦後台頁面 ── */
async function initAdmin() {
  const container = document.getElementById('page-admin');

  /* 必須登入且為主辦人 */
  const user = await getUser();
  if (!user) {
    container.innerHTML = `
      <div class="empty-state" style="padding:80px 24px">
        <p style="font-size:16px;margin-bottom:16px">請先登入才能使用主辦後台</p>
        <button class="btn-pink" onclick="showAuthModal('login')">登入</button>
      </div>`;
    return;
  }

  const profile = await getProfile(user.id);
  if (profile?.role !== 'admin') {
    container.innerHTML = `
      <div class="empty-state" style="padding:80px 24px">
        <p style="font-size:16px;margin-bottom:8px">你沒有主辦人權限</p>
        <p style="font-size:13px;color:var(--text-muted)">請聯繫管理員升級帳號</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-header">
      <h2>主辦後台</h2>
      <button class="btn-pink" onclick="navigateTo('create')">+ 新增賽事</button>
    </div>

    <div class="admin-tabs">
      <button class="admin-tab active" data-atab="tournaments">我的賽事</button>
      <button class="admin-tab" data-atab="participants">參賽名單</button>
      <button class="admin-tab" data-atab="scores">比分輸入</button>
    </div>

    <div id="adminContent">
      <div class="loading-state"><div class="spinner"></div>載入中...</div>
    </div>`;

  /* Tab 切換 */
  container.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadAdminTab(tab.dataset.atab);
    });
  });

  loadAdminTab('tournaments');
}

/* ── 載入對應 Tab 內容 ── */
async function loadAdminTab(tab) {
  const content = document.getElementById('adminContent');
  content.innerHTML = `<div class="loading-state"><div class="spinner"></div>載入中...</div>`;

  if (tab === 'tournaments') await renderAdminTournaments(content);
  if (tab === 'participants') await renderAdminParticipants(content);
  if (tab === 'scores') await renderAdminScores(content);
}

/* ── 我的賽事列表 ── */
async function renderAdminTournaments(container) {
  const { data: tournaments } = await db
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  if (!tournaments || tournaments.length === 0) {
    container.innerHTML = `<div class="empty-state">尚無賽事，點右上角新增</div>`;
    return;
  }

  const statusOptions = [
    { value: 'upcoming', label: '即將開始' },
    { value: 'open',     label: '報名中' },
    { value: 'live',     label: '進行中' },
    { value: 'done',     label: '已結束' },
  ];

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>賽事名稱</th>
            <th>賽制</th>
            <th>人數</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${tournaments.map(t => `
            <tr>
              <td>
                <div style="font-weight:500">${t.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">${t.location || '—'}</div>
              </td>
              <td>${formatLabel(t.format)}</td>
              <td>${t.size} 人</td>
              <td>
                <select class="status-select" data-id="${t.id}" style="font-size:12px;padding:4px 8px;background:var(--surface2);border:1px solid var(--border-md);border-radius:4px;color:var(--text)">
                  ${statusOptions.map(s => `<option value="${s.value}" ${t.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                </select>
              </td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="admin-btn-sm" onclick="generateBracket('${t.id}', ${t.size})">生成籤表</button>
                  <button class="admin-btn-sm danger" onclick="deleteTournament('${t.id}')">刪除</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  /* 狀態變更 */
  container.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await db
        .from('tournaments')
        .update({ status: sel.value })
        .eq('id', sel.dataset.id);
      if (error) showToast('更新失敗', 'error');
      else showToast('狀態已更新');
    });
  });
}

/* ── 參賽名單管理 ── */
async function renderAdminParticipants(container) {
  const { data: tournaments } = await db
    .from('tournaments')
    .select('id, name')
    .order('created_at', { ascending: false });

  container.innerHTML = `
    <div style="padding:16px 24px;border-bottom:1px solid var(--border)">
      <select id="adminTSelect" style="padding:9px 13px;background:var(--surface);border:1px solid var(--border-md);border-radius:var(--r-md);color:var(--text);font-size:13px;width:100%;max-width:360px">
        <option value="">— 選擇賽事 —</option>
        ${(tournaments || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
      </select>
    </div>
    <div id="participantList"><div class="empty-state">請選擇賽事</div></div>`;

  document.getElementById('adminTSelect').addEventListener('change', async function() {
    if (!this.value) return;
    const tid = this.value;
    const list = document.getElementById('participantList');
    list.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

    const { data: ps } = await db
      .from('participants')
      .select('*')
      .eq('tournament_id', tid)
      .order('created_at');

    if (!ps || ps.length === 0) {
      list.innerHTML = `<div class="empty-state">尚無參賽者</div>`;
      return;
    }

    list.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>#</th><th>姓名</th><th>陀螺</th><th>類型</th><th>種子</th><th>操作</th></tr></thead>
          <tbody>
            ${ps.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${p.beyblade || '—'}</td>
                <td>${p.bey_type || '—'}</td>
                <td>
                  <input type="number" class="seed-input" data-pid="${p.id}" value="${p.seed || ''}" placeholder="—"
                    style="width:50px;padding:4px 6px;background:var(--surface2);border:1px solid var(--border-md);border-radius:4px;color:var(--text);font-size:13px;text-align:center"/>
                </td>
                <td>
                  <button class="admin-btn-sm danger" onclick="removeParticipant('${p.id}', '${tid}')">移除</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:16px 24px">
        <button class="btn-outline-pink" onclick="saveSeeds('${tid}')">儲存種子排序</button>
      </div>`;
  });
}

/* ── 儲存種子排序 ── */
async function saveSeeds(tournamentId) {
  const inputs = document.querySelectorAll('.seed-input');
  const updates = [];
  inputs.forEach(input => {
    if (input.value) {
      updates.push(db.from('participants').update({ seed: parseInt(input.value) }).eq('id', input.dataset.pid));
    }
  });
  await Promise.all(updates);
  showToast('種子排序已儲存');
}

/* ── 移除參賽者 ── */
async function removeParticipant(participantId, tournamentId) {
  if (!confirm('確定要移除此參賽者？')) return;
  const { error } = await db.from('participants').delete().eq('id', participantId);
  if (error) showToast('移除失敗', 'error');
  else {
    showToast('已移除');
    document.getElementById('adminTSelect').dispatchEvent(new Event('change'));
  }
}

/* ── 比分輸入 ── */
async function renderAdminScores(container) {
  const { data: tournaments } = await db
    .from('tournaments')
    .select('id, name')
    .in('status', ['live', 'open'])
    .order('created_at', { ascending: false });

  container.innerHTML = `
    <div style="padding:16px 24px;border-bottom:1px solid var(--border)">
      <select id="adminScoreSelect" style="padding:9px 13px;background:var(--surface);border:1px solid var(--border-md);border-radius:var(--r-md);color:var(--text);font-size:13px;width:100%;max-width:360px">
        <option value="">— 選擇進行中賽事 —</option>
        ${(tournaments || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
      </select>
    </div>
    <div id="scoreList"><div class="empty-state">請選擇賽事</div></div>`;

  document.getElementById('adminScoreSelect').addEventListener('change', async function() {
    if (!this.value) return;
    await renderMatchScores(this.value, document.getElementById('scoreList'));
  });
}

async function renderMatchScores(tournamentId, container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;

  const { data: matches } = await db
    .from('matches')
    .select(`id, round, position, status, score1, score2,
      player1:player1_id(id, name),
      player2:player2_id(id, name),
      winner:winner_id(id)`)
    .eq('tournament_id', tournamentId)
    .order('round').order('position');

  if (!matches || matches.length === 0) {
    container.innerHTML = `<div class="empty-state">尚無對戰資料，請先生成籤表</div>`;
    return;
  }

  const byRound = {};
  matches.forEach(m => {
    if (!byRound[m.round]) byRound[m.round] = [];
    byRound[m.round].push(m);
  });

  container.innerHTML = Object.entries(byRound).map(([round, roundMatches]) => `
    <div style="padding:16px 24px;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;color:var(--pink);font-weight:500;letter-spacing:1px;margin-bottom:12px">第 ${round} 輪</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${roundMatches.map(m => `
          <div class="score-row" data-mid="${m.id}">
            <span class="score-player ${m.winner?.id === m.player1?.id ? 'winner' : ''}">${m.player1?.name || '待定'}</span>
            <input class="score-input" data-field="score1" data-mid="${m.id}" type="number" min="0" value="${m.score1 || 0}" placeholder="0" />
            <span style="color:var(--text-muted);font-size:13px">vs</span>
            <input class="score-input" data-field="score2" data-mid="${m.id}" type="number" min="0" value="${m.score2 || 0}" placeholder="0" />
            <span class="score-player ${m.winner?.id === m.player2?.id ? 'winner' : ''}">${m.player2?.name || '待定'}</span>
            <select class="winner-select" data-mid="${m.id}" data-p1="${m.player1?.id}" data-p2="${m.player2?.id}">
              <option value="">選擇勝者</option>
              ${m.player1 ? `<option value="${m.player1.id}" ${m.winner?.id === m.player1.id ? 'selected' : ''}>${m.player1.name}</option>` : ''}
              ${m.player2 ? `<option value="${m.player2.id}" ${m.winner?.id === m.player2.id ? 'selected' : ''}>${m.player2.name}</option>` : ''}
            </select>
            <button class="admin-btn-sm" onclick="saveScore('${m.id}', '${tournamentId}')">儲存</button>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

/* ── 儲存比分 ── */
async function saveScore(matchId, tournamentId) {
  const row      = document.querySelector(`.score-row[data-mid="${matchId}"]`);
  const score1   = parseInt(row.querySelector('[data-field="score1"]').value) || 0;
  const score2   = parseInt(row.querySelector('[data-field="score2"]').value) || 0;
  const winnerId = row.querySelector('.winner-select').value || null;
  const status   = winnerId ? 'done' : 'live';

  const { error } = await db.from('matches').update({ score1, score2, winner_id: winnerId, status }).eq('id', matchId);
  if (error) { showToast('儲存失敗', 'error'); return; }

  showToast('比分已儲存');
  await renderMatchScores(tournamentId, document.getElementById('scoreList'));
}

/* ── 自動生成籤表 ── */
async function generateBracket(tournamentId, size) {
  if (!confirm(`確定要為此賽事生成籤表？這將覆蓋現有對戰資料。`)) return;

  /* 取得所有參賽者（依種子排序）*/
  const { data: participants } = await db
    .from('participants')
    .select('id, name, seed')
    .eq('tournament_id', tournamentId)
    .order('seed', { nullsFirst: false });

  if (!participants || participants.length < 2) {
    showToast('至少需要 2 位參賽者', 'error');
    return;
  }

  /* 刪除現有對戰 */
  await db.from('matches').delete().eq('tournament_id', tournamentId);

  /* 生成第一輪對戰（單淘汰） */
  const rounds = Math.ceil(Math.log2(size));
  const slots  = Math.pow(2, rounds);
  const seeded = [...participants];

  /* 補 bye（輪空）到 slots 數量 */
  while (seeded.length < slots) seeded.push(null);

  /* 標準籤表配對順序 */
  const pairings = buildBracketPairs(slots);
  const inserts  = [];

  pairings.forEach(([a, b], idx) => {
    inserts.push({
      tournament_id: tournamentId,
      round: 1,
      position: idx + 1,
      player1_id: seeded[a]?.id || null,
      player2_id: seeded[b]?.id || null,
      status: 'pending',
    });
  });

  /* 生成後續各輪空白對戰 */
  for (let r = 2; r <= rounds; r++) {
    const matchCount = Math.pow(2, rounds - r);
    for (let p = 1; p <= matchCount; p++) {
      inserts.push({ tournament_id: tournamentId, round: r, position: p, status: 'pending' });
    }
  }

  const { error } = await db.from('matches').insert(inserts);
  if (error) { showToast('生成失敗：' + error.message, 'error'); return; }

  /* 更新賽事狀態為進行中 */
  await db.from('tournaments').update({ status: 'live' }).eq('id', tournamentId);

  showToast('籤表已生成，賽事開始！');
  loadAdminTab('tournaments');
}

/* ── 建立標準籤表配對索引 ── */
function buildBracketPairs(slots) {
  let positions = [0, 1];
  while (positions.length < slots) {
    const next = [];
    const len  = positions.length * 2 - 1;
    positions.forEach(p => { next.push(p); next.push(len - p); });
    positions = next;
  }
  const pairs = [];
  for (let i = 0; i < positions.length; i += 2) {
    pairs.push([positions[i], positions[i + 1]]);
  }
  return pairs;
}

/* ── 刪除賽事 ── */
async function deleteTournament(tournamentId) {
  if (!confirm('確定要刪除此賽事？所有參賽者與對戰資料將一併刪除。')) return;
  const { error } = await db.from('tournaments').delete().eq('id', tournamentId);
  if (error) showToast('刪除失敗', 'error');
  else { showToast('已刪除'); loadAdminTab('tournaments'); }
}

window.initAdmin          = initAdmin;
window.generateBracket    = generateBracket;
window.removeParticipant  = removeParticipant;
window.saveSeeds          = saveSeeds;
window.saveScore          = saveScore;
window.deleteTournament   = deleteTournament;