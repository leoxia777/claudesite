# Claude 360（sdg.pro 仿站）

零依赖的 Claude 订阅中转站演示：**前台商城 + 订单/交付 + 预付卡密兑换 + 邀请码 + 后台管理**，全部用 `node:http` 手写，无任何 npm 依赖。前端页面/资源与原站逐字节一致（见「验收结果」）。

## 快速开始

```bash
node server.js          # 或 npm start
# 前台  http://127.0.0.1:3000/
# 后台  纯 API（/admin 页面为 404，与原站一致）
#       双头鉴权：X-Admin-Token: c360-admin-dev（或 xmodel-admin）
#              + X-Site-Assertion: <GET /api/content/site 返回的 data.siteAssertion>
```

端口可用环境变量 `PORT` 覆盖（默认 3000）。

## 页面

| 路径 | 说明 |
|---|---|
| `/` | 首页 |
| `/products` | 全部商品 |
| `/products/claude-pro` | 分类页（claude-pro / claude-max / claude-ultra） |
| `/product` 逻辑 | 商品详情（listing 参数） |
| `/checkout` | 下单（Turnstile 模拟 + 二维码） |
| `/order` | 订单查询/查询交付 |
| `/redeem` | 预付卡密兑换（绑定商品 / 余额） |
| `/partner` | 合伙人/邀请页 |
| `/guide` `/faq` | 指南与常见问题 |
| `/admin` | 404（与原站一致）；后台管理全部走下方 `/api/admin/*` 等 API |

## 关键机制

- **Assertion 门禁**：`GET /api/content/site` 签发 `siteAssertion`（8 分钟 TTL），其余所有 /api 端点需要 `X-Site-Assertion` 头，否则 412 `SITE_ASSERTION_REQUIRED`。
- **Turnstile 模拟**：下单必须带 `turnstileToken`（开发环境 `dev` 即通过），配置来自 `/api/order-security/config`。
- **Admin 鉴权**：需 `X-Admin-Token`（`c360-admin-dev` / `xmodel-admin`）与 `X-Site-Assertion` 双头。只带断言无 token → 404 `NOT_FOUND`；只带 token 无断言 → 412。
- **限流**：120 req/min，超限 429 `TOO_MANY_REQUESTS`。
- **统一信封**：`{success:true,data}` / `{success:false,error:{code,message}}`。
- **兑换语义**：`/api/redeem/verify` 只读（不脏库）；未用 → `{valid:true, code, amount, currency:'CNY', productName}`；已用 → 409 `PREPAID_PAYMENT_REFERENCE_USED`；未知 → 404 `REDEEM_CODE_NOT_FOUND`。`/api/redeem/submit` 建 REX-* 订单（status `delivered`）；无绑定 listingId → deliveryPayload `{type:'balance', amount, note}`；重复兑换 → 409。
- **发卡密/邀请码**：count 1-50、amount>0、listingId 必须存在（如 LIST-000074）。码格式 SDG-XXXX-XXXX / INV-XXXXXX（6 位 hex）。

## 数据模型（data/db.json）

| 集合 | 键 | 说明 |
|---|---|---|
| `orders` | orderNo | ORD-*（正常下单）/ REX-*（卡密兑换），含 paid/delivered 状态与 deliveryPayload |
| `redeemCodes` | code | SDG-XXXX-XXXX，`amount`、可选 `listingId`（绑定商品），`usedAt/usedBy` |
| `inviteCodes` | code | INV-XXXXXX，`usedAt` |

静态内容在 `data/site.json`、`data/products.json`（52 条 listing）。商品语义：LIST-000074 = Claude Pro 成品号 349 元（delivery=account）；LIST-000005 = 订阅售罄（下单 409）。

启动时载入干净 seed（411B）；静态文件每请求读盘（改 `public/` 无需重启），改 `db.json` 必须重启。

## API 一览

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/content/site` | 无 | 签发 assertion + 站点内容 |
| GET | `/api/content/pay-qr` | assertion | 支付二维码 SVG |
| GET | `/api/products/listed` | assertion | 商品列表 |
| GET | `/api/products/categories` | assertion | 分类 |
| GET | `/api/order-security/config` | assertion | Turnstile 配置 |
| POST | `/api/orders` | assertion | 创建订单（Turnstile + 价格校验） |
| POST | `/api/orders/query` | assertion | 查询订单 |
| POST | `/api/orders/:no/paid-claim` | assertion | 标记已支付 |
| POST | `/api/orders/:no/deliveries/reveal` | assertion | 揭示交付内容（账号/余额） |
| GET | `/api/prepaid/batches` | assertion | 卡密批次 |
| POST | `/api/redeem/verify` | assertion | 校验卡密（只读） |
| POST | `/api/redeem/submit` | assertion | 兑换（绑定商品交付账号；无绑定交付余额） |
| POST | `/api/invite-codes/verify` | assertion | 校验邀请码 |
| GET | `/api/admin/orders` | admin 双头 | 全部订单（按 createdAt 倒序） |
| GET | `/api/admin/stats` | admin 双头 | 统计（订单/营收/卡密/邀请码），干净 seed = orders:0 revenue:0 redeemTotal:2 redeemUsed:0 inviteTotal:1 |
| POST | `/api/site-redemption/issue` | admin 双头 | 发卡密（amount + 可选 listingId） |
| POST | `/api/site-redemption/list` | admin 双头 | 卡密列表 |
| POST | `/api/invite-codes/issue` | admin 双头 | 发邀请码 |
| POST | `/api/invite-codes/list` | admin 双头 | 邀请码列表 |

合法下单 payload 示例：`{turnstileToken:'dev', familySlug:'claude-pro', brand:'claude', listingId:'LIST-000074', stableSku:'PROD-CLAUDE-PRO-M-ACCOUNT-KYC-FREE', currency:'CNY', price:349, quantity:1, total:349, contactEmail:'x@example.com', device_category:'pc'}`。

## E2E

```bash
node /tmp/e2e.mjs     # 50 项断言：静态页/门禁/下单/兑换/邀请码/后台
```

注意：E2E 会脏 `data/db.json`（建订单、消耗卡密/邀请码）。跑完需 `rm data/db.json` 并重启服务以恢复干净 seed。

## 验收结果

- **字节一致（线上对比）**：`node /tmp/diff_routes.mjs` → `ROUTES+ASSETS: PASS=89 FAIL=0`（40 路由 + 49 资源，对 sdg.pro 快照逐字节一致）。
- **字节一致（离线复核）**：`node /tmp/local_check.mjs` → `LOCAL CHECK: PASS=89 FAIL=0`（同 40 路由 + 49 资源，不碰线上）。
- **干净态冒烟**：`POST /api/redeem/verify`（SDG-DEMO-0002）→ 200 `{valid:true, amount:349, productName:'Claude Pro 成品号（月付·有质保·已过KYC·有概率free号）'}`；`GET /api/admin/stats`（双头）→ 200 `{orders:0, revenue:0, redeemTotal:2, redeemUsed:0, inviteTotal:1}`。verify 只读，db 未脏（411B seed，md5 3ec197a7f5e28abfdc5c6a5c4a5b8558）。
- 基准快照：`/tmp/live_*.html`(19) + `/tmp/live_*.out`(21)；资源清单 `/tmp/live_assets_clean.txt`(49)。

## Docker

```bash
docker build -t SDG .
docker run --rm -p 3000:3000 -v "$(pwd)/data:/app/data" SDG
```
