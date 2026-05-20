# accounting_hr_forms

靜態前端表單專案，提供「首頁入口、個人資料記憶庫、請假單、請款單、列印預覽」完整流程，並已部署到 GitHub Pages。

## 網站入口

- GitHub Pages：<https://bruce-yang-422.github.io/accounting_hr_forms/>

## 目前功能

- 首頁入口：集中進入請假單與請款單。
- 個人資料記憶庫：在首頁維護姓名、單位、職稱，資料儲存在瀏覽器 `localStorage`。
- 表單自動帶入：請假單與請款單會自動帶入預設個人資料。
- 請假單：支援假別切換、理由範本、時間計算、列印預覽。
- 請款單：支援填寫、預覽與列印輸出。
- 404 頁：GitHub Pages 找不到頁面時可回首頁或直接進表單。

## 專案結構

```text
accounting_hr_forms/
├─ 404.html
├─ index.html
├─ README.md
├─ requirements.txt
├─ assets/
│  ├─ css/
│  │  ├─ index.css
│  │  └─ styles.css
│  ├─ images/
│  │  └─ branding/
│  │     ├─ form-center-hero-banner-desktop.png
│  │     └─ form-center-hero-banner-mobile.png
│  └─ js/
│     ├─ data/
│     │  └─ leave_reason_library.js
│     ├─ forms/
│     │  ├─ leave_request_form.js
│     │  └─ payment_request_form.js
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
  - 包含個人資料記憶庫介面。

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

- `assets/js/profile-store.js`
  - 個人資料的 `localStorage` 存取封裝。

- `assets/js/profile-manager.js`
  - 首頁「個人資料記憶庫」介面邏輯。

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

## 補充

- `requirements.txt` 目前保留於 repo 中，但本專案現階段主要交付物是靜態前端頁面，不是 Python Web 應用。
- `docs/project_tree_structure.txt` 可由 `scripts/project_tree_structure_generator.py` 重新產生。
