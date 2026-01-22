
(function(){
  function cfg(){ return (window.MTGDC_CONFIG || {});
  window.__mtgdcSupabase = window.mtgdcSupabase;
 }
  if(!window.supabase || !window.supabase.createClient) return;
  if (window.mtgdcSupabase || window.__mtgdcSupabase) { window.mtgdcSupabase = window.mtgdcSupabase || window.__mtgdcSupabase; return; }
  if (!cfg().SUPABASE_URL || !cfg().SUPABASE_ANON_KEY) return;

  window.mtgdcSupabase = window.mtgdcSupabase || window.__mtgdcSupabase || window.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.__mtgdcSupabase = window.mtgdcSupabase;

})();
