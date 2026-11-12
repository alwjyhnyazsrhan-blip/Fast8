(function () {
  // 🔥 رابط قاعدة بياناتك جاهز
  const FIREBASE_DB_URL = 'https://appprotector-79e9c-default-rtdb.firebaseio.com';

  const ADMIN_PASSWORD = 'VIP2026!';
  const ADMIN_AUTH_KEY = 'vip_admin_auth_v1';
  const ADMIN_AUTH_TTL_MS = 30 * 60 * 1000;

  // 🛡️ نظام تخزين آمن لتجاوز حظر التطبيقات وحفظ حالة الدخول (تم التعديل لـ localStorage للبقاء مسجلاً)
  let memStorage = {};
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch(e) { memStorage[k] = v; } }
  function safeGet(k) { try { return localStorage.getItem(k) || memStorage[k]; } catch(e) { return memStorage[k]; } }
  function safeRemove(k) { try { localStorage.removeItem(k); } catch(e) { delete memStorage[k]; } }

  function nowIso() { return new Date().toISOString(); }
  function uid() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

  function normalizeCode(item) {
    const c = Object.assign({}, item || {});
    c.id = c.id || uid();
    c.code = (c.code || '').toUpperCase();
    c.status = c.status || 'new';
    c.max_uses = Number(c.max_uses || 1);
    c.used_count = Number(c.used_count || 0);
    c.note = c.note || '';
    c.used_by = c.used_by || '';
    c.expiry_date = c.expiry_date || null;
    c.created_at = c.created_at || nowIso();
    return c;
  }

  function makeResponse(payload, status) {
    const code = status == null ? 200 : status;
    return Promise.resolve({ ok: code >= 200 && code < 300, status: code, json: async () => payload });
  }

  function setAdminAuth() { safeSet(ADMIN_AUTH_KEY, String(Date.now() + ADMIN_AUTH_TTL_MS)); }
  function clearAdminAuth() { safeRemove(ADMIN_AUTH_KEY); }
  function hasAdminAuth() {
    const expiresAt = Number(safeGet(ADMIN_AUTH_KEY) || 0);
    if (!expiresAt || Date.now() > expiresAt) { clearAdminAuth(); return false; }
    return true;
  }

  function requestAdminAccess() {
    if (hasAdminAuth()) return true;
    const value = window.prompt('🔒 أدخل كلمة سر المشرف لفتح لوحة التحكم');
    if (value === null) return false;
    if (String(value).trim() === ADMIN_PASSWORD) { setAdminAuth(); return true; }
    window.alert('❌ كلمة سر المشرف غير صحيحة');
    return false;
  }

  const realFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = async function (input, init) {
    const req = init || {};
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = String(req.method || 'GET').toUpperCase();

    const cleanBaseUrl = FIREBASE_DB_URL.endsWith('/') ? FIREBASE_DB_URL.slice(0, -1) : FIREBASE_DB_URL;

    if (/^tables\/activation_codes(?:\?|$|\/)/.test(url)) {
      const parts = url.split('?')[0].split('/').filter(Boolean);
      const id = parts.length >= 3 ? parts[2] : null;

      try {
        let response;
        if (method === 'GET') {
          response = await realFetch(`${cleanBaseUrl}/activation_codes.json`);
          if(response.ok) {
            const data = await response.json();
            const arr = data ? Object.values(data) : [];
            arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return makeResponse({ data: arr }, 200);
          }
        } else if (method === 'POST') {
          const body = req.body ? JSON.parse(req.body) : {};
          if (Array.isArray(body)) {
            const updates = {}; const created = body.map(normalizeCode);
            created.forEach(c => { updates[c.id] = c; });
            response = await realFetch(`${cleanBaseUrl}/activation_codes.json`, { method: 'PATCH', body: JSON.stringify(updates) });
            if(response.ok) return makeResponse({ data: created }, 200);
          } else {
            const created = normalizeCode(body);
            response = await realFetch(`${cleanBaseUrl}/activation_codes/${created.id}.json`, { method: 'PUT', body: JSON.stringify(created) });
            if(response.ok) return makeResponse({ data: created }, 200);
          }
        } else if (method === 'PATCH' && id) {
          const body = req.body ? JSON.parse(req.body) : {};
          
          // تحديث الحالة وتوجيه التطبيق عند النجاح
          if (body.status === 'used' || (body.used_count !== undefined && body.used_count > 0)) {
              setTimeout(function() {
                  window.dispatchEvent(new CustomEvent('vip_unlocked', { detail: body }));
                  try {
                      if (window.onVipUnlocked) window.onVipUnlocked(body);
                  } catch (e) {}
                  try {
                      window.location.href = "vip://unlock";
                  } catch (e) {
                      console.log("VIP unlock redirect handled");
                  }
              }, 1500);
          }

          response = await realFetch(`${cleanBaseUrl}/activation_codes/${id}.json`, { method: 'PATCH', body: JSON.stringify(body) });
          if(response.ok) return makeResponse({ data: body }, 200);
        } else if (method === 'DELETE' && id) {
          response = await realFetch(`${cleanBaseUrl}/activation_codes/${id}.json`, { method: 'DELETE' });
          if(response.ok) return makeResponse(null, 204);
        }

        if (response && !response.ok) {
           throw new Error("Firebase Rules Denied");
        }

      } catch (error) {
        console.error("Firebase Error:", error);
        return makeResponse({ error: 'Database connection failed' }, 500);
      }
      return makeResponse({ error: 'Unsupported method' }, 400);
    }
    if (realFetch) return realFetch(input, init);
    throw new Error('Unsupported request: ' + url);
  };

  window.addEventListener('load', function () {
    const currentPage = (window.location.pathname || '').split('/').pop();
    if (currentPage === 'admin.html' && !hasAdminAuth()) {
        document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:50px;font-family:Cairo;'>تم قفل اللوحة. يرجى إعادة التحديث وإدخال كلمة السر.</h2>";
        requestAdminAccess();
        if(hasAdminAuth()) location.reload();
        return;
    }
  });
})();
