# 表單填寫中心

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![技術：HTML、CSS、JavaScript](https://img.shields.io/badge/HTML%20%2F%20CSS%20%2F%20JavaScript-原生前端-orange)
[![PWA：支援離線](https://img.shields.io/badge/PWA-支援離線-5A0FC8)](manifest.webmanifest)
[![部署：GitHub Pages](https://img.shields.io/badge/部署-GitHub%20Pages-222222?logo=github)](https://office-forms.stack-base.com/)

適合日常行政與費用請款的靜態網頁工具，提供請假單、請款單、
常用資料管理與 A5 橫向列印，支援安裝至主畫面及離線使用。

使用原生 HTML、CSS 與 JavaScript 建置，填寫資料保存在瀏覽器，
不需要後端伺服器或資料庫即可執行。

[立即使用](https://office-forms.stack-base.com/) ·
[操作說明](https://office-forms.stack-base.com/guide.html) ·
[回報問題](https://github.com/bruce-yang-422/accounting_hr_forms/issues)

![表單填寫中心網站橫幅](assets/images/branding/form-center-hero-banner-desktop.png)

## 目錄

- [主要功能](#主要功能)
- [快速開始](#快速開始)
- [使用流程](#使用流程)
- [資料保存與備份](#資料保存與備份)
- [安裝與離線使用](#安裝與離線使用)
- [開發與測試](#開發與測試)
- [部署與更新](#部署與更新)
- [專案結構](#專案結構)
- [問題回報與參與開發](#問題回報與參與開發)
- [授權](#授權)

## 主要功能

| 功能 | 說明 |
| --- | --- |
| 請假單 | 假別選擇、理由範本、請假時間計算、代理人與聯絡資料。 |
| 請款單 | 金額與稅額計算、中文大寫金額、付款資料、憑證、附件及自由備註。 |
| 常用資料管理 | 個人與付款對象資料的新增、編輯、刪除、搜尋、篩選及分頁。 |
| 草稿庫 | 儲存進度、更新或另存草稿、搜尋、排序、檢視、命名及刪除。 |
| 最近紀錄 | 列印前保存表單內容，方便再次載入修改。 |
| JSON 備份 | 匯出及匯入個人、付款對象名單，支援合併與取代。 |
| 預覽與列印 | A5 橫向版面，透過瀏覽器列印或另存 PDF。 |
| PWA | 安裝至主畫面、離線操作，以及不打斷填表的版本更新。 |

手機版保留單列工具列，將草稿及紀錄等操作收在「更多」。
常用資料清單與表單選擇視窗每頁顯示 20 或 50 筆，
搜尋與篩選涵蓋全部資料，不必逐頁尋找。

## 快速開始

### 直接使用

開啟 [正式網站](https://office-forms.stack-base.com/)，不需要安裝開發工具。

| 頁面 | 網址 |
| --- | --- |
| 請假單 | [填寫請假單](https://office-forms.stack-base.com/forms/leave_request_form.html) |
| 請款單 | [填寫請款單](https://office-forms.stack-base.com/forms/payment_request_form.html) |
| 常用資料 | [管理個人資料、付款對象與備份](https://office-forms.stack-base.com/favorites.html) |

### 本機執行

準備 Git 與 Python 3，複製專案後啟動靜態檔案伺服器：

```bash
git clone https://github.com/bruce-yang-422/accounting_hr_forms.git
cd accounting_hr_forms
python -m http.server 8000
```

在瀏覽器開啟 [http://localhost:8000](http://localhost:8000)。
執行網站本身不需要安裝 Python 套件，也不需要執行 npm 建置。

直接開啟 `index.html` 也可使用一般表單功能，
但 PWA 安裝與離線快取須透過 HTTPS 或 localhost 使用。

## 使用流程

1. 在「常用資料管理」建立個人資料及付款對象，視需要設定預設人員。
2. 選擇請假單或請款單；預設個人資料會自動帶入可對應欄位。
3. 填寫內容，或透過「常用資料」搜尋並帶入其他人員、付款對象。
4. 尚未完成時儲存草稿；完成後按「下一步」檢查列印預覽。
5. 選擇「列印／另存 PDF」，依瀏覽器對話框設定輸出。

列印版面採 **A5 橫向（210 × 148 mm）**，建議縮放為 100%、頁面邊距設為無。
完整操作方式請參閱 [網站操作說明](guide.html)。

## 資料保存與備份

### 保存位置與容量

個人資料、付款對象、草稿及最近紀錄使用瀏覽器 `localStorage` 保存。
目前沒有登入、伺服器端簽核或雲端同步功能。

| 資料類型 | 目前限制與行為 |
| --- | --- |
| 個人常用資料 | 未設定固定筆數上限，受瀏覽器儲存容量限制。 |
| 付款對象 | 未設定固定筆數上限，同一戶名保存一筆資料。 |
| 草稿 | 請假單與請款單各 5 筆；額滿後可更新現有草稿或刪除再新增。 |
| 最近紀錄 | 每種表單各 20 筆，超過後自動移除最舊紀錄。 |
| JSON 備份 | 每類名單最多 10,000 筆；匯入檔案最多 5 MB。 |

已使用 500 筆個人資料及 1,000 筆付款對象驗證分頁與搜尋流程，
這是測試資料量，不代表儲存上限或所有裝置的效能保證。

資料依裝置、瀏覽器及網站來源分開保存；正式網域、GitHub Pages 原始網址、
localhost 與不同連接埠不共用資料。
清除網站資料或使用暫時性的瀏覽環境可能使資料遺失，重要名單應定期匯出備份。

### JSON 匯出與匯入

在「常用資料管理 → 備份移轉」操作，備份包含個人資料、預設人員及付款對象資料，
**不包含草稿、最近紀錄或內建請假理由範本**。

| 匯入方式 | 行為 |
| --- | --- |
| 合併 | 個人以「姓名＋單位」、付款對象以「戶名」比對；同名保留現有內容與目前預設人員。 |
| 取代 | 覆寫檔案包含的資料類別；空名單會清空該類別，未包含的類別保留。 |

匯入前會驗證格式、版本、識別碼及必要欄位，並顯示各類筆數。
確認後才會寫入；寫入失敗時會嘗試復原已變更的類別。
JSON 可能包含電話、身分證字號與銀行帳號，請妥善保管。

## 安裝與離線使用

首頁頁尾提供「加入主畫面」及離線準備狀態。
支援的瀏覽器可啟動原生安裝流程；iPhone／iPad 可在 Safari
透過「分享 → 加入主畫面」安裝。

首次連網開啟後，等待頁尾顯示「已可離線使用」，
即可離線使用主要頁面、儲存草稿、管理常用資料、產生預覽與下載 JSON。
外部 Google Fonts 不納入離線快取，離線時使用裝置可用字型。

新版本會在背景下載，準備完成後可按「立即更新」。
系統會先將目前表單暫存於此分頁的 `sessionStorage`，
更新並重新載入後還原欄位、草稿狀態及預覽畫面，不會強制重載其他分頁。
若暫存失敗會停止更新，保留原填寫內容；更新資源快取也不會清除 `localStorage`。

選擇「稍後」會記住該版本，重新整理或開啟其他分頁不再重複提醒。
也可儲存工作後關閉所有網站分頁及 App 視窗，讓新版自動啟用。
原始版本會透過相容升級切換至新版快取，既有表單不會被強制重新載入。

安裝不會同步不同裝置的資料，移轉常用名單仍須使用 JSON 備份。

## 開發與測試

### 環境需求

| 工具 | 用途 |
| --- | --- |
| Python 3.10 以上 | 本機伺服器、PWA 圖示與快取版本產生工具。 |
| Pillow | 由既有品牌圖示輸出 PWA 圖示；版本記錄於 `requirements.txt`。 |
| Node.js 22 以上 | 執行使用內建測試執行器撰寫的測試。 |

可先建立虛擬環境，啟用後安裝開發工具相依套件：

```bash
python -m venv .venv
```

Windows PowerShell 啟用方式：

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS／Linux 啟用方式：

```bash
source .venv/bin/activate
```

安裝套件並重新產生 PWA 資源：

```bash
python -m pip install -r requirements.txt
python scripts/build_pwa.py
```

### 執行測試

測試使用 Node.js 內建模組，不需要另外安裝 npm 套件。
在專案根目錄執行：

```bash
node --test
```

測試涵蓋 JSON 驗證與合併、寫入失敗復原、草稿容量、付款資料驗證、
PWA 資源版本、離線快取、安裝中斷與快取清理。

瀏覽器端另應檢查手機工具列、資料選擇視窗、列印預覽，
並以開發者工具模擬離線及版本更新。
PWA 測試會比對原始檔與快取版本；若提示版本不符，請先執行建置工具。

### 擴充常用資料

共用備份邏輯位於 [favorites-backup.js](assets/js/favorites-backup.js)。
新增表單的常用資料類別時，透過 `FavoritesBackup.registerDataset(name, adapter)`
註冊儲存鍵、顯示名稱、空資料、驗證、合併及計數方法，
即可接入既有的匯出、匯入與預覽流程。

## 部署與更新

專案可部署到 GitHub Pages 等靜態網站主機，正式網站使用 HTTPS 與自訂網域。
目前網域設定記錄於 [CNAME](CNAME)。

發布前依序執行：

1. 修改頁面、CSS、JavaScript、圖示或 Manifest。
2. 執行 `python scripts/build_pwa.py`，重新產生圖示與版本化的 `service-worker.js`。
3. 執行上述完整測試，確認快取版本與檔案內容一致。
4. 將網站檔案與產生的 `service-worker.js` 一起提交及部署。

快取策略的來源是 [service-worker.template.js](scripts/service-worker.template.js)，
請修改範本後重新建置，不直接編輯產生的 `service-worker.js`。
README 的修改不影響離線資源版本，無須因此重新建置。

Manifest 與離線資源使用相對路徑，支援網域根目錄及 GitHub Pages 子目錄部署。
原始部署網址為
[bruce-yang-422.github.io/accounting_hr_forms](https://bruce-yang-422.github.io/accounting_hr_forms/)。

## 專案結構

```text
accounting_hr_forms/
├── index.html                   # 首頁與表單入口
├── favorites.html               # 個人、付款對象與備份管理
├── guide.html                   # 使用者操作說明
├── forms/                       # 請假單與請款單
├── assets/
│   ├── css/                     # 共用、管理頁、手機與列印樣式
│   ├── js/                      # 表單、資料儲存、管理介面與 PWA 邏輯
│   └── images/                  # branding 品牌、forms 表單與 pwa 安裝圖示
├── manifest.webmanifest         # PWA 安裝設定
├── service-worker.js            # 自動產生的離線快取程式
├── offline.html                 # 無法離線開啟網址時的備援頁
├── scripts/                     # PWA 建置、快取範本與專案樹工具
├── tests/                       # Node.js 資料與 PWA 測試
├── docs/                        # 輔助文件
└── requirements.txt             # Python 工具相依套件
```

## 問題回報與參與開發

請透過 [GitHub Issues](https://github.com/bruce-yang-422/accounting_hr_forms/issues)
回報問題，附上操作步驟、預期與實際結果，以及裝置、瀏覽器和是否安裝為 PWA。
截圖或範例檔案請先移除真實個資與銀行資訊。

提交 Pull Request 時，請說明修改目的、影響範圍與驗證方式。
涉及頁面或資源變動時，請同時更新 PWA 快取版本與相關操作文件。

專案維護者：[bruce-yang-422](https://github.com/bruce-yang-422)。

## 授權

本專案採用 [MIT 授權](LICENSE)。
使用、修改或散布時，請保留授權要求的版權聲明及授權文字。
