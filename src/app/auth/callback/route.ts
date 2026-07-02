import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'
    const error = requestUrl.searchParams.get('error')
    const error_description = requestUrl.searchParams.get('error_description')

    // Vercel gibi proxy arkasındaki sunucularda request.url localhost olabilir.
    // Orijinal domaine dönmek için forward headerlarına bakmamız şart.
    let origin = requestUrl.origin;
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    if (forwardedHost) {
        origin = `${forwardedProto}://${forwardedHost}`;
    }

    // Handle OAuth/Magic Link errors
    if (error) {
        console.error('OAuth error:', error, error_description)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Başarılı giriş sonrası yönlendir
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Code exchange error:', error)
            return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
        }
    }

    // No code, redirect to login
    return NextResponse.redirect(`${origin}/login?error=Giriş%20sırasında%20bir%20hata%20oluştu`)
}
