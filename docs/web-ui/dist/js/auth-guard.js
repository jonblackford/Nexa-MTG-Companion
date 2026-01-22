
(function(){
  function cfg(){ return (window.MTGDC_CONFIG || {}); }
  function basePath(){
    const b = (cfg().BASE_PATH || '').trim();
    if (!b) return '';
    return b.startsWith('/') ? b : ('/' + b);
  }
  function isAuthPage(){
    return /\/auth\/(login|register|reset|update-password)\.html$/i.test(window.location.pathname);
  }
  function showBlocking(msg){
    try{
      let o = document.getElementById('mtgdc-auth-overlay');
      if(!o){
        o = document.createElement('div');
        o.id='mtgdc-auth-overlay';
        o.className='mtgdc-overlay show';
        o.innerHTML = '<div class="mtgdc-glass mtgdc-card"><h1 class="mtgdc-h1">Loading…</h1><p class="mtgdc-help" id="mtgdc-auth-msg"></p></div>';
        document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(o); });
        if(document.body) document.body.appendChild(o);
      } else {
        o.classList.add('show');
      }
      const m = o.querySelector('#mtgdc-auth-msg');
      if(m) m.textContent = msg || '';
    }catch(e){}
  }

  async function ensureSupabase(){
    if (!cfg().SUPABASE_URL || !cfg().SUPABASE_ANON_KEY) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    if (window.mtgdcSupabase) { window.__mtgdcSupabase = window.mtgdcSupabase; return window.mtgdcSupabase; }
    if (!window.__mtgdcSupabase){
      window.__mtgdcSupabase = window.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return window.__mtgdcSupabase;
  }

  async function boot(){
  const c = cfg();
  if (!c.AUTH_REQUIRED) return;

  // allow auth pages even if logged out
  if (isAuthPage()) return;

  const sb = await ensureSupabase();
  if(!sb) return;

  showBlocking('Checking your session…');
      // Safety: never let overlay get stuck
      setTimeout(() => { const o=document.getElementById('mtgdc-auth-overlay'); if(o) o.classList.remove('show'); }, 4000);
  try{
    const { data, error } = await sb.auth.getSession();
    if (error || !data || !data.session){
      const redirect = encodeURIComponent(window.location.href);
      window.location.href = basePath() + '/auth/login.html?redirect=' + redirect;
      return;
    }

    // Add small user/logout UI (moved to bottom-right so it doesn't block the navbar search)
    try{
      const email = data.session.user?.email || 'Signed in';
      if(!document.getElementById('mtgdc-topbar')){
        const bar = document.createElement('div');
        bar.id='mtgdc-topbar';
        bar.className='mtgdc-glass mtgdc-topbar';
        bar.style.position='fixed';
        bar.style.bottom='12px';
        bar.style.right='12px';
        bar.style.top='auto';
        bar.style.zIndex='9999';
        bar.style.display='flex';
        bar.style.gap='8px';
        bar.style.alignItems='center';
        bar.innerHTML = `
          <span class="mtgdc-pill">👤 <span style="max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${email}</span></span>
          <button class="mtgdc-btn" id="mtgdc-logout-btn" type="button">Log out</button>
        `;
        document.addEventListener('DOMContentLoaded', ()=>{ document.body.appendChild(bar); });
        if(document.body) document.body.appendChild(bar);

        const btn = bar.querySelector('#mtgdc-logout-btn');
        btn?.addEventListener('click', async ()=>{
          try{ await sb.auth.signOut(); }catch(e){}
          window.location.href = basePath() + '/auth/login.html';
        });
      }
    }catch(e){}
  } finally {
    // Always hide the blocking overlay on success path; if redirect happens, page unloads anyway.
    const overlay = document.getElementById('mtgdc-auth-overlay');
    if(overlay) overlay.classList.remove('show');
  }
}

  // run as early as possible
  boot();
})();