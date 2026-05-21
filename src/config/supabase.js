import { createClient } from '@supabase/supabase-js';

// Loads environment variables defined in the root .env file automatically in Expo SDK 49+
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Prevents warning logs in React Native
  },
});
