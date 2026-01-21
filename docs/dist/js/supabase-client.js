
(function(){
  function cfg(){ return (window.MTGDC_CONFIG || {}); }
  if(!window.supabase || !window.supabase.createClient) return;
  if (!cfg().SUPABASE_URL || !cfg().SUPABASE_ANON_KEY) return;

  window.mtgdcSupabase = window.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
