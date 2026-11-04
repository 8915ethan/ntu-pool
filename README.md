# 🏊 NTU PoolFlow · 台大泳池人流即時監控與智慧預測系統

> **一句話說明**：基於 7 水道物理容量建模、3:2:1 時序衰減預測演算法與 Cloudflare Workers 邊緣運算的台大泳池人流即時決策看板。

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pool.8915ethan.workers.dev-0d6efd?style=for-the-badge&logo=cloudflare)](https://pool.8915ethan.workers.dev/)
[![CI](https://github.com/8915ethan/ntu-pool/actions/workflows/ci.yml/badge.svg)](https://github.com/8915ethan/ntu-pool/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📸 成果展示 (Live Demo & Preview)

- 🌐 **線上正式版**：[**https://pool.8915ethan.workers.dev/**](https://pool.8915ethan.workers.dev/)
- 📱 **介面特點**：響應式 RWD、深淺色自適應、即時容量儀表板、Chart.js 時序走勢圖，並支援「真實資料 (BETA)」與「情境模擬 (DEMO)」一鍵切換。

<p align="center">
  <img src="docs/dashboard-preview.jpg" alt="NTU PoolFlow Dashboard Preview" width="500" />
</p>

---

## 🎯 專案背景與解決痛點

### 1. 痛點剖析：通勤準備延遲（Transit Delay）
台大官方網站僅提供當下現場單一數字，這會造成泳客嚴重的**決策落差**：
- 泳客出發前查看看板，顯示 30 人（綠燈舒適）決定前往。
- 出發、通勤、置物更衣至踏入泳池通常需 **15 ~ 20 分鐘**。
- 若正逢人潮湧入尖峰（每 5 分鐘增加 5~8 人），泳客抵達時現場已暴增至 45 人（紅燈擁擠）。

### 2. 解決方案
不只顯示「當下靜態人數」，而是引入**短期時間序列斜率加權預測**，在偵測到人流急湧時**提前動態調低警戒門檻（提早亮黃/紅燈）**，將使用者從出發到入池的時間差納入考量。

---

## 👤 個人角色與參與範圍

- **角色**：獨立開發者（個人專案，從 0 到 1 獨立完成）
- **參與範疇**：
  - **領域建模**：實地勘查泳池規格，推導「7 水道物理容量模型」。
  - **演算法研發**：設計「3:2:1 時序差分加權演算法」與「開館 Baseline 淨人數校正」。
  - **全端實作**：以 TypeScript 撰寫容錯 HTML 爬蟲、狀態評估邏輯，並使用 Chart.js 構建前端視覺化。
  - **工程品質**：Vitest 自動化測試套件覆蓋率防護、GitHub Actions CI/CD Pipeline。
  - **雲端部署**：Cloudflare Workers Serverless 邊緣架構部署。

---

## ⚡ 核心功能與技術特色

| 功能模組 | 實作邏輯 | 效益 |
| :--- | :--- | :--- |
| **🏊 7 水道物理容量模型** | 快適 **33 人** / 擁擠 **42 人** | 拒絕憑空猜測，依 5 快速長泳道 + 2 慢速道 + 更衣緩衝區推導出承載上限。 |
| **🔮 3:2:1 時序加權差分** | 提取過去 15 分鐘加速度向量 | 越靠近當下權重越高，推估未來 20 分鐘抵達人數，動態偏移燈號門檻。 |
| **🎯 開館 Baseline 自動校正** | 抓取開館前 10 分鐘首筆採樣 | 自動濾除救生員與常駐教練底數，還原水下真實「淨泳客」體感。 |
| **⏱️ 營業時段時區守衛** | Asia/Taipei 時區運算 | 精準判定平日 07:30~21:30 及週末時段，非營業時間休眠爬蟲，節省邊緣運算資源。 |

> 📖 **詳細數學推導與情境演繹**：[docs/predictive-crowd-offset.md](docs/predictive-crowd-offset.md)

---

## 🏗️ 系統架構與資料流程

```mermaid
flowchart TD
    subgraph External["外部資料源"]
        NTU["台大體育館官方即時網頁"]
    end

    subgraph Backend["Cloudflare Workers (Edge Serverless)"]
        Cron["定時觸發器 / 排程"] --> Crawler["HTML Parser & 正規化解析"]
        NTU -. 抓取即時 HTML .-> Crawler
        Crawler --> Sanitizer["資料清洗 & 開館 Baseline 扣除"]
        Sanitizer --> HistoryBuffer["時序資料滑動視窗 (最近 4 點 / 15 分鐘)"]
        
        HistoryBuffer --> Algorithm["🔮 3:2:1 時序差分加權預測"]
        Algorithm --> Offset["動態門檻偏移量計算 (Clamping: -8 ~ +8)"]
        Offset --> Evaluator["7 水道容量狀態評估 (快適 / 普 / 擠)"]
    end

    subgraph Frontend["用戶端介面 (GitHub Pages / Workers Assets)"]
        Evaluator --> API["JSON Payload"]
        API --> Dashboard["狀態即時儀表板"]
        API --> Chart["Chart.js 趨勢走勢圖"]
    end
```

---

## 💡 最想讓面試官看的部分（技術亮點與工程思維）

### 1. 物理容量建模：從場域限制推導臨界點
許多專案使用固定或憑感覺設定的百分比，本專案依現場標準 50m 池進行物理推導：
- **舒適狀態（33 人）**：
  - 5 條快速長泳道：每道 3 人長泳不碰腳（$5 \times 3 = 15$ 人）
  - 2 條慢速練習道：每道 4 人（$2 \times 4 = 8$ 人）
  - 男女更衣淋浴緩衝區：約各 5 人（$5 \times 2 = 10$ 人）
  - 合計：$15 + 8 + 10 = 33$ 人
- **擁擠警戒（42 人）**：
  - 快速道達 4 人上限（$20$ 人）+ 慢速道 5 人（$10$ 人）+ 更衣區各 6 人（$12$ 人）= **42 人**。

### 2. 時序差分衰減演算法（3:2:1 Predictive Offset）
為了消弭通勤 20 分鐘落差，演算法採樣 4 個時序點（$T-15, T-10, T-5, T$），賦予時間線性衰減權重：

$$\Delta_{5\text{m}} = \frac{3 \times \Delta(T, T-5) + 2 \times \Delta(T-5, T-10) + 1 \times \Delta(T-10, T-15)}{6}$$

- **防突波噪訊**：不單押最近一筆資料，避免單一小團體同時入場引發系統過度震盪。
- **阻尼係數與邊界保護（Clamping）**：乘上 0.5 阻尼係數防止外推發散，並限制門檻偏移量於 $[-8, +8]$ 人之間。

---

## 🛠️ 技術棧 (Tech Stack)

| 領域 | 技術選型 | 選用原因 |
| :--- | :--- | :--- |
| **語言** | TypeScript 5.5 | 全型別嚴格定義，避免時序資料數值與時間解析的隱蔽型別錯誤。 |
| **運算環境** | Cloudflare Workers | 零冷啟動、極低成本且全球邊緣節點加速。 |
| **前端視覺化**| Chart.js 4.4 / CSS Grid | 輕量化、零前端框架打包負擔，適合高頻更新的微型看板。 |
| **測試框架** | Vitest 3.0 | 執行極快，原生相容 ESM 與 TypeScript。 |
| **CI/CD** | GitHub Actions | 每次 Push 自動執行 `typecheck` 與單元測試矩陣。 |

---

## 💻 本機啟動與測試 (Quick Start)

### 1. 安裝與環境準備
```bash
git clone https://github.com/8915ethan/ntu-pool.git
cd ntu-pool
npm install
```

### 2. 執行型別檢查與自動化測試
```bash
# 執行型別檢查 + Vitest 單元測試
npm run check

# 單獨觀察測試
npm run test
```

### 3. 本機啟動前端看板
```bash
npx serve .
# 開啟瀏覽器訪問 http://localhost:3000
```

### 4. 執行爬蟲示範
```bash
npm run crawl:demo
```

---

## ⚖️ 遇到的挑戰與決策紀錄 (Decision Log & Trade-offs)

### Q1：官方網站沒有開放 API，且 DOM 結構可能隨時變更？
- **處置**：採用正則表達式非貪婪匹配核心數值節點，並在解析層實作 Fallback 與 Null 檢查；搭配 Vitest 針對破壞性 HTML 片段進行邊界測試，確保解析失敗時不會讓 Worker 崩潰。

### Q2：為什麼不直接用複雜的機器學習（如 LSTM / Prophet）？
- **決策**：在缺乏長期歷史資料與外部環境特徵（天氣、節慶）的初期，機器學習模型會面臨過擬合與黑箱不可解釋性。採用**「物理容量 + 差分線性加權」**具備三大優勢：
  1. 運算開銷微乎其微（能在 Edge Workers 上 $O(1)$ 即時完成）。
  2. 邏輯高度透明，便於由泳客反饋調校阻尼係數。
  3. 滿足 90% 的尖峰急湧預警需求。

### Q3：開館初期非零人數干擾？
- **處置**：開館時往往有救生員與清潔人員先行入場（約 2~4 人）。系統實作「開館首筆採樣扣除法」，將基礎底數扣除，確保呈現在儀表板的是真實的「水下泳客體驗人數」。

---

## 🚧 已知限制與後續 Roadmap

- [ ] **限制 1**：目前短期斜率預測僅看過去 15 分鐘，若遇到突發暴雨等不可抗力天氣，人潮可能斷崖式下跌，演算法反應有 15 分鐘滯後。
- [ ] **Roadmap 1（多特徵迴歸）**：整合氣象署即時降雨 API 與校園行事曆（期中/期末考週、寒暑假），建立中長期預測特徵。
- [ ] **Roadmap 2（推播通知）**：透過 Telegram Bot / LINE Notify 提供「人潮低於 25 人且持續空閒時」的主動推播提醒。
- [ ] **Roadmap 3（多場館抽象化）**：將 7 水道物理模型抽象化為通用介面，未來可擴展至台科大、台師大或各市立運動中心。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 條款開放原始碼。歡迎開源社群參考、改進或提交 PR！
