# accounting_hr_forms

靜態前端表單專案，提供「首頁入口、常用資料、請假單、請款單、列印預覽」完整流程，並已部署到 GitHub Pages。

## 網站入口

- 正式網址：<https://office-forms.stack-base.com/>
- GitHub Pages 原始網址：<https://bruce-yang-422.github.io/accounting_hr_forms/>

## 目前功能

- 首頁入口：集中進入請假單與請款單。
- 常用資料：在首頁維護姓名、單位、職稱、請假時代理人、個人連絡電話，資料儲存在瀏覽器 `localStorage`。
- 表單自動帶入：請假單與請款單會自動帶入預設個人資料。
- 常用資料選單：表單姓名欄旁可手動選擇常用資料並帶入。
- 最近紀錄：請假單與請款單在列印 / 另存 PDF 前會保存最近 20 筆紀錄，可載入後修改。
- 草稿：請假單與請款單可手動保存最多 5 筆草稿，超過上限需先刪除舊草稿。
- 請假單：支援假別切換、理由範本、時間計算、列印預覽。
- 請款單：支援填寫、預覽與列印輸出。
- 404 頁：GitHub Pages 找不到頁面時可回首頁或直接進表單。

## 資料保存設計

- 常用資料
  - 用途：保存常用填表人資料，減少重複輸入。
  - 保存內容：姓名、單位、職稱、請假時代理人、個人連絡電話。
  - 使用方式：首頁可新增、編輯、刪除，並可設定預設資料；表單姓名欄旁可從「常用資料」選單手動帶入。
  - 保存位置：瀏覽器 `localStorage`，資料只存在同一台裝置與同一個瀏覽器。

- 最近紀錄
  - 用途：保存已準備列印 / 另存 PDF 的表單，方便後續拉回修改。
  - 保存時機：按下「列印 / 另存 PDF」前自動保存。
  - 保存上限：每張表單最多 20 筆，超過上限自動移除最舊紀錄。

- 草稿
  - 用途：保存尚未完成或暫時不列印的表單內容。
  - 保存方式：使用者手動按「儲存草稿」。
  - 保存上限：每張表單最多 5 筆，超過上限需先刪除舊草稿。

## 專案結構

```text
accounting_hr_forms/
├─ 404.html
├─ guide.html
├─ index.html
├─ README.md
├─ requirements.txt
├─ assets/
│  ├─ css/
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
│     ├─ form-recent-records.js
│     ├─ profile-autofill.js
│     ├─ profile-manager.js
│     └─ profile-store.js
├─ docs/
│  └─ project_tree_structure.txt
├─ forms/
│  ├─ leave_request_form.html
│  └─ payment_request_form.html
└─ scripts/
   └─ project_tree_structure_generator.py
```

## 檔案分工

- `index.html`
  - 首頁與表單入口。
  - 包含常用資料介面。

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

- `assets/js/form-recent-records.js`
  - 請假單與請款單共用的最近紀錄與草稿儲存邏輯。
  - 最近紀錄：列印 / 另存 PDF 前自動保存，每張表單最多 20 筆，超過自動移除最舊資料。
  - 草稿：使用者手動保存，每張表單最多 5 筆，超過上限需先刪除舊草稿。

- `assets/js/profile-store.js`
  - 個人資料的 `localStorage` 存取封裝。

- `assets/js/profile-manager.js`
  - 首頁「常用資料」介面邏輯。

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
