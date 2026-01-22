
(function(){

function cleanupLeakedText(){
  // If any raw JS helper text (like "function normalizeCards(payload){...}") was accidentally injected
  // into the DOM, remove it so it doesn't appear at the top of the page.
  try{
    const needle = "function normalizeCards(payload)";
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const toRemove = [];
    while (walker.nextNode()){
      const n = walker.currentNode;
      const v = (n.nodeValue || "").trim();
      if (!v) continue;
      if (v.startsWith(needle) || v.includes(needle)){
        // avoid removing legitimate code blocks inside <script>/<style>/<pre>/<code>
        const p = n.parentElement;
        const tag = (p && p.tagName) ? p.tagName.toLowerCase() : "";
        if (tag && ["script","style","pre","code","textarea"].includes(tag)) continue;
        toRemove.push(n);
      }
    }
    toRemove.forEach(n => { try{ n.parentNode && n.parentNode.removeChild(n); }catch(e){} });
  }catch(e){}
}


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
    if (!window.__mtgdcSupabase){
      window.__mtgdcSupabase = window.supabase.createClient(cfg().SUPABASE_URL, cfg().SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return window.__mtgdcSupabase;
  }

  async function boot(){
      // Clean any leaked helper text from the DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cleanupLeakedText);
      } else {
        cleanupLeakedText();
      }

      const c = cfg();
    if (!c.AUTH_REQUIRED) return;

    // allow auth pages even if logged out
    if (isAuthPage()) return;

    // If Supabase isn't configured, don't hard-block (lets self-hosters keep using it)
    const sb = await ensureSupabase();
    if(!sb) return;

    showBlocking('Checking your session…');
    const { data, error } = await sb.auth.getSession();
    if (error || !data || !data.session){
      const redirect = encodeURIComponent(window.location.href);
      window.location.href = basePath() + '/auth/login.html?redirect=' + redirect;
      return;
    }

    // Add small top-right user/logout UI
    try{
      const email = data.session.user?.email || 'Signed in';
      if(!document.getElementById('mtgdc-topbar')){
        const bar = document.createElement('div');
        bar.id='mtgdc-topbar';
        bar.className='mtgdc-glass mtgdc-topbar';
        bar.innerHTML = `
          <span class="mtgdc-pill">👤 <span style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${email}</span></span>
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
      const overlay = document.getElementById('mtgdc-auth-overlay');
      if(overlay) overlay.classList.remove('show');
    }catch(e){}
  }

  // run as early as possible
  boot();
})();
