
export const getApiUrl = (path: string) => {
    // If it starts with http, it's already absolute
    if (path.startsWith('http')) return path;
    
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    if (typeof window === 'undefined') {
        return normalizedPath;
    }
    
    // Detect Capacitor environment
    const isCapacitor = (
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'file:' ||
        // @ts-ignore - Capacitor injects this global
        typeof (window as any).Capacitor !== 'undefined'
    );
    
    if (isCapacitor) {
        // For Mobile (Capacitor), we need the absolute domain where the API is hosted
        // Replace this with your actual Vercel deployment URL or configure NEXT_PUBLIC_API_URL
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://tarot-beige-pi.vercel.app';
        return `${baseUrl}${normalizedPath}`;
    }
    
    // In development or when running on the web, relative paths work
    return normalizedPath;
};
