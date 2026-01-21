
(function(){
  var cfg = window.MTGDC_CONFIG || {};
  var url = (cfg.REST_SERVER || "http://localhost:8080");
  if (url.endsWith("/")) url = url.slice(0,-1);
  window.restserver = url;
  window.localserver = url;
  // legacy global vars (some pages expect `restserver` as a plain var)
  try{ restserver = url; }catch(e){ window.restserver = url; }
  try{ localserver = url; }catch(e){ window.localserver = url; }
})();
