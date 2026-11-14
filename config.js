
const SUPABASE_URL = "https://uqiirrsjfjziaxxnzrfi.supabase.co/rest/v1/";

const SUPABASE_ANON_KEY = "sb_publishable_KzeuMOTPm0zwdASdg5H1dw_Zedu8ol3";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
