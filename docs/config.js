// MTG Desktop Companion - Web Hosted Config
// 1) Set REST_SERVER to your deployed backend base URL (no trailing slash)
// 2) Set Supabase URL + ANON KEY from your Supabase project settings
// 3) BASE_PATH: for GitHub Pages project sites, set to '/<REPO_NAME>' (e.g. '/MtgDesktopCompanion')
//    For user/org sites (username.github.io), leave as ''.
window.MTGDC_CONFIG = {
  BASE_PATH: '',

  // Backend REST server (SparkJava/JSON server) base URL
  REST_SERVER: 'http://localhost:8080',

  // Supabase Auth (optional but recommended)
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',

  // Gate pages behind login
  AUTH_REQUIRED: true
};
