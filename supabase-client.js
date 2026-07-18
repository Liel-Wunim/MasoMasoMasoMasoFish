(function () {
  'use strict';

  const config = window.MASOFISH_SUPABASE_CONFIG || {};
  const url = String(config.url || '').trim();
  const key = String(config.publishableKey || '').trim();

  const placeholderUrl =
    !url ||
    url.includes('YOUR-PROJECT') ||
    !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url);

  const placeholderKey =
    !key ||
    key.includes('YOUR-PUBLISHABLE') ||
    key.includes('YOUR-ANON');

  const configured = Boolean(window.supabase?.createClient) && !placeholderUrl && !placeholderKey;

  window.MASOFISH_AUTH = {
    configured,
    config,
    client: null,
    prototypeMode: localStorage.getItem('masofishPrototypeMode') === '1'
  };

  if (!configured) return;

  window.MASOFISH_AUTH.client = window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // Convenient alias for page scripts.
  window.masofishSupabase = window.MASOFISH_AUTH.client;
})();