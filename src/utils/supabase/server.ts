import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    // Vercel ortam değişkenleri sorununu KESİN çözmek için değerleri doğrudan yedekliyoruz
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tepjqfqjklvqfcrxmqsc.supabase.co';
    const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcGpxZnFqa2x2cWZjcnhtcXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDgyMDAsImV4cCI6MjA4Nzg0NjA1NX0.ltdgf6vfsxbmEmkO7OCO-eOaJtq3omxVcFz0Wl05MV0';

    let supabaseUrl = rawUrl.replace(/['"]/g, '').trim();
    let supabaseKey = rawKey.replace(/['"]/g, '').trim();

    // Eğer eski placeholder koda gömülü kaldıysa onu da gerçek değerle ez
    if (supabaseUrl.includes('placeholder')) {
        supabaseUrl = 'https://tepjqfqjklvqfcrxmqsc.supabase.co';
        supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcGpxZnFqa2x2cWZjcnhtcXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDgyMDAsImV4cCI6MjA4Nzg0NjA1NX0.ltdgf6vfsxbmEmkO7OCO-eOaJtq3omxVcFz0Wl05MV0';
    }

    const cookieStore = await cookies()


    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                    }
                },
            },
        }
    )
}
