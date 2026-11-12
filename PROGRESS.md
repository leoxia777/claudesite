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

## 首页三产品 tab（Phase 3 · 2026-11-11）
- [x] 首页第一屏三 tab：Claude Team / Claude Personal / ChatGPT Personal；选中 tab 显示对应套餐。
- [x] Claude Team 两档 $25 / $125（LIST-000077 / LIST-000078，SKU PROD-CLAUDE-TEAM-25-M / 125-M）。
- [x] ChatGPT Personal 两档 $100 / $200（LIST-000079 / LIST-000080，SKU PROD-CODEX-100-M / 200-M）。
- [x] 产品 tab 显示文案改名 Codex Personal → ChatGPT Personal（仅改 public/index.html 中 tab label / 卡标题 / 徽章 / h1 / 简介文案；内部标识符 tab id codex-personal、familySlug、SKU、listing 均不变）。
- [x] claude-personal 原 3 张 hero 卡（LIST-000076 / 000045 / 000046）运行时搬入面板，BUILTIN_CARDS 只内建 claude-team / codex-personal。
- [x] 补贴锚点 `[data-subsidy-entry]` 拦截 → 切 claude-personal tab 并滚动到 `#subsidy-hero-LIST-000076`。
- [x] 终验脚本 `/tmp/final_verify_v2.js` **22/22 PASS，exit 0**。

### 终验断言定案（本轮 2 处修正，均为断言比较产物，非产品缺陷）
- FAIL A（$ tokens）：旧断言用 `parseFloat(a)-parseFloat(b)` 排序后与硬编码期望顺序比对。实锤 `parseFloat("$25") → NaN`，`NaN-NaN=NaN`，sort 为纯空操作（文档序 `["$25","$125","$100","$200"]`），与硬编码期望字面不一致而 FAIL。修正为**集合相等**比较。
- FAIL B（¥ 价格）：Max / Ultra hero 卡带千位逗号，HTML 原文为 `¥1,899` / `¥2,899`，旧断言 `/¥1899/` 恒 false。修正为逗号兼容正则 `/¥1,?899/`、`/¥2,?899/`。
- 两断言修正后其余 20 项原 PASS 保持不变。

### 尚未测试（浏览器行为）
- **DOM 级实测通过**：`/tmp/dom_tab_test.js` 在 claudesite cwd 下实跑 **20/20 PASS，exit 0，页面脚本错误 0 条**（jsdom 加载，非真实浏览器渲染；页面取自活服务器 `http://127.0.0.1:3000/`，非读文件）。覆盖：tab 结构（#cx-hero-tabs / tablist 恰 3 按钮 / id/label/aria-controls）、面板卡归属（team=000077/000078 恰 2 卡、codex=000079/000080 恰 2 卡、personal=000076/000045/000046 恰 3 卡，原 hero 3 卡整棵搬入 personal 面板）、默认态（claude-team selected、另 2 面板 hidden）、点击 codex/personal tab 显隐翻转、键盘 5 条（线性 3 + 两端循环 2）、补贴锚点点击后 claude-personal 激活并显 panel。
- **f2 循环语义定案**：仅两端 team↔codex 循环（team ArrowLeft → codex、codex ArrowRight → team）；中间 tab 为线性前/后一个（codex ArrowLeft → claude-personal）。首跑 16/17 的唯一 FAIL 为测试自身期望写错（非产品缺陷），修正为 5 条键盘断言后重跑 20/20。
- **真实浏览器 headless 实测通过**：`Google Chrome --headless=new --dump-dom http://127.0.0.1:3000/` → dump 256526 字节（> 原始静态页 222205，证明运行时 tab 构建在真实浏览器生效）；`/tmp/chrome_assert_v2.js` 对 dump 断言 **15/15 PASS，exit 0**。覆盖：#cx-hero-tabs 容器、tablist 标签恰 1 个、role=tab 按钮恰 3 个且顺序 claude-team/claude-personal/codex-personal、3 个 label 文案（按钮内文）、默认 aria-selected=claude-team（另 2 false）、team 面板无 hidden / personal+codex 面板 hidden、team 面板含 LIST-000077+000078、codex 面板含 LIST-000079+000080、personal 面板（完整内容区，非截断窗口）含原 hero 3 卡 LIST-000076/000045/000046。首跑 4 个 FAIL 均为断言假象（label 是按钮内文非属性、personal 面板完整内容区 13325 字符超出旧 6000 字符窗口），按源码/DOM 事实修正断言范围后全 PASS，非放宽。
- 仍**尚未测试（浏览器行为）**：视觉样式、`scrollIntoView` 实际滚动（jsdom 无布局，测试中已 stub）。

### 删除首页「百万补贴精选」pill 与「立即抢补贴」行（2026-11-11）
- [x] `public/index.html` 预渲染 DOM 与 RSC flight 数据（同文件内）成对删除：`<a href="#subsidy-hero-LIST-000076" data-subsidy-entry="home">…百万补贴精选…</a>` 与第二行 `flex flex-col sm:flex-row items-center gap-3`（立即抢补贴 / 查看充值教程 / 找 Claude 顾问）。
- [x] 保留：`subsidy-hero-LIST-000076` 产品卡（DOM + flight 均在）、文件尾部 IIFE（`closest('[data-subsidy-entry]')` + `if (!a) return;`，锚点删除后为安全 no-op）。
- [x] 终验 jsdom 31.0.0 hydrate 实跑 **11/11 PASS，exit 0**（`/tmp/jsdom_hydration_check2.js`；需 polyfill `ReadableStream`/`performance.mark`，系 jsdom 缺口非页面缺陷）。对照组（未编辑备份 `/tmp/index.html.bak`，`/tmp/jsdom_control_check.js`）同样抛 Minified React #418 且参数相同（args `text`/`""`）→ 该错误为**既有 jsdom 伪影**，与本次编辑无关，脚本已将其列为已知基线过滤。
- [x] 静态计数：百万补贴精选=0、找 Claude 顾问=0、查看充值教程=0、data-subsidy-entry=1（仅 IIFE）、立即抢补贴=8（4 DOM + 4 flight 保留）、subsidy-hero-LIST-000076=3（DOM 卡 + flight 卡 + IIFE）；hydrate 后 DOM 锚点 63→60（−3 = pill 锚点 + 行内 2 链接）。
- [x] 活服务器 `curl http://localhost:3000/` HTTP 200，231925 字节，与磁盘 **BYTE-IDENTICAL**（`cmp` 通过）。git diff 仅本次 splice（单行 HTML：1+/1−）。
- 仍**尚未测试（真实浏览器渲染）**：jsdom hydrate 已覆盖 DOM 级断言与脚本错误；视觉样式与真实浏览器水合未实测（与既有条目口径一致）。

### 「Codex Personal → ChatGPT Personal」改名复核（2026-11-11）
- [x] 显示文案已全部 ChatGPT 化：public/index.html ×6（tab label / 卡标题 / 徽章行 / h1 / 简介）、data/products.json ×4、data/db.json ×2；"Codex Personal" 字面量仅剩本文件 :48 历史条目（历史日志不改写）。
- [x] 全库复核：`Codex 个人 / Codex 个人版 / Codex 个人号` 显示残留零命中；其余所有 "Codex" 命中均为 OpenAI Codex 产品文案（Work/Codex 入口、ChatGPT Codex 额度充值、Codex 高额度 tag、Claude Code/Codex/CLI 等；涉及 public/products.html、public/checkout.html、public/announcement.html、public/api-transit.html、public/ai-risk.html 及 chunks 2514/8893/4094），不属于本次改名范围。
- [x] 内部标识符按规则未动：tab id `codex-personal`、`familySlug:'codex-personal'`、`brand:'codex'`、SKU `PROD-CODEX-100-M/200-M`、LIST-000079/000080。

### 套餐冗余信息删除 + 百万补贴统一移除（2026-11-11）
- [x] `public/index.html` 首页套餐卡冗余信息精简：codex-personal 两卡（LIST-000079/000080）fromPrice/desc/tags 精简，`variant` 置空、`warranty` 字段删除；`cardHTML` 增加 variant 条件渲染 guard（`(o.variant ? '<p…>…</p>' : '')`），claude-team 卡（`variant:'席位'`、`warranty:false`）如实区分、未动。
- [x] 百万补贴信息统一移除：「百万补贴精选」pill 锚点、「立即抢补贴」CTA 行（含查看充值教程 / 找 Claude 顾问）随预渲染 DOM + RSC flight 成对删除；全库复核 `百万补贴|立即抢补贴` 0 命中（`data/products.json` `warranty` 数据字段——server.js :137/:195/:224 消费生成 `paymentGuarantee` 文案——与 `db.json` `paymentGuarantee` 值均为数据字段而非展示文案，如实保留）。
- [x] ChatGPT Plus/Pro 系列（LIST-000067/000065/000003/000066）独立产品线未动；内部标识符（tab id `codex-personal`、`brand:'codex'`、`familySlug`、SKU、listingId、`subsidy-hero-…` id、IIFE 拦截选择器）按约束全部保留。
- [x] 验证证据：
  - grep：index.html 中 `独立成品号|30天订阅质保|含 30 天质保|百万补贴|立即抢补贴|variant:'成品号'|warranty:true` 0 命中；全库 `百万补贴|立即抢补贴` 0 命中；「有质保」仅剩服务保障行 + 质保售后 FAQ 共 8 处（合法保留）。
  - 活服务器 `curl http://127.0.0.1:3000/` → HTTP 200 / 209897 字节，`cmp` 与 `public/index.html` **BYTE-IDENTICAL**；交付页含新标题、无补贴字样。
  - jsdom 回归 `/tmp/dom_tab_test.js`（页面取自活服务器）：**19/19 PASS，exit 0，页面脚本错误 0 条**。两条旧 FAIL 均为断言过期而非页面缺陷：① a3 tab[2] 脚本硬编码 `expectedLabel['codex-personal']='Codex Personal'`，用户要求改名后页面已是 `ChatGPT Personal`（内部 id `codex-personal` 不变）→ 断言同步为 `ChatGPT Personal`；② g0 原断言 `[data-subsidy-entry]` 锚点存在，git 证据（`git show HEAD:` 版第 1 行含真实锚点元素 vs staged 版仅剩 IIFE 选择器字符串）确认锚点随百万补贴信息被有意移除 → g0 改为断言锚点**不存在**，依赖它的 g1 删除。属正当测试维护，非伪造通过。
- 仍**尚未测试（真实浏览器渲染）**：视觉样式与真实浏览器水合未实测（与既有条目口径一致；jsdom 已覆盖 DOM 结构与交互断言）。
