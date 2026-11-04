# 🏊 NTU PoolFlow · 台大泳池人流即時監控與智慧預測系統
> 基於 7 水道物理容量建模、時間軸加權差分預測與前端動態視覺化的運動場館人流決策看板。

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pool.8915ethan.workers.dev-0d6efd?style=for-the-badge&logo=cloudflare)](https://pool.8915ethan.workers.dev/)
[![CI](https://github.com/8915ethan/ntu-pool/actions/workflows/ci.yml/badge.svg)](https://github.com/8915ethan/ntu-pool/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)

---

## 🚀 線上展示 (Live Demo)

👉 **線上即時看板**：[**https://pool.8915ethan.workers.dev/**](https://pool.8915ethan.workers.dev/)  
*(支援即時現場人數、開館 Baseline 淨人數扣除、Chart.js 趨勢折線圖，並可一鍵切換 BETA 真實資料與 DEMO 隨機模擬)*

---

## 💡 解決痛點

解決運動場館常見的**「通勤準備延遲（Transit Delay）」**：  
泳客在**決定出發前**看到人數舒適（如 30 人綠燈），但通勤更衣需 15~20 分鐘；若遇急湧尖峰，到場時往往已暴增至 45 人（擁擠紅燈）。本系統透過**時序差分加權演算法提前預警**，消弭決策落差。

---

## ⚡ 四大技術亮點

| 亮點模組 | 核心邏輯 | 效果說明 |
| :--- | :--- | :--- |
| 🏊 **7 水道物理容量模型** | 快適 **33 人** / 擁擠 **42 人** | 精確計算 5 快速長泳道 (3~4人/道) + 2 慢速道 + 更衣緩衝區之空間承載上限。 |
| 🔮 **時間軸斜率加權預測** | 3 : 2 : 1 時序衰減權重 | 提取過去 15 分鐘加速度推估未來 20 分鐘人流，動態偏移門檻（急湧時提前亮紅燈）。 |
| 🎯 **開館 Baseline 自動校正** | 開館首 10 分鐘首筆採樣 | 自動濾除救生員與教練常駐值，忠實呈現水下「淨泳客」人數。 |
| ⏱️ **營業時段智慧守衛** | 台北時區精準判定 | 平日 07:30~21:30、週末特定時段開放，非營業時間自動休眠略過爬蟲。 |

> 📖 **詳細數學公式、7 水道推導與時間軸情境演繹已移至分頁**：  
> 👉 [**點此查看深入機制專頁：docs/predictive-crowd-offset.md**](docs/predictive-crowd-offset.md)

---

## 🛠️ 技術堆疊

- **架構**：Serverless 邊緣運算 (Cloudflare Workers) / 靜態展示
- **語言**：TypeScript 5.5（嚴格型別定義）
- **前端視覺化**：HTML5 / CSS3 (深淺色適應) / Chart.js 4.4
- **測試框架**：Vitest 3.0（自動化單元測試覆蓋）
- **CI/CD**：GitHub Actions（自動化型別檢查與測試）

---

## 📂 專案結構

```text
ntu-pool/
├── docs/predictive-crowd-offset.md  # 深入機制專頁 (7 水道模型與時間軸預測推導)
├── src/
│   ├── crawler.ts                   # 爬蟲示範模組 (正規化解析與去重)
│   ├── utils.ts                     # 核心演算法 (門檻判定、3:2:1 斜率預測、時區守衛)
│   └── types.ts                     # TypeScript 型別宣告
├── test/                            # Vitest 單元測試套件
├── data/history.json                # 離線示範時序資料樣本
├── index.html                       # 輕量化前端看板介面
└── README.md
```

---

## ⚡ 快速開始 (Getting Started)

```bash
# 1. 複製專案並安裝依賴
git clone https://github.com/8915ethan/ntu-pool.git
cd ntu-pool
npm install

# 2. 執行型別檢查與單元測試
npm run check

# 3. 啟動前端展示 (零外部連線依賴)
npx serve .
# 瀏覽器開啟 http://localhost:3000

# 4. 單次執行示範爬蟲
npm run crawl:demo
```
