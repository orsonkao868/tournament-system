/* ============================================================
   js/register.js — 參賽報名邏輯
   ============================================================ */

/* ── 顯示報名 Modal ── */
async function showRegisterModal(tournamentId) {
  requireAuth(async () => {
    const { data: tournament } = await db
      .from('tournaments')
      .select('*, participants(count)')
      .eq('id', tournamentId)
      .single();

    if (!tournament) { showToast('找不到賽事', 'error'); return; }
    if (tournament.status === 'done') { showToast('此賽事已結束', 'error'); return; }
    if (tournament.status === 'live') { showToast('賽事進行中，報名已截止', 'error'); return; }

    const count = tournament.participants?.[0]?.count || 0;
    if (count >= tournament.size) { showToast('報名人數已滿', 'error'); return; }

    /* 檢查是否已報名 */
    const { data: existing } = await db
      .from('participants')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', currentUser.id)
      .single();

    if (existing) { showToast('你已經報名此賽事了！', 'error'); return; }

    const existing2 = document.getElementById('registerModal');
    if (existing2) existing2.remove();

    const modal = document.createElement('div');
    modal.id = 'registerModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box">
        <button class="modal-close" id="closeRegModal">✕</button>
        <h3 class="modal-title">報名參賽</h3>
        <p class="modal-sub">${tournament.name}</p>
        <p class="modal-sub" style="margin-top:4px;font-size:12px">${count} / ${tournament.size} 人已報名</p>

        <div class="field" style="margin-top:20px">
          <label>選手姓名</label>
          <input id="regName" type="text" placeholder="你的名字" />
        </div>

        <div class="field">
          <label>使用陀螺</label>
          <input id="regBey" type="text" placeholder="例：Dran Sword" />
        </div>

        <div class="field">
          <label>陀螺類型</label>
          <div class="bey-type-grid" id="beyTypeGrid">
            <button class="bey-type-opt sel" data-type="Attack">Attack</button>
            <button class="bey-type-opt" data-type="Defense">Defense</button>
            <button class="bey-type-opt" data-type="Stamina">Stamina</button>
            <button class="bey-type-opt" data-type="Balance">Balance</button>
          </div>
        </div>

        <div id="regError" class="auth-error" style="display:none"></div>

        <button class="btn-pink-full" id="regSubmit" style="margin-top:8px">確認報名</button>
      </div>`;

    document.body.appendChild(modal);

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('closeRegModal').addEventListener('click', () => modal.remove());

    /* 陀螺類型選擇 */
    modal.querySelectorAll('.bey-type-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.bey-type-opt').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
      });
    });

    /* 預填 profile 名稱 */
    if (currentProfile?.display_name) {
      document.getElementById('regName').value = currentProfile.display_name;
    }

    /* 提交報名 */
    document.getElementById('regSubmit').addEventListener('click', async () => {
      const name    = document.getElementById('regName').value.trim();
      const bey     = document.getElementById('regBey').value.trim();
      const beyType = modal.querySelector('.bey-type-opt.sel')?.dataset.type || 'Attack';

      if (!name) { document.getElementById('regError').textContent = '請填寫姓名'; document.getElementById('regError').style.display = 'block'; return; }

      const btn = document.getElementById('regSubmit');
      btn.disabled = true;
      btn.textContent = '報名中...';

      const { error } = await db.from('participants').insert({
        tournament_id: tournamentId,
        user_id: currentUser.id,
        name,
        beyblade: bey || null,
        bey_type: beyType,
      });

      if (error) {
        document.getElementById('regError').textContent = '報名失敗：' + error.message;
        document.getElementById('regError').style.display = 'block';
        btn.disabled = false;
        btn.textContent = '確認報名';
      } else {
        modal.remove();
        showToast('報名成功！');
        /* 重新載入首頁賽事列表 */
        if (document.getElementById('page-home').classList.contains('active')) {
          initHome();
        }
      }
    });
  });
}

window.showRegisterModal = showRegisterModal;