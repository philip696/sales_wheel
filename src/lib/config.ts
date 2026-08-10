const supabaseUrl = 'https://cwvvjlnufkvcminnoxfo.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dnZqbG51Zmt2Y21pbm5veGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDUzNDUsImV4cCI6MjEwMTkyMTM0NX0.ld5F5UhjAQs7HSe_MZ7GzcOYoju6VtiGNC_PW5ZF4fU';

export const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  },
  isSupabaseConfigured: true,
} as const;
