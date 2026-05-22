import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  const email = data.user.email ?? '';
  if (!email.endsWith('@daplan.com')) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=unauthorized`);
  }

  await supabase.from('users').upsert(
    {
      id: data.user.id,
      email,
      name: data.user.user_metadata?.full_name ?? '',
      role: '직원',
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  return NextResponse.redirect(`${origin}/home`);
}
