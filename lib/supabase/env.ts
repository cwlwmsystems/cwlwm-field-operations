export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
export function useMockData() {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false" || !hasSupabaseConfig();
}
