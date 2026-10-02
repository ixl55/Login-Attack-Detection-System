# Login Attack Detection System (LADS)

**[العربية](#بالعربية) | [English](#english)**

A service that receives login attempts from your applications over a REST API, analyses each one as it arrives, and raises alerts for:

| Attack | Rule (defaults, configurable) | Severity |
|---|---|---|
| **Brute force (account)** | ≥ 5 failed logins for one username within 5 min | high → **critical** if a success follows |
| **Brute force (IP)** | ≥ 10 failed logins from one IP within 5 min (against < 5 accounts) | high |
| **Password spraying / credential stuffing** | one IP tries ≥ 5 different accounts within 10 min with ≥ 80 % failures | high → **critical** if any account got in |
| **Impossible travel** | two successful logins for one user > 500 km apart needing > 900 km/h | critical |
| **Suspicious IP** | IP or CIDR listed in `data/ip_blocklist.txt` | medium → high on success |

An ongoing attack keeps updating one open alert (count, last seen, severity can only escalate) instead of flooding you with duplicates. A bilingual (Arabic/English) dark SOC‑style dashboard is served at `/dashboard`.

---

## English

### Quick start

```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload            # http://localhost:8000  (API docs: /docs)

# Dashboard (one-time build; FastAPI then serves it at /dashboard)
cd frontend && npm install && npm run build && cd ..

# Generate 24h of normal traffic plus one scenario per attack type
python scripts/simulate_attacks.py
python scripts/simulate_attacks.py --live 120   # keep streaming traffic for 2 minutes
```

Open http://localhost:8000/dashboard.

Or with Docker: `docker build -t lads . && docker run -p 8000:8000 -v lads-data:/data lads`

### Sending events

```bash
curl -X POST http://localhost:8000/api/events \
  -H 'Content-Type: application/json' -H 'X-API-Key: <key>' \
  -d '{"username": "alice", "ip_address": "203.0.113.7", "success": false,
       "user_agent": "Mozilla/5.0 …", "source_app": "web-portal",
       "country": "Saudi Arabia", "city": "Riyadh", "latitude": 24.71, "longitude": 46.67}'
```

The response contains the stored event **and the alerts it raised or updated**, so the calling app can react immediately (e.g. require a CAPTCHA or MFA). `timestamp` is optional (defaults to now, UTC); location fields are optional — without them, impossible travel needs a GeoLite2 database (see configuration). `POST /api/events/batch` accepts up to 5,000 events and processes them in chronological order.

### API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/events` · `/api/events/batch` | Ingest login attempts (requires `X-API-Key` when `LADS_API_KEY` is set) |
| GET | `/api/events?username=&ip=&success=&from=&to=&limit=&offset=` | Search events |
| GET | `/api/alerts?type=&severity=&status=&username=&ip=&limit=&offset=` | List alerts |
| GET / PATCH | `/api/alerts/{id}` | Read an alert / set `status` to `open`, `acknowledged` or `resolved` |
| GET | `/api/stats?range=1h\|24h\|7d` | KPIs, timeline, top IPs/accounts |
| GET | `/api/investigate/user/{username}` · `/api/investigate/ip/{ip}` | Full history, risk score, locations, related alerts |

Interactive docs: `/docs`.

### Configuration

Environment variables (or a `.env` file), all prefixed `LADS_`:

| Variable | Default | |
|---|---|---|
| `LADS_DATABASE_URL` | `sqlite:///./lads.db` | any SQLAlchemy URL |
| `LADS_API_KEY` | *(unset → no auth, dev only)* | required by ingestion endpoints when set |
| `LADS_BLOCKLIST_PATH` | `data/ip_blocklist.txt` | reloaded automatically when it changes |
| `LADS_GEOIP_DB_PATH` | *(unset)* | MaxMind GeoLite2‑City `.mmdb`; also `pip install geoip2` |
| `LADS_BRUTE_FORCE_USER_THRESHOLD`, `…_IP_THRESHOLD`, `…_WINDOW_MINUTES` | 5, 10, 5 | |
| `LADS_SPRAYING_DISTINCT_USERS_THRESHOLD`, `…_FAILURE_RATIO`, `…_WINDOW_MINUTES` | 5, 0.8, 10 | |
| `LADS_IMPOSSIBLE_TRAVEL_SPEED_KMH`, `…_MIN_DISTANCE_KM`, `…_LOOKBACK_HOURS` | 900, 500, 24 | |
| `LADS_ALERT_DEDUP_WINDOW_MINUTES` | 30 | |

> **Security note:** only the ingestion endpoints are protected by the API key. The dashboard and read/alert‑management endpoints have no authentication of their own — put them behind your SSO / reverse‑proxy auth or a private network before exposing them.

### Dashboard

* **Overview** – KPIs with change vs. the previous period, attempts timeline, alerts by type (click to filter), live alerts feed with acknowledge/resolve, top attacking IPs and most targeted accounts.
* **Event log** – filter by user, IP, result and time range; filters live in the URL so views can be shared.
* **Investigation** – one page per user or IP: risk score, activity, login locations with impossible‑travel hops highlighted, IPs used / accounts tried, related alerts and events.
* Alert details open in a side drawer (`?alert=ID`, shareable) with a per‑type explanation.
* Arabic (RTL, default) / English, dark (default) / light, responsive down to phone width, refreshes every 5 s.

Frontend development with hot reload: `cd frontend && npm run dev` (proxies `/api` to `localhost:8000`) and open http://localhost:5173/dashboard/.

### Development

```bash
pytest                    # backend tests (detectors + API)
cd frontend && npm run lint && npm run build
```

### Project layout

```
app/
  main.py            FastAPI app
  config.py          settings (LADS_* env vars)
  models.py          LoginEvent, Alert
  detection/         one module per detector + engine (dedup/upsert)
  api/               events, alerts, stats, investigate
  frontend.py        serves frontend/dist under /dashboard (SPA fallback)
frontend/            React + TypeScript + Vite + Tailwind dashboard
data/ip_blocklist.txt
scripts/simulate_attacks.py
tests/
```

---

## بالعربية

نظام يستقبل محاولات تسجيل الدخول من تطبيقاتك عبر REST API، ويحلل كل محاولة فور وصولها، ويُطلق تنبيهات عند اكتشاف:

* **تخمين كلمة المرور (Brute Force):** محاولات فاشلة كثيرة لنفس الحساب أو من نفس الـ IP — وتصبح الخطورة **حرجة** إذا تبعها دخول ناجح.
* **رشّ كلمات المرور / Credential Stuffing:** عنوان IP واحد يجرّب حسابات كثيرة مختلفة بنسبة فشل عالية.
* **السفر المستحيل:** دخولان ناجحان لنفس المستخدم من موقعين متباعدين بسرعة غير ممكنة.
* **IP مشبوه:** عنوان أو نطاق CIDR موجود في القائمة السوداء `data/ip_blocklist.txt`.

الهجوم المستمر يحدّث تنبيهاً واحداً مفتوحاً بدلاً من إنشاء تنبيهات مكررة.

### التشغيل السريع

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload

cd frontend && npm install && npm run build && cd ..

python scripts/simulate_attacks.py            # بيانات تجريبية + سيناريو لكل هجوم
python scripts/simulate_attacks.py --live 120 # بث حركة مباشرة لمدة دقيقتين
```

ثم افتح لوحة التحكم: http://localhost:8000/dashboard — وتوثيق الـ API على ‎/docs‎.

### إرسال الأحداث

أرسل كل محاولة دخول إلى `POST /api/events` (مع الترويسة `X-API-Key` إذا ضبطت `LADS_API_KEY`). الاستجابة تتضمن **التنبيهات الناتجة** عن هذه المحاولة، فيستطيع تطبيقك التصرف فوراً (مثل طلب CAPTCHA أو تحقق ثنائي).

### لوحة التحكم

* **نظرة عامة:** مؤشرات رئيسية مع المقارنة بالفترة السابقة، رسم المحاولات عبر الزمن، التنبيهات حسب النوع (انقر للفلترة)، آخر التنبيهات مع أزرار الاستلام والحل، أعلى عناوين IP مهاجِمة وأكثر الحسابات استهدافاً.
* **سجل الأحداث:** فلترة حسب المستخدم والـ IP والنتيجة والوقت، والفلاتر محفوظة في الرابط لمشاركتها.
* **التحقيق:** صفحة لكل مستخدم أو IP تعرض درجة الخطورة والنشاط ومواقع الدخول (مع تمييز قفزات السفر المستحيل) والتنبيهات والأحداث المرتبطة.
* واجهة عربية (من اليمين لليسار) وإنجليزية، وضع داكن وفاتح، ومتجاوبة مع الجوال، وتتحدث تلقائياً كل 5 ثوانٍ.

### الإعدادات

جميع العتبات ونوافذ الوقت قابلة للتعديل عبر متغيرات البيئة التي تبدأ بـ `LADS_` (انظر الجدول في القسم الإنجليزي).

> **ملاحظة أمنية:** مفتاح الـ API يحمي نقاط استقبال الأحداث فقط. لوحة التحكم ونقاط القراءة وإدارة التنبيهات لا تملك مصادقة خاصة بها، لذا ضعها خلف نظام دخول موحّد (SSO) أو reverse proxy أو شبكة داخلية قبل إتاحتها.

### الاختبارات

```bash
pytest
cd frontend && npm run lint && npm run build
```
