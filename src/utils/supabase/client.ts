import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (client) return client;

    // Vercel'den gelen değerleri al, tırnakları ve boşlukları temizle
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tepjqfqjklvqfcrxmqsc.supabase.co';
    const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcGpxZnFqa2x2cWZjcnhtcXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDgyMDAsImV4cCI6MjA4ODk4NDIwMH0.ltdgf6vfsxbmEmkO7OCO-eOaJtq3omxVcFz0Wl05MV0';

    const supabaseUrl = rawUrl.replace(/['"]/g, '').trim();
    const supabaseKey = rawKey.replace(/['"]/g, '').trim();

    client = createBrowserClient(supabaseUrl, supabaseKey);
    return client;
}


