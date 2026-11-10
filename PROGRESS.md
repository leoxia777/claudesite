# 复刻 claude360.pro — 进度看板（最终状态）

目标: 菜单/页面/CSS 与真站完全一致 + 后台 API 全链路可用。

## 验收结果（全部达成）
- [x] **字节一致**：40 路由 + 49 个 _next 静态资源与线上 claude360.pro 逐字节一致。
  - 线上对比: `node /tmp/diff_routes.mjs` → `ROUTES+ASSETS: PASS=89 FAIL=0 (routes=40 assets=49)`
  - 离线复核(不碰线上): `node /tmp/local_check.mjs` → `LOCAL CHECK: PASS=89 FAIL=0 (routes=40 assets=49)`
  - 404 行为一致: 未知路由返回真站 404 页字节 + HTTP 404。
- [x] **后台契约冒烟（干净 seed 态）**：
  - `POST /api/redeem/verify` C360-DEMO-0002 → 200 `{valid:true, amount:349, currency:'CNY', productName:...}`
  - `GET /api/admin/stats`（双头）→ 200 `{orders:0, revenue:0, redeemTotal:2, redeemUsed:0, inviteTotal:1}`
  - 只带 assertion 无 token → 404 NOT_FOUND；只带 token 无 assertion → 412 SITE_ASSERTION_REQUIRED；未知码 → 404 REDEEM_CODE_NOT_FOUND。
- [x] E2E 50 项（/tmp/e2e.mjs 全过，前轮已验，运行会脏库故本轮未重跑）。

## 运行状态
- 监听: PID 5759 `node server.js` @ :3000（lsof 确认）
- db: 干净 411B seed（md5 3ec197a7f5e28abfdc5c6a5c4a5b8558），verify 只读不脏库。

## 收尾
- [x] 更新 PROGRESS.md / README.md 为最终状态
