import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pigppqifilybrxmnfrum.supabase.co";

const supabaseKey = "sb_publishable_emxklh1htdwD61H6hnTn1g_NkrJjjw0";

export const supabase = createClient(supabaseUrl, supabaseKey);