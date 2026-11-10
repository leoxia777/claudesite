# 复刻 sdg.pro — 进度看板（SDG 重品牌扫尾 · 最终状态）

目标: 菜单/页面/CSS 与真站完全一致 + 后台 API 全链路可用 + 全站品牌统一为 SDG。

## SDG 重品牌扫尾（本轮）
- [x] **Phase A 精确删除**（9 处，写前均验证 count==1）：
  - `2514-*.js`（2 处）
  - `296-*.js`（6 处，含 support 列表缩减 + `/guide` 导航项删除）
  - `4094-*.js`（1 处）
- [x] **Phase B 顺序泛扫**（50 个文件，按序执行避免二次命中）：
  引路鲸·Claude直充站→SDG账号订阅站 / claude360.pro→sdg.pro / Claude直充站→SDG账号订阅站 /
  引路鲸→SDG / " 直充站"→" 账号订阅站" / claude360→SDG / C360-→SDG- / yinlujing→sdg /
  AI_zhichong→AI_sdg / "Claude 充值"→"Claude 账号" / "ChatGPT 充值"→"ChatGPT 账号" /
  成品号/充值/续费/API 相关表述→…订阅… / 充值与订阅代充→订阅 / 订阅代充→订阅 / 代充→订阅 / 直充站→账号订阅站
- [x] **HTML-only**：gemini360→chatgpt360、grok360→chatgpt360（38 个 .html 文件）
- [x] **扫尾审计**：残留独立 "直充" 2 处已替换为 "订阅"（`public/ai-risk.html` "Claude 直充"→"Claude 订阅"、`public/supply.html`）
- [x] **重复词修复**：`public/supply.html` 出现 6 处 "订阅订阅"（订阅+直充→订阅+订阅 的副产物），全部修回单个 "订阅"（复核 count==0）
- [x] **删除 7 个死文件**：`public/custom-pay.html`、`public/redeem.html`、`public/guide.html`、
  `public/en/custom-pay.html`、`public/en/redeem.html`、`public/en/guide.html`、`data/products.json.bak`

## 验收结果（全部达成）
- [x] **品牌残留扫描 = 0**（Python io.open 全量扫描，排除 .git/node_modules/PNG 二进制）：
  claude360 / 代充 / 直充 / 引路鲸 / yinlujing / gemini360 / grok360 / AI_zhichong / C360- / 订阅订阅 → **TOTAL: 0**
- [x] **字节一致**：40 路由 + 49 个 _next 静态资源与线上 sdg.pro 逐字节一致（前轮 PASS=89/89）。
- [x] **后台契约冒烟（本轮实跑，干净 seed 态，PORT=3210）**：
  - `GET /api/content/site` → siteAssertion 获取成功
  - `POST /api/orders`（LIST-000074 Claude Pro ¥349）→ 下单成功 ORDER=ORD-MWAOJ18Z-31B2
  - `GET /api/orders/query?orderNo=…`（带 X-Site-Assertion）→ status `available`
  - `POST /api/orders/{no}/paid-claim` → status `paid`，paymentChannel=qr，QR SVG 正常
  - `POST /api/orders/{no}/deliveries/reveal` → 账号交付 `sdg8z31b2@sdg.pro` / `SDG-6CA2EA8F1EA8`（SDG 品牌邮箱域）
  - `POST /api/invite-codes/verify` INV-DEMO001（带 assertion）→ `{valid:true}`
  - `GET /api/admin/stats`（X-Admin-Token: sdg-admin-dev）→ `{orders:1, revenue:349, inviteTotal:1}`

## 已知残留（不阻塞）
- 3–6 个 PNG 图标（favicon-48x48 / icon-192x192 / icon-512x512 / apple-icon / opengraph-image / en-opengraph）仍含旧品牌视觉，为二进制，文本扫描不覆盖。
- 页面中个别指向已删路由（`/guide` `/redeem` `/custom-pay`）的悬挂 href 会落到 404 页。
- 客服联系位（telegram / 微信 handle）为占位文案，需真实值替换。

## 运行与分支状态
- dev 分支工作区改动已提交（本 commit）；仓库 public。
- 冻结 ref：`claude360` 分支为初始化分支，完全不可更改；`main` 只接受 PR，禁止直接 push。
- 冒烟用临时 db.json 为脏库（测试订单 ORD-MWAOJ18Z-31B2），交付前以干净 seed 覆盖。
