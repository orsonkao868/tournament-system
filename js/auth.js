/* ============================================================
   js/auth.js — 登入 / 註冊 / 登出 / 用戶狀態管理
   ============================================================ */

/* ── 全域狀態（用 window 確保跨模組共享）── */
window.currentUser    = null;
window.currentProfile = null;

/* ── 初始化：頁面載入時檢查登入狀態 ── */
async function initAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    window.currentUser = session.user;
    window.currentProfile = await fetchProfile(session.user.id);
  }
  updateNavAuth();

  /* 監聽登入狀態變化 */
  db.auth.onAuthStateChange(async (event, session) => {
    window.currentUser = session?.user || null;
    window.currentProfile = session?.user ? await fetchProfile(session.user.id) : null;
    updateNavAuth();

    if (event === 'SIGNED_IN') {
      closeAuthModal();
      showToast('登入成功！');
      /* 若為 admin 刷新頁面內容 */
      const hash = location.hash.replace('#', '') || 'home';
      navigateTo(hash);
    }
    if (event === 'SIGNED_OUT') {
      showToast('已登出');
      navigateTo('home');
    }
  });
}

/* ── 取得 profile ── */
async function fetchProfile(userId) {
  const { data } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data || null;
}

/* ── 更新導覽列用戶狀態 ── */
function updateNavAuth() {
  const user    = window.currentUser;
  const profile = window.currentProfile;

  const loginBtn  = document.getElementById('btnLogin');
  const signupBtn = document.getElementById('btnSignup');
  const userMenu  = document.getElementById('userMenu');
  const adminTab  = document.getElementById('adminTab');

  if (user) {
    const name    = profile?.display_name || user.email.split('@')[0];
    const initial = name.slice(0, 1).toUpperCase();
    const isAdmin = profile?.role === 'admin';

    if (loginBtn)  loginBtn.style.display  = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'flex';
      const avatarEl = document.getElementById('userAvatar');
      const nameEl   = document.getElementById('userNameDisplay');
      const roleEl   = document.getElementById('userRoleDisplay');
      if (avatarEl) avatarEl.textContent = initial;
      if (nameEl)   nameEl.textContent   = name;
      if (roleEl)   roleEl.textContent   = isAdmin ? '主辦人' : '選手';
    }
    if (adminTab) adminTab.style.display = isAdmin ? '' : 'none';
  } else {
    if (loginBtn)  loginBtn.style.display  = '';
    if (signupBtn) signupBtn.style.display = '';
    if (userMenu)  userMenu.style.display  = 'none';
    if (adminTab)  adminTab.style.display  = 'none';
  }
}

/* ── 顯示登入／註冊 Modal ── */
function showAuthModal(mode = 'login') {
  document.getElementById('authModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" id="closeAuthModal">✕</button>
      <div class="modal-tabs">
        <button class="modal-tab ${mode === 'login' ? 'active' : ''}" data-mode="login">登入</button>
        <button class="modal-tab ${mode === 'signup' ? 'active' : ''}" data-mode="signup">註冊</button>
      </div>
      <div id="authForm">${renderAuthForm(mode)}</div>
      <div class="modal-divider"><span>或</span></div>
      <button class="btn-google" id="googleAuth">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        使用 Google 登入
      </button>
      <div id="authError" class="auth-error" style="display:none"></div>
    </div>`;

  document.body.appendChild(modal);

  /* 關閉 */
  document.getElementById('closeAuthModal').addEventListener('click', closeAuthModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeAuthModal(); });

  /* Tab 切換 */
  modal.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('authForm').innerHTML = renderAuthForm(tab.dataset.mode);
      bindAuthForm(tab.dataset.mode);
    });
  });

  /* Google 登入 */
  document.getElementById('googleAuth').addEventListener('click', async () => {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.href }
    });
    if (error) showAuthError(error.message);
  });

  bindAuthForm(mode);
}

function renderAuthForm(mode) {
  if (mode === 'login') {
    return `
      <div class="field"><label>Email</label><input id="authEmail" type="email" placeholder="your@email.com" autocomplete="email" /></div>
      <div class="field"><label>密碼</label><input id="authPassword" type="password" placeholder="••••••••" autocomplete="current-password" /></div>
      <button class="btn-pink-full" id="authSubmit">登入</button>
      <button class="btn-text" id="forgotPassword">忘記密碼？</button>`;
  } else {
    return `
      <div class="field"><label>暱稱</label><input id="authName" type="text" placeholder="你的顯示名稱" autocomplete="nickname" /></div>
      <div class="field"><label>Email</label><input id="authEmail" type="email" placeholder="your@email.com" autocomplete="email" /></div>
      <div class="field"><label>密碼</label><input id="authPassword" type="password" placeholder="至少 6 位數" autocomplete="new-password" /></div>
      <button class="btn-pink-full" id="authSubmit">建立帳號</button>`;
  }
}

function bindAuthForm(mode) {
  const submitBtn = document.getElementById('authSubmit');
  if (!submitBtn) return;

  /* Enter 鍵送出 */
  document.getElementById('authModal').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitBtn.click();
  });

  submitBtn.addEventListener('click', async () => {
    const email    = document.getElementById('authEmail')?.value.trim();
    const password = document.getElementById('authPassword')?.value;
    const name     = document.getElementById('authName')?.value.trim();

    if (!email || !password) { showAuthError('請填寫所有欄位'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '處理中...';

    if (mode === 'login') {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) {
        showAuthError('登入失敗，請確認帳號密碼');
        submitBtn.disabled = false;
        submitBtn.textContent = '登入';
      }
      /* 成功由 onAuthStateChange 處理 */
    } else {
      if (!name) { showAuthError('請填寫暱稱'); submitBtn.disabled = false; submitBtn.textContent = '建立帳號'; return; }
      const { data, error } = await db.auth.signUp({ email, password });
      if (error) {
        showAuthError('註冊失敗：' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = '建立帳號';
      } else if (data?.user) {
        await db.from('profiles').upsert({ id: data.user.id, display_name: name, role: 'player' });
        closeAuthModal();
        showToast('註冊成功！請登入');
        showAuthModal('login');
      }
    }
  });

  /* 忘記密碼 */
  document.getElementById('forgotPassword')?.addEventListener('click', async () => {
    const email = document.getElementById('authEmail')?.value.trim();
    if (!email) { showAuthError('請先輸入 Email'); return; }
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: location.href
    });
    if (error) showAuthError('寄送失敗：' + error.message);
    else { showToast('重設密碼信已寄出！'); closeAuthModal(); }
  });
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function closeAuthModal() {
  document.getElementById('authModal')?.remove();
}

/* ── 登出 ── */
async function signOut() {
  await db.auth.signOut();
}

/* ── 工具：需要登入才能執行 ── */
function requireAuth(callback) {
  if (window.currentUser) callback();
  else showAuthModal('login');
}

/* ── 工具：是否為主辦人 ── */
function isAdmin() {
  return window.currentProfile?.role === 'admin';
}

/* ── 匯出 ── */
window.showAuthModal  = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.signOut        = signOut;
window.requireAuth    = requireAuth;
window.isAdmin        = isAdmin;
window.updateNavAuth  = updateNavAuth;
window.initAuth       = initAuth;