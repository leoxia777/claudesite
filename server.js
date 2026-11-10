/**
 * sdg.pro 本地仿站 — 零依赖 node:http
 * 前端契约严格对齐线上 chunk 逻辑:
 *  - 信封: {success:true,data} / {success:false,error:{code,message}}
 *  - data 形状 (chunk 4309 解包层): POST /api/orders -> {order};
 *    /api/orders/query -> {order}; /api/orders/:orderNo (GET/POST) -> {order};
 *    paid-claim -> {order}; deliveries/reveal -> {delivery}
 *  - Site-Assertion: /api/content/site 签发, 8 分钟过期, 其余 /api 端点校验
 *    (缺失 SITE_ASSERTION_REQUIRED / 过期 SITE_ASSERTION_EXPIRED)
 *  - 下单门禁: turnstileToken 缺失 -> ORDER_TOKEN_REQUIRED (dev 接受任意非空 token)
 *  - 下单校验: CNY only / price<=1e7 两位小数 / quantity 安全整数 / total 分精度
 *  - 静态: public 下真实文件存在则 serve, 否则发 404.html 字节 + HTTP 404
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const site = require('./data/site.json');
const catalog = require('./data/products.json');

/* ---------------- 归一化: 裸数组 -> listing 模型 (chunk 5619 字段名) ---------------- */
const strPrice = (v) => Number(String(v || '').replace(/[¥$,\s]/g, '')) || 0;
const products = catalog.map((x) => ({
  listingId: x.id,
  stableSku: String(x.extra.sku || x.id),
  familySlug: x.category || 'other',
  brand: String(x.extra.brand || ''),
  name: x.title,
  subtitle: String(x.subtitle || ''),
  price: strPrice(x.extra.fromPrice) || strPrice(x.value),
  category: x.category || 'other',
  delivery: x.extra.delivery || 'account',
  warranty: x.extra.warranty === 'true',
  soldOut: x.extra.soldOut === 'true',
  orderable: x.extra.orderable === 'true',
  buyNotice: JSON.parse(x.extra.buyNotice || '[]'),
  highlights: JSON.parse(x.extra.highlights || '[]'),
  tags: JSON.parse(x.extra.tags || '[]'),
  sortOrder: Number(x.extra.order) || 0
})).sort((a, b) => a.sortOrder - b.sortOrder);
const categories = [...new Set(catalog.map((x) => x.category || 'other'))].map((slug) => ({ slug, label: slug, order: 0 }));

/* ---------------- 状态 (内存 + 落盘 data/db.json) ---------------- */
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const db = Object.assign({ orders: {}, inviteCodes: {} },
  fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : {});
function persist() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch {}
}
function seed() {


  if (!db.inviteCodes['INV-DEMO001']) db.inviteCodes['INV-DEMO001'] =
    { code: 'INV-DEMO001', usedAt: null };
  persist();
}
seed();

/* ---------------- Site-Assertion ---------------- */
const assertions = new Map(); // token -> expiresAt
const ASSERT_TTL = 8 * 60 * 1000; // 8 分钟
function mintAssertion() {
  const t = crypto.randomBytes(16).toString('hex');
  assertions.set(t, Date.now() + ASSERT_TTL);
  return t;
}
function checkAssertion(req) {
  const t = req.headers['x-site-assertion'];
  if (!t || !assertions.has(t)) return { code: 'SITE_ASSERTION_REQUIRED', message: '站点凭证缺失，请刷新页面重试' };
  if (Date.now() > assertions.get(t)) return { code: 'SITE_ASSERTION_EXPIRED', message: '站点凭证已过期，请刷新页面重试' };
  return null;
}

/* ---------------- 信封 & 错误 ---------------- */
const ok = (res, data) => send(res, 200, { success: true, data });
const err = (res, status, code, message) => send(res, status, { success: false, error: { code, message } });
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,X-Site-Host,X-Site-Assertion,X-Admin-Token', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  res.end(body);
}
function readJson(req) {
  return new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve(null); } });
  });
}

/* ---------------- 限速 (TOO_MANY_REQUESTS) ---------------- */
const rate = new Map();
function rateLimit(req) {
  const key = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?');
  const now = Date.now();
  const rec = rate.get(key) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  rec.n++;
  rate.set(key, rec);
  return rec.n > 120;
}

/* ---------------- 伪 QR 码 (SVG data URI) ---------------- */
function qrDataUri(seed) {
  let h = 2166136261 >>> 0;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  let s = h || 1;
  const grid = [];
  for (let i = 0; i < 441; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; grid.push((s >>> 16) & 1); }
  const inFinder = (x, y) => (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
  let cells = '';
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    let dark;
    if (inFinder(x, y)) {
      const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y;
      dark = (fx === 0 || fx === 6 || fy === 0 || fy === 6) || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
    } else dark = grid[y * 21 + x] === 1;
    if (dark) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges"><rect width="21" height="21" fill="#fff"/><g fill="#111">${cells}</g></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

/* ---------------- 交付内容 ---------------- */
function buildDelivery(order) {
  if (order.delivery === 'account') {
    const tail = order.orderNo.replace(/[^A-Z0-9]/g, '').slice(-6).toLowerCase();
    return {
      type: 'account',
      account: {
        email: 'sdg' + tail + '@sdg.pro',
        password: 'SDG-' + crypto.randomBytes(6).toString('hex').toUpperCase()
      },
      guide: '使用交付邮箱登录，勿修改绑定邮箱，账号归属以交付信息为准。',
      warranty: order.warranty ? '30天订阅质保：异常补发或退款' : '本规格无质保，交付以页面说明为准'
    };
  }
  return { type: order.delivery || 'account', account: null, guide: '', warranty: '' };
}



/* ---------------- 下单校验 (对齐 chunk 5619 字段规则) ---------------- */
function validateOrderPayload(b) {
  const familySlug = String(b.familySlug || '');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(familySlug) || familySlug.length > 96)
    return { code: 'INVALID_INPUT', message: '商品分类不合法' };
  const brand = String(b.brand || '');
  if (brand.length > 96) return { code: 'INVALID_INPUT', message: '品牌字段不合法' };
  const listingId = String(b.listingId || '');
  if (listingId.length > 128) return { code: 'INVALID_INPUT', message: '商品编号过长' };
  if (typeof b.stableSku !== 'string' || !b.stableSku) return { code: 'INVALID_INPUT', message: '缺少 stableSku' };
  if (b.currency !== 'CNY') return { code: 'INVALID_INPUT', message: '仅支持人民币 (CNY) 结算' };
  const price = Number(b.price);
  if (!Number.isFinite(price) || price <= 0 || price > 1e7)
    return { code: 'INVALID_INPUT', message: '单价不合法' };
  if (Math.round(price * 100) !== price * 100)
    return { code: 'INVALID_INPUT', message: '单价最多两位小数' };
  if (!Number.isSafeInteger(b.quantity) || b.quantity <= 0)
    return { code: 'INVALID_INPUT', message: '数量须为正整数' };
  const totalCents = Math.round(100 * price) * b.quantity;
  if (b.total != null && Math.round(Number(b.total) * 100) !== totalCents)
    return { code: 'VALIDATION_ERROR', message: '订单金额与单价×数量不一致' };
  if (totalCents > 500000000) return { code: 'PAYMENT_AMOUNT_LIMIT', message: '单笔订单金额超出限制' };
  return null;
}

/* ---------------- 业务动作 ---------------- */
function createOrder(b) {
  const product = products.find((p) => p.listingId === String(b.listingId));
  if (!product) return { status: 404, code: 'NOT_FOUND', message: '商品不存在' };
  if (product.soldOut || !product.orderable) return { status: 409, code: 'CONFLICT', message: '该规格暂时售罄' };
  const price = Number(b.price), quantity = b.quantity;
  const total = Math.round(100 * price) * quantity / 100;
  const orderNo = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
  const order = {
    orderNo,
    listingId: product.listingId,
    stableSku: product.stableSku,
    familySlug: product.familySlug,
    name: product.name,
    delivery: product.delivery,
    warranty: product.warranty,
    price, quantity: b.quantity,
    total, currency: 'CNY',
    contactEmail: String(b.contactEmail || ''),
    deviceCategory: b.device_category === 'h5' ? 'h5' : 'pc',
    status: 'available',
    canCreateNewOrder: true,
    paymentProvider: 'third_party',
    paymentChannel: 'qr',
    personal_code: 'PC-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    paymentGuarantee: product.warranty ? '官方交付质保：异常补发或退款' : '本规格无质保，交付以页面说明为准',
    paymentOptions: [],
    paymentCodeImage: null,
    createdAt: new Date().toISOString(),
    paidAt: null, deliveredAt: null, deliveryPayload: null
  };
  const qr = qrDataUri(orderNo);
  order.paymentOptions = [{ channel: 'qr', codeImage: qr }];
  order.paymentCodeImage = qr;
  db.orders[orderNo] = order;
  persist();
  return { status: 200, order };
}

/* ---------------- API 路由 ---------------- */
async function api(req, res, pathname, url) {
  if (rateLimit(req)) return err(res, 429, 'TOO_MANY_REQUESTS', '请求过于频繁，请稍后再试');
  const b = req.method === 'POST' ? await readJson(req) : {};
  if (req.method === 'POST' && b === null) return err(res, 400, 'INVALID_INPUT', '请求体须为 JSON');

  // 站点内容 (GET, 签发 assertion)
  if (pathname === '/api/content/site' && req.method === 'GET') {
    const content = {
      skus: products,
      categories,
      faq: [
        { q: '支持哪些支付方式？', a: '仅支持人民币 (CNY)，扫码支付，无需海外信用卡。' },
        
        { q: 'Claude Team 席位和个人成品号有什么区别？', a: '个人成品号直接交付独立账号，开箱即用；Team 席位按席位购买，可加入共享 Team 工作区。' },
        { q: '有质保吗？', a: '标注“有质保”的规格提供售后质保，异常补发或退款；无质保规格以页面说明为准。' },
        { q: '客服时间？', a: site.site.contact.hours + '，Telegram: ' + site.site.contact.telegram }
      ],
      guide: [{ title: '首次使用指南', body: '选择规格 → 填写联系邮箱 → 扫码支付 → 订单页跟踪交付。' }],
      announcements: [],
      settings: { currency: 'CNY', locale: 'zh-CN' },
      localization: { locale: 'zh-CN', currency: 'CNY', inLanguage: site.site.contact.language }
    };
    return ok(res, { content, siteAssertion: mintAssertion() });
  }
  // content 其余端点
  if (pathname === '/api/content/pay-qr') return ok(res, { image: qrDataUri('pay-qr'), channel: 'qr' });

  // 其余端点先校验 assertion（admin 路由免 assertion，仅凭 X-Admin-Token）
  const isAdminRoute = pathname.startsWith('/api/admin/') || pathname === '/api/invite-codes/issue' || pathname === '/api/invite-codes/list';
  if (!isAdminRoute) {
    const assertErr = checkAssertion(req);
    if (assertErr) return err(res, 412, assertErr.code, assertErr.message);
  }

  if (pathname === '/api/products/listed') return ok(res, { products });
  if (pathname === '/api/products/categories') return ok(res, { categories });
  if (pathname === '/api/order-security/config')
    return ok(res, { turnstile: { sitekey: 'dev-sitekey', action: 'order_create', appearance: 'interaction-only', execution: 'execute', language: 'zh-cn' } });

  if (pathname === '/api/orders' && req.method === 'POST') {
    const t = b.turnstileToken;
    if (typeof t !== 'string' || !t.trim()) return err(res, 400, 'ORDER_TOKEN_REQUIRED', '未完成人机验证，请稍后重试');
    const v = validateOrderPayload(b);
    if (v) return err(res, 400, v.code, v.message);
    const r = createOrder(b);
    return r.status === 200 ? ok(res, { order: r.order }) : err(res, r.status, r.code, r.message);
  }

  if (pathname === '/api/orders/query') {
    const o = db.orders[String(b.orderNo || url.searchParams.get('orderNo') || '')];
    if (!o) return err(res, 404, 'ORDER_NOT_FOUND', '未找到订单，请核对订单号');
    return ok(res, { order: o });
  }

  // /api/orders/:orderNo/...
  const m = pathname.match(/^\/api\/orders\/([^\/]+)\/(.+)$/);
  if (m) {
    const order = db.orders[m[1]];
    if (!order) return err(res, 404, 'ORDER_NOT_FOUND', '未找到订单，请核对订单号');
    if (m[2] === 'paid-claim') {
      if (order.status !== 'available') return err(res, 409, 'CONFLICT', '订单状态已变化，请刷新');
      order.status = 'paid'; order.paymentChannel = 'qr'; order.paidAt = new Date().toISOString();
      persist();
      return ok(res, { order });
    }
    if (m[2] === 'deliveries/reveal') {
      if (order.status !== 'paid') return err(res, 400, 'VALIDATION_ERROR', '请先完成支付再查看交付');
      order.status = 'delivered'; order.deliveredAt = new Date().toISOString();
      order.deliveryPayload = buildDelivery(order);
      persist();
      return ok(res, { delivery: order.deliveryPayload });
    }
    return err(res, 404, 'NOT_FOUND', '接口不存在');
  }

  // /api/orders/:orderNo (无子路由, GET/POST)
  const m2 = pathname.match(/^\/api\/orders\/([^\/]+)$/);
  if (m2) {
    const o = db.orders[m2[1]];
    if (!o) return err(res, 404, 'ORDER_NOT_FOUND', '未找到订单，请核对订单号');
    return ok(res, { order: o });
  }



  if (pathname === '/api/invite-codes/verify') {
    const c = db.inviteCodes[String(b.code || '').trim().toUpperCase()];
    if (!c || c.usedAt) return err(res, 404, 'REDEEM_CODE_NOT_FOUND', '邀请码不存在或已使用');
    return ok(res, { valid: true, code: c.code });
  }





  /* ---------------- 后台 (X-Admin-Token) ---------------- */
  const token = req.headers['x-admin-token'];
  if (token && ['sdg-admin-dev', 'xmodel-admin'].includes(token)) {


    if (pathname === '/api/invite-codes/issue') {
      const count = Math.min(Number(b.count) || 0, 50);
      if (count <= 0) return err(res, 400, 'INVALID_INPUT', '签发数量须为 1-50');
      const codes = [];
      for (let i = 0; i < count; i++) {
        const code = 'INV-' + crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
        db.inviteCodes[code] = { code, usedAt: null };
        codes.push(code);
      }
      persist();
      return ok(res, { codes, count });
    }
    if (pathname === '/api/invite-codes/list')
      return ok(res, { codes: Object.values(db.inviteCodes).sort((a, b2) => (a.code < b2.code ? -1 : 1)) });
    if (pathname === '/api/admin/orders')
      return ok(res, { orders: Object.values(db.orders).sort((a, b2) => (a.createdAt < b2.createdAt ? 1 : -1)) });
    if (pathname === '/api/admin/stats') {
      const orders = Object.values(db.orders);
      return ok(res, {
        orders: orders.length,
        revenue: orders.filter((o) => o.status === 'paid' || o.status === 'delivered').reduce((s, o) => s + o.total, 0),
        inviteTotal: Object.keys(db.inviteCodes).length
      });
    }
  }
  return err(res, 404, 'NOT_FOUND', '接口不存在');
}

/* ---------------- 静态路由 ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json'
};
function serveStatic(req, res, pathname) {
  const p = path.normalize(pathname).replace(/^([.]{2}[/\\])+/g, '');
  let full = path.join(PUB, p);
  if (full !== PUB && !fs.existsSync(full)) {
    // 无扩展名 -> 尝试 clean URL <path>.html
    if (!path.extname(p)) { const t = full + '.html'; if (fs.existsSync(t) && fs.statSync(t).isFile()) full = t; }
  } else if (full !== PUB && fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    // 目录: 先找 <path>/index.html, 再找同名的 <path>.html
    const idx = path.join(full, 'index.html');
    if (fs.existsSync(idx) && fs.statSync(idx).isFile()) full = idx;
    else { const t = full + '.html'; if (fs.existsSync(t) && fs.statSync(t).isFile()) full = t; else full = path.join(full, '__nope__'); }
  }
  if (!full.startsWith(PUB) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    let buf;
    try { buf = fs.readFileSync(path.join(PUB, '404.html')); } catch { buf = Buffer.from('404 Not Found'); }
    res.writeHead(404, { 'Content-Type': MIME[path.extname(path.join(PUB, '404.html'))] || 'text/html; charset=utf-8' });
    return res.end(buf);
  }
  fs.readFile(full, (e, buf) => {
    if (e) { res.writeHead(500, { 'Content-Type': 'text/plain' }); return res.end('internal error'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(buf);
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers['x-site-host'] || 'localhost'));
  const pathname = url.pathname;
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    if (pathname.startsWith('/api/')) await api(req, res, pathname, url);
    else serveStatic(req, res, pathname);
  } catch (e) {
    err(res, 500, 'INTERNAL_ERROR', '服务内部错误');
  }
}).listen(PORT, () => console.log(`sdg site listening on http://localhost:${PORT}`));
