# 🏊 NTU PoolFlow · 台大泳池人流即時監控與智慧預測系統
> 基於 7 水道物理容量建模、時間軸加權差分預測與前端動態視覺化的運動場館人流決策看板。

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Preview-brightgreen?style=for-the-badge&logo=githubpages)](https://8915ethan.github.io/ntu-pool/)
[![CI](https://github.com/8915ethan/ntu-pool/actions/workflows/ci.yml/badge.svg)](https://github.com/8915ethan/ntu-pool/actions/workflows/ci.yml)
[![GitHub Pages](https://github.com/8915ethan/ntu-pool/actions/workflows/pages.yml/badge.svg)](https://github.com/8915ethan/ntu-pool/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-FF6384?logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)

---

## 🚀 線上即時展示 (Live Demo)

- 🌐 **展示網址**：[https://8915ethan.github.io/ntu-pool/](https://8915ethan.github.io/ntu-pool/)
  *(本展示專案使用靜態時序數據與內建隨機情境模擬器，支援即時切換樣本與動態模擬，完全零伺服器依賴，安全且對目標站零負擔)*

---

## 💡 專案背景與痛點剖析

在運動場館人流決策中，存在嚴重的**「通勤與準備延遲盲區（Transit Delay）」**：

> 🏃 **泳客的決策盲點**：  
> 泳客在**決定出發前**查看看板時，若顯示目前人數舒適（例如 30 人綠燈），便決定啟程前往。從出發通勤、置物到更衣淋浴準備入池，通常約需 **15~20 分鐘**。  
> 若正逢人潮湧入尖峰（例如每 5 分鐘增加 5~8 人），等泳客抵達現場時，人數可能已暴增至 45 人以上（轉為擁擠紅燈），造成「出發前看似舒適、到場後卻極度擁擠」的決策落差。

為此，本專案實作了自研的**空間物理容量模型**與**時間軸加權預測演算法**：

---

## ✨ 核心特色與技術亮點

### 1. 🏊 7 水道物理容量門檻模型 (Physical Capacity Model)
深入考量台大綜合體育館 50 公尺標準溫水游泳池實際的水道劃分與更衣換裝人流：
- **舒適上限（綠-黃界線：33 人）**：
  **3 × 5 (快速道) + 4 × 2 (慢速道) + 5 × 2 (男女更衣) = 33 人**
  *(中間 5 個快速長泳道每道 3 人，間距長達 15~20 公尺，游感極佳)*
- **擁擠警戒（黃-紅界線：42 人）**：
  **4 × 5 (快速道) + 5 × 2 (慢速道) + 6 × 2 (男女更衣) = 42 人**
  *(快速道每道達 4 人，折返與超車碰撞風險急遽上升)*

### 2. 🔮 短期時間軸加權預測 (Predictive Crowd Offset)
- **多階時間軸衰減加權**：取過去 15 分鐘（4 個觀測點）之連續差分，賦予 **3 : 2 : 1** 時間衰減權重，精確捕捉進場加速度，有效濾除單一團體刷卡入場之突波噪訊。
- **提前預警動態調控**：推估未來 20 分鐘人流走向，動態計算門檻偏移量 $\text{Offset} \in [-8, +8]$：
  - **動態紅燈門檻** = `42 + Offset`
  - **動態黃燈門檻** = `33 + Offset`
  *(當人潮急湧時，紅燈門檻提前下修至 34 人，成功阻斷到場撲空的憾事)*
- 👉 [📖 **詳細演算法時間軸與數學機制解析專頁**](docs/predictive-crowd-offset.md)

### 3. 🎯 開館 Baseline 淨泳客自動校正
- 自動偵測開館後 10 分鐘內首筆數據（救生員、教練等常駐人員），當日各時段自動扣除基準值，只呈現真正下水之「淨泳客」。

### 4. ⚡ 智慧營業時段節能守衛 (Operating Hours Guard)
- 依台北時區 (`Asia/Taipei`) 精準判斷營業時段（平日 07:30~21:30、週六 08:30~21:30、週日 08:30~17:30），非營業時間自動略過，落實綠色運算。

---

## 🛠️ 技術堆疊 (Tech Stack)

| 領域 | 使用技術 | 說明 |
| :--- | :--- | :--- |
| **前端視覺化** | HTML5 / CSS3 / Vanilla JS | 響應式卡片設計、CSS 變數自動適應深/淺色主題 |
| **資料圖表庫** | Chart.js 4.4 | 即時人潮折線圖、多維時序對比 |
| **程式語言** | TypeScript 5.5 | 全模組強型別定義與單元測試保障 |
| **測試框架** | Vitest 3.0 | 涵蓋營業守衛、7 水道模型與斜率預測之單元測試 |
| **自動化流程** | GitHub Actions CI/CD | 自動執行型別檢查、測試與 GitHub Pages 發布 |

---

## 📂 專案檔案結構 (Project Structure)

```text
ntu-pool/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # 自動化型別檢查與 Vitest 測試
│       └── pages.yml              # 自動發布靜態展示至 GitHub Pages
├── data/
│   └── history.json               # 靜態示範時序資料 (供 GitHub Pages 前端讀取)
├── docs/
│   └── predictive-crowd-offset.md # 7 水道模型與時間軸預測機制深入解析專頁
├── src/
│   ├── crawler.ts                 # 爬蟲模組示範 (抓取、正規化、去重、輸出 JSON)
│   ├── utils.ts                   # 7 水道門檻、加權預測與時區守衛核心演算法
│   └── types.ts                   # 核心 TypeScript 資料介面宣告
├── test/
│   ├── crawler.test.ts            # HTML 數據提取正規表達式測試
│   └── utils.test.ts              # 7 水道模型與斜率預測演算法單元測試
├── index.html                     # 現代化前端視覺看板 (相容 GitHub Pages)
├── package.json                   # 專案相依性與 CLI 指令
├── tsconfig.json                  # TypeScript 編譯設定
└── README.md
```

---

## ⚡ 快速開始 (Getting Started)

### 1. 安裝相依套件

```bash
git clone https://github.com/8915ethan/ntu-pool.git
cd ntu-pool
npm install
```

### 2. 執行型別檢查與單元測試

```bash
# 執行 TypeScript 型別檢查與 Vitest 完整測試
npm run check
```

### 3. 本地端執行（爬蟲與前端分離）

#### 🌐 前端視覺化展示（零外部連線依賴）
直接在瀏覽器開啟根目錄的 `index.html`，或使用任何靜態伺服器：
```bash
npx serve .
```
開啟 `http://localhost:3000` 即可操作儀表板，支援切換「樣本數據」與「動態模擬」模式。

#### 🤖 爬蟲示範執行（單次抓取與寫入）
```bash
npm run crawl:demo
```
系統會進行營業時間檢查，並將最新數據安全寫入 `data/history.json`。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 條款開放原始碼。
