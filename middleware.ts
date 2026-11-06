import {NextRequest,NextResponse} from 'next/server';
export function middleware(request:NextRequest){
 const path=request.nextUrl.pathname;
 const redirects:Record<string,string>={'/index.html':'/','/community.html':'/community','/updates.html':'/updates','/contribute.html':'/contribute'};
 if(redirects[path])return NextResponse.redirect(new URL(redirects[path]+request.nextUrl.search,request.url),308);
 const response=NextResponse.next();
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 if(path.startsWith('/admin')||path.startsWith('/api')||request.nextUrl.searchParams.has('preview'))response.headers.set('Cache-Control','private, no-store');
 return response;
}
