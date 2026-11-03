# accounting_hr_forms

靜態前端表單專案，提供「首頁入口、常用資料管理分頁、請假單、請款單、列印預覽」完整流程，並已部署到 GitHub Pages。

## 網站入口

- 正式網址：<https://office-forms.stack-base.com/>
- GitHub Pages 原始網址：<https://bruce-yang-422.github.io/accounting_hr_forms/>

## 目前功能

- 首頁入口：集中進入請假單與請款單。
- 常用資料：在「常用資料管理」分頁維護姓名、單位、職稱、請假時代理人、個人連絡電話，資料儲存在瀏覽器 `localStorage`。
- 表單自動帶入：請假單與請款單會自動帶入預設個人資料。
- 常用資料選單：表單姓名欄旁可手動選擇常用資料並帶入。
- 常用資料 JSON 備份：「常用資料管理」分頁可一次匯出／匯入個人資料與付款對象名單，支援合併或取代；表單內提供入口連結。
- 最近紀錄：請假單與請款單在列印 / 另存 PDF 前會保存最近 20 筆紀錄，可載入後修改。
- 草稿庫：請假單與請款單各有最多 5 筆草稿，可命名、搜尋、排序、查看內容、載入、重新命名及刪除，並顯示目前草稿的儲存狀態。
- 請假單：支援假別切換、理由範本、時間計算、列印預覽。
- 請款單：支援填寫、預覽與列印輸出。
- 付款對象常用名單：在請款單直接儲存、選取、更新同名對象與刪除，帶入戶名、受款方身分、付款方式、統編／身分證字號及銀行資料；名單保存在目前瀏覽器的 `localStorage`。
- 404 頁：GitHub Pages 找不到頁面時可回首頁或直接進表單。

## 資料保存設計

- 常用資料
  - 用途：保存常用填表人資料，減少重複輸入。
  - 保存內容：姓名、單位、職稱、請假時代理人、個人連絡電話。
  - 使用方式：「常用資料管理」分頁可新增、編輯、刪除，並可設定預設資料；表單姓名欄旁可從「常用資料」選單手動帶入。
  - 保存位置：瀏覽器 `localStorage`，資料只存在同一台裝置與同一個瀏覽器。

- 最近紀錄
  - 用途：保存已準備列印 / 另存 PDF 的表單，方便後續拉回修改。
  - 保存時機：按下「列印 / 另存 PDF」前自動保存。
  - 保存上限：每張表單最多 20 筆，超過上限自動移除最舊紀錄。

- 草稿
  - 用途：保存尚未完成或暫時不列印的表單內容。
  - 保存方式：按「儲存草稿」可選擇更新目前草稿或另存新草稿，自訂名稱；儲存成功後會顯示名稱與未儲存變更狀態。
  - 管理方式：「草稿庫」提供搜尋、依更新時間／名稱排序、內容摘要、載入確認、重新命名及刪除確認。
  - 額滿時：可管理並刪除舊草稿，再返回原本儲存流程，保留待儲存名稱；更新目前草稿不受新增筆數限制。
  - 相容性：保留既有瀏覽器草稿；不同表單草稿分開保存。已在其他分頁被刪除的草稿無法直接更新，需另存新草稿。
  - 保存上限：每張表單最多 5 筆，超過上限需先刪除舊草稿。

## 常用資料備份與擴充

- 「常用資料管理」分頁的「常用資料 JSON 匯出／匯入」下載所有已註冊的常用資料，包含預設人員、代理人、電話、付款方式與銀行資料。
- 匯入上限 5 MB，會先檢查格式、版本、識別碼及必要欄位，並顯示筆數；確認後才寫入。
- 合併：個人以「姓名＋單位」、付款對象以「戶名」比對，同名保留現有資料及目前預設人員，重複匯入不會增加相同資料。新增資料遇到識別碼衝突時會重新產生識別碼。
- 取代：只覆寫檔案包含的資料類別，空名單會清空該類別；未包含的類別不變。多類別寫入前會全部驗證，寫入失敗會嘗試復原已寫入的類別。
- 備份不包含草稿、最近紀錄或內建請假理由範本；JSON 含個資與銀行資訊，請妥善保管。
- 格式：`{ "format": "accounting-hr-favorites", "version": 1, "exportedAt": "ISO 日期時間", "datasets": { "profiles": { "profiles": [], "defaultId": null }, "payees": [] } }`。
- 共用模組：`assets/js/favorites-backup.js`；管理分頁操作：`assets/js/favorites-backup-ui.js`。
- 後續表單新增常用資料時，在共用模組內註冊，或於共用模組載入後、管理分頁操作模組載入前呼叫 `FavoritesBackup.registerDataset(name, adapter)`。Adapter 包含 `key`（既有 localStorage key）、`label`、`empty`、`validate(value)`（驗證並回傳清理後的資料）、`merge(current, incoming)` 及 `count(value)`。註冊後會自動加入全部匯出、匯入驗證、筆數預覽與寫入流程，無須修改 UI。
- 類別驗證須保護所有輸出欄位與識別碼；只允許明確註冊的 key 寫入。遇到未支援版本或資料類別時會拒絕匯入，避免遺失未識別的資料。
- 驗證指令：`node --test tests/favorites-backup.test.cjs`。

## 專案結構

```text
accounting_hr_forms/
├─ 404.html
├─ favorites.html
├─ guide.html
├─ index.html
├─ README.md
├─ requirements.txt
├─ assets/
│  ├─ css/
│  │  ├─ draft-library.css
│  │  ├─ index.css
│  │  └─ styles.css
│  ├─ images/
│  │  └─ branding/
│  │     ├─ form-center.ico
│  │     ├─ form-center-hero-banner-desktop.png
│  │     ├─ form-center-hero-banner-mobile.png
│  │     └─ not-found-cats-dogs.png
│  └─ js/
│     ├─ data/
│     │  └─ leave_reason_library.js
│     ├─ forms/
│     │  ├─ leave_request_form.js
│     │  └─ payment_request_form.js
│     ├─ draft-library.js
│     ├─ form-recent-records.js
│     ├─ favorites-backup.js
│     ├─ favorites-backup-ui.js
│     ├─ payee-favorites.js
│     ├─ profile-autofill.js
│     ├─ profile-manager.js
│     └─ profile-store.js
├─ docs/
│  └─ project_tree_structure.txt
├─ forms/
│  ├─ leave_request_form.html
│  └─ payment_request_form.html
├─ scripts/
│  └─ project_tree_structure_generator.py
└─ tests/
   ├─ favorites-backup.test.cjs
   └─ form-drafts.test.cjs
```

## 檔案分工

- `index.html`
  - 首頁與表單入口。
  - 提供常用資料管理分頁入口。

- `favorites.html`
  - 常用資料管理獨立分頁，包含人員資料維護與 JSON 匯出／匯入。

- `guide.html`
  - 網站操作說明頁。
  - 說明常用資料、草稿、最近紀錄、列印流程與資料保存限制。

- `forms/leave_request_form.html`
  - 請假單頁面。
  - 載入請假單邏輯、理由範本資料、自動帶入資料功能。

- `forms/payment_request_form.html`
  - 請款單頁面。
  - 載入請款單邏輯與自動帶入資料功能。

- `assets/css/styles.css`
  - 共用樣式，供首頁以外與列印版型使用。

- `assets/css/index.css`
  - 首頁專用樣式。

- `assets/js/data/leave_reason_library.js`
  - 請假理由範本資料庫，與主邏輯分離，方便維護。

- `assets/js/forms/leave_request_form.js`
  - 請假單互動邏輯。

- `assets/js/forms/payment_request_form.js`
  - 請款單互動邏輯。

- `assets/js/draft-library.js` 與 `assets/css/draft-library.css`
  - 共用草稿庫對話視窗、搜尋排序、內容檢視、管理操作與儲存狀態，含手機排版及鍵盤焦點管理。

- `assets/js/form-recent-records.js`
  - 請假單與請款單共用的最近紀錄與草稿儲存邏輯。
  - 最近紀錄：列印 / 另存 PDF 前自動保存，每張表單最多 20 筆，超過自動移除最舊資料。
  - 草稿：使用者手動保存，每張表單最多 5 筆，超過上限需先刪除舊草稿。

- `assets/js/profile-store.js`
  - 個人資料的 `localStorage` 存取封裝。

- `assets/js/profile-manager.js`
  - 常用資料管理分頁的人員資料介面邏輯。

- `assets/js/profile-autofill.js`
  - 進入表單頁時，自動將預設個人資料帶入欄位。

- `scripts/project_tree_structure_generator.py`
  - 專案樹產生器。
  - 預設輸出到 `docs/project_tree_structure.txt`。

## 本機使用方式

最簡單方式是直接開啟：

```text
index.html
```

也可以直接進入單一表單：

```text
forms/leave_request_form.html
forms/payment_request_form.html
```

## 技術說明

- 前端型態：純靜態 HTML / CSS / JavaScript
- 部署方式：GitHub Pages
- 字型：Google Fonts `Noto Sans TC`
- 個人資料儲存：瀏覽器 `localStorage`
- 最近紀錄與草稿儲存：瀏覽器 `localStorage`

## 補充

- `requirements.txt` 目前保留於 repo 中，但本專案現階段主要交付物是靜態前端頁面，不是 Python Web 應用。
- `docs/project_tree_structure.txt` 可由 `scripts/project_tree_structure_generator.py` 重新產生。

## 草稿測試

執行 `node --test tests/form-drafts.test.cjs tests/favorites-backup.test.cjs`，驗證容量限制、更新、命名刪除、資料相容與儲存錯誤，以及常用資料備份流程。
