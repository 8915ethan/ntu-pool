# 🏊 NTU PoolFlow 未游先知
### NTU Sports Center Swimming Pool Real-time Monitor & Edge Serverless Engine

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pool.8915ethan.workers.dev-0d6efd?style=for-the-badge&logo=cloudflare)](https://pool.8915ethan.workers.dev/)
[![CI](https://github.com/8915ethan/pool/actions/workflows/ci.yml/badge.svg)](https://github.com/8915ethan/pool/actions/workflows/ci.yml)
[![Deploy to Cloudflare Workers](https://github.com/8915ethan/pool/actions/workflows/deploy.yml/badge.svg)](https://github.com/8915ethan/pool/actions/workflows/deploy.yml)
[![AI-Assisted](https://img.shields.io/badge/AI--Assisted-Pair%20Programming-blueviolet?style=flat-square&logo=openai)](https://github.com/8915ethan/pool)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

專為國立臺灣大學綜合體育館溫水游泳池設計的輕量級無伺服器（Serverless）邊緣即時監控、時序預測與決策看板系統。

---

## 🚀 線上即時展示 (Live Demo)

* 🌐 **正式上線網址**：[**https://pool.8915ethan.workers.dev/**](https://pool.8915ethan.workers.dev/)

<p align="center">
  <img src="docs/dashboard-preview.jpg" alt="NTU PoolFlow Dashboard Preview" width="480" />
</p>

---

## 🎯 核心痛點與解決方案 (The Problem & Solution)

* **傳統盲點**：官方網站**只有單一時間點**的人數數字，使用者無法得知即將變多還是變少，**缺乏可預測性**。泳客常常出發前看到人少，經歷約 15 分鐘通勤更衣抵達時，現場卻已因人潮湧入而擁擠爆滿。
* **智慧解法**：除了完整展現**歷史時序資料走勢**，更利用**動態資料即時預測**未來 15 分鐘趨勢，設立不同閾值的**紅黃綠燈號（Traffic Light）**，在人潮急湧時提早亮燈預警，供使用者在當下做出最明智的出行決策。

---

## ⚡ 四大核心特色 (Core Features)

| 核心特色 | 技術實現 | 效益說明 |
| :--- | :--- | :--- |
| **🌐 Cloudflare 邊緣無伺服器爬蟲** | Cron Trigger + Workers + KV | 每 5 分鐘自動輕量採樣官網，邊緣節點零伺服器維護成本，實現邊緣節點零伺服器維護成本與高可用性。 |
| **🔮 加權移動平均預測** | 3:2:1 時間加權變化率 | 提取過去 15 分鐘趨勢推算未來動向，人潮湧入時提前調低警戒門檻，避免泳客到場踩雷。 |
| **📈 邊緣常態歷史與時段對齊** | 5 分鐘網格線性插值 | 彙整過去 4 週（28 天）同星期走勢，濾除全天無效日，平滑內插均線並依星期嚴格鎖定泳池開放時段。 |
| **🤖 現代化 AI 協同開發實踐** | VS Code + Antigravity + GitHub + Cloudflare | 開發者主導架構與邏輯定義，AI 協同加速型別設計、34 項單元測試覆蓋與自動化 CI/CD 部署。 |

---

## 🏗️ 系統架構 (Architecture)

```mermaid
flowchart TD
    subgraph External["外部資料來源"]
        NTU["🏛️ 台大體育館官方即時網頁 (rent.pe.ntu.edu.tw)"]
    end

    subgraph CrawlerEngine["邊緣爬蟲引擎 (Cloudflare Worker Cron)"]
        Cron["⏱️ 定時觸發器 (每 5 分鐘一次)"] --> Guard{"⏱️ 營業時段守衛 (台北時間)"}
        Guard -->|營業時段內| Fetcher["🌐 非同步 HTTP 擷取"]
        NTU -. 抓取 HTML 頁面 .-> Fetcher
        Fetcher --> Regex["🕷️ Regex 容錯解析現場人數"]
        Regex --> Sanitizer["🧹 清洗非營業時間資料"]
        Sanitizer --> KV[("💾 Cloudflare KV : ntu_pool")]
    end

    subgraph ServiceEngine["邊緣 API 與決策引擎 (Cloudflare Worker Fetch)"]
        KV --> Window["⚡ 滑動視窗截取 28 天活躍時序 (-87% Payload)"]
        Window --> TypCalc["📈 4 週（28 天）常態走勢預先聚合 (5分鐘線性插值)"]
        Window --> Algo["🔮 3:2:1 加權移動平均預測"]
        Algo --> Threshold["🚦 紅黃綠動態門檻 (Traffic Light)"]
        Threshold --> Routes{"🔀 邊緣路由分流 (src/index.ts)"}
        TypCalc --> Routes
        
        Routes -->|GET /| Dashboard["🖥️ 互動式視覺化儀表板 (HTML + Chart.js)"]
        Routes -->|GET /api/data| API["📦 即時人數、趨勢、常態歷史與時序 JSON"]
        Routes -->|GET /manifest.json| PWA["📱 PWA Web App Manifest"]
    end

    subgraph Clients["使用者與客戶端"]
        Dashboard --> Users["👥 泳客行動裝置 / 電腦瀏覽器"]
        API --> Users
        PWA --> Users
    end
```

---

## 📚 深入技術專頁導覽 (Detailed Documentation)

詳細公式推導、架構決策與邊界防禦細節已獨立收錄於分頁：

* 📖 **[深入解析 1：加權移動平均人潮預測演算法與 7 水道門檻推導](docs/predictive-crowd-offset.md)**  
  *詳細計算公式、時間軸視窗分解、防止過度敏感與極端調整限制機制，以及尖峰急湧與散場情境驗算。*
* ⚖️ **[深入解析 2：技術決策紀錄與架構權衡 (Decision Log & Trade-offs)](docs/decision-log.md)**  
  *收錄爬蟲選型（Regex vs. DOM）、加權移動平均 vs. 機器學習、開館救生員底數扣除、UTC 跨時區防護與 API 封包瘦身。*

---

## 🌐 相關產品與潛力發展 (Industry Benchmarks & Future Potential)

本專案由個人泳客出發，透過邊緣演算法達成「輕量外部數據感知與人流預測」。在專業運動科技與場館安全領域，已有許多成熟企業發展出高階的智慧水上方案：

* **[煊恩科技 (Xuanen)](https://www.xuanen.com.tw/)**：台灣知名智慧運動場館整合商，專精於泳池水質即時監控、場館人流計數整合與自動化安全控制系統。
* **[Lynxight](https://www.lynxight.com/)**：全球頂尖的 AI 水下視覺即時分析系統，透過現有泳池攝影機結合深度學習，提供 AI 救生防溺預警與泳道密度深度分析。

> 💡 **專案未來演進**：本系統未來可進一步對接中央氣象署天氣 API 提高預測準度；長期若能與專業場館系統（如煊恩或 Lynxight）整合，將能把「大門刷卡總人數」進一步細緻化至「各泳道水下即時密度」，打造全方位的智慧分流看板。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 授權。
