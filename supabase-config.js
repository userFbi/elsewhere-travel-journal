/* Supabase connection. The anon key is SAFE to be public (row-level security protects your data).
   Find both values in Supabase > Project Settings > API. */
window.SUPABASE_URL = 'https://qqzffirzmdwewquedepy.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_k1CUkV2EflLwsZ6HANXy0g_JW3p0XjZ';

/* Used by index.html and gallery.html: loads the published site data, then starts the page. */
window.loadSiteData = function (cb) {
  var U = window.SUPABASE_URL, K = window.SUPABASE_ANON_KEY;
  if (!U || !K || /YOUR-/.test(U + K)) { cb(); return; }

  var cached = null;
  try { cached = JSON.parse(localStorage.getItem('site_data_cache') || 'null'); } catch (e) {}

  var started = false;
  function start(d) { if (started) return; started = true; if (d) window.SITE_DATA = d; cb(); }

  // Returning visitor: render instantly from cache
  if (cached && Object.keys(cached).length) start(cached);

  // Always refresh the cache in the background (applies on the next visit)
  var t = setTimeout(function () { start(cached); }, 1500); // first-time visitors: shorter wait
  fetch(U + '/rest/v1/site_data?id=eq.1&select=data', { headers: { apikey: K, Authorization: 'Bearer ' + K } })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (rows) {
      clearTimeout(t);
      var d = rows[0] && rows[0].data;
      if (d && Object.keys(d).length) {
        try { localStorage.setItem('site_data_cache', JSON.stringify(d)); } catch (e) {}
        start(d);               // first visit: use fresh data
      } else start(null);
    })
    .catch(function () { clearTimeout(t); start(cached); });
};