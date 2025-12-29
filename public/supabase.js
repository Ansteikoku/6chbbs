// supabase.js（公開用・匿名キー）
const SUPABASE_URL = "<環境変数 SUPABASE_URL>";
const SUPABASE_ANON_KEY = "<環境変数 SUPABASE_ANON_KEY>";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
