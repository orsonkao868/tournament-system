/* ============================================================
   js/router.js — 頁面路由、導覽列互動、Toast 工具
   ============================================================ */

/* ── 工具：Toast 通知 ── */
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
window.showToast = showToast;

/* ── 工具：格式化日期 ── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}
window.formatDate = formatDate;

/* ── 工具：狀態 label → Badge class ── */
function statusBadge(status) {
  const map = {
    live:     ['badge badge-live',     '進行中'],
    open:     ['badge badge-open',     '報名中'],
    upcoming: ['badge badge-upcoming', '即將開始'],
    done:     ['badge badge-done',     '已結束'],
  };
  const [cls, label] = map[status] || ['badge badge-done', status];
  return `<span class="${cls}">${label}</span>`;
}
window.statusBadge = statusBadge;

/* ── 工具：賽制 → 中文 ── */
function formatLabel(f) {
  const m = { single: '單淘汰', double: '雙敗制', swiss: '瑞士制', group: '小組 + 淘汰' };
  return m[f] || f;
}
window.formatLabel = formatLabel;

/* ── 路由 ── */
const PAGES = ['home', 'bracket', 'standings', 'create', 'admin'];

function navigateTo(page) {
  if (!PAGES.includes(page)) page = 'home';

  /* 切換頁面顯示 */
  PAGES.forEach(p => {
    document.getElementById(`page-${p}`).classList.toggle('active', p === page);
  });

  /* 同步 Tab 狀態 */
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === page);
  });

  /* 更新 URL hash（不強制刷新）*/
  history.replaceState(null, '', `#${page}`);

  /* 手機選單收合 */
  closeMenu();

  /* 觸發各頁面初始化 */
  if (page === 'home')       initHome();
  if (page === 'bracket')    initBracket();
  if (page === 'standings')  initStandings();
  if (page === 'create')     initCreate();
  if (page === 'admin')      initAdmin();
}

/* ── 導覽列 Tab 點擊 ── */
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => navigateTo(tab.dataset.page));
});

/* ── 漢堡選單 ── */
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navMenu');

function closeMenu() {
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  navMenu.classList.remove('open');
}

hamburger.addEventListener('click', () => {
  const isOpen = navMenu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

/* 點選選單外部關閉 */
document.addEventListener('click', (e) => {
  if (!e.target.closest('#nav')) closeMenu();
});


window.addEventListener('DOMContentLoaded', () => {
  const hash = location.hash.replace('#', '') || 'home';
  navigateTo(hash);
});