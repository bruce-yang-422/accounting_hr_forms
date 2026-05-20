# accounting_hr_forms

內部表單專案，現階段以靜態 HTML 表單為主，提供首頁入口、請假單與請款單的填寫、預覽與列印流程。

## 專案結構

```text
accounting_hr_forms/
├─ assets/
│  ├─ css/
│  │  └─ styles.css
│  ├─ fonts/
│  │  └─ Noto_Sans_TC/
│  └─ js/
│     ├─ data/
│     │  └─ leave_reason_library.js
│     └─ forms/
│        ├─ leave_request_form.js
│        └─ payment_request_form.js
├─ docs/
│  └─ project_tree_structure.txt
├─ forms/
│  ├─ leave_request_form.html
│  └─ payment_request_form.html
├─ scripts/
│  └─ project_tree_structure_generator.py
├─ index.html
├─ README.md
└─ requirements.txt
```

## 為什麼這樣分

- `forms/`：放各張表單頁面，之後新增 `purchase_order.html`、`travel_request.html` 會很直覺。
- `assets/css/`：集中共用樣式。
- `assets/js/forms/`：每張表單自己的互動邏輯。
- `assets/js/data/`：純資料檔，例如請假理由範本庫，避免主程式過大。
- `assets/fonts/`：字型與靜態素材。
- `docs/`：規格、專案樹等文件。
- `scripts/`：輔助腳本與開發工具。

這種分法接近常見的小型前端或靜態網站專案結構，夠清楚，也不會過度複雜。

## 使用方式

直接開啟首頁：

```text
index.html
```

或直接進入表單：

```text
forms/leave_request_form.html
forms/payment_request_form.html
```

## 已有表單

- `forms/leave_request_form.html`：請假單
- `forms/payment_request_form.html`：請款單

## 資料檔維護

請假單的範本庫已獨立到：

```text
assets/js/data/leave_reason_library.js
```

之後如果要新增或修改範本，直接改這個檔案即可，不需要碰表單主邏輯。
