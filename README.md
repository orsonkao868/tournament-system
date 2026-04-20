# tournament-system
# BXHUB 戰技 — BeybladeX 賽事管理平台

黑色 + 粉紅色前衛科技風格，專為 BeybladeX 競技賽事設計。

---

## 專案結構

```
bxhub/
├── index.html          # 主頁面殼（SPA 架構）
├── css/
│   ├── base.css        # 全域 Token、Reset、通用元件
│   ├── nav.css         # 導覽列（含手機漢堡選單）
│   ├── home.css        # 賽事列表頁
│   ├── bracket.css     # 對陣表頁
│   ├── standings.css   # 積分榜頁
│   └── create.css      # 建賽表單頁
└── js/
    ├── supabase.js     # DB 連線設定（填入你的 URL/Key）
    ├── router.js       # 頁面切換、Toast、工具函式
    ├── tournaments.js  # 賽事列表邏輯
    ├── bracket.js      # 對陣表生成邏輯
    └── standings.js    # 積分榜 + 建賽表單邏輯
```

---

## 快速開始

### 1. 設定 Supabase

1. 前往 [supabase.com](https://supabase.com) 建立免費專案
2. 在 **SQL Editor** 執行 `js/supabase.js` 頂部註解中的建表 SQL
3. 複製專案的 **Project URL** 與 **anon key**
4. 填入 `js/supabase.js` 的 `SUPABASE_URL` 與 `SUPABASE_KEY`

```js
// js/supabase.js
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_KEY = 'eyJhbGci...';
```

### 2. 部署到 GitHub Pages

```bash
# 1. 建立 GitHub repo（例：bxhub）
# 2. 上傳所有檔案
git init
git add .
git commit -m "init"
git remote add origin https://github.com/你的帳號/bxhub.git
git push -u origin main

# 3. 到 repo Settings > Pages
#    Source 選 "main branch / root"
#    網址會是 https://你的帳號.github.io/bxhub/
```

---

## Supabase 容量說明（免費方案）

| 項目         | 免費額度          | BeybladeX 需求評估 |
|------------|-----------------|-----------------|
| 資料庫容量      | 500 MB          | 100 場賽事 < 1 MB  |
| 儲存空間       | 1 GB            | 不儲存圖片可忽略       |
| API 請求/月   | 500,000 次       | 每月 1,000 人次 ≈ 5 萬次 |
| 即時連線數      | 200 並發          | 足夠              |

**結論：免費方案對 BeybladeX 社群規模非常足夠，即使辦幾百場賽事也不會超量。**

---

## 賽制支援

| 賽制       | 代碼       | 適合人數     |
|----------|----------|----------|
| 單淘汰      | `single` | 16 / 32  |
| 雙敗制      | `double` | 16 / 32  |
| 瑞士制      | `swiss`  | 48 / 96  |
| 小組 + 淘汰  | `group`  | 48 / 96  |

---

## 後續擴充方向

- **登入系統**：Supabase Auth（Email / Google）‵
- **主辦後台**：輸入比分、調整籤序
- **即時推播**：Supabase Realtime 訂閱對戰更新
- **陀螺資料庫**：BeybladeX 部件查詢
- **QR 報名**：掃碼直接填表參賽`