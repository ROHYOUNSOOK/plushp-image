'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const MENUS = [
  {
    id: 'plan',
    label: '기획안',
    icon: '📋',
    href: '/plan',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    labelColor: 'text-blue-700',
  },
  {
    id: 'editor',
    label: '디자인 편집기',
    icon: '🎨',
    href: '/editor',
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    labelColor: 'text-green-700',
  },
];

const ADMIN_MENUS = [
  {
    id: 'users',
    label: '직원 관리',
    icon: '👥',
    href: '/admin/users',
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    labelColor: 'text-orange-700',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDesigner, setIsDesigner] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from('users')
        .select('role, department')
        .eq('id', data.user.id)
        .single()
        .then(({ data: userData }) => {
          if (userData?.role === '관리자') setIsAdmin(true);
          if (userData?.department === '디자인부') setIsDesigner(true);
        });
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-10 py-12 w-full max-w-md flex flex-col gap-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">플러스정형외과 편집기</h1>
            <p className="text-sm text-gray-400 mt-1">메뉴를 선택하세요.</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
          >
            로그아웃
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">바로가기</p>
            <div className="grid grid-cols-2 gap-4">
              {MENUS.map(menu => (
                <button
                  key={menu.id}
                  onClick={() => router.push(menu.href)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-8 transition-colors ${menu.color}`}
                >
                  <span className="text-3xl">{menu.icon}</span>
                  <span className={`text-sm font-semibold ${menu.labelColor}`}>{menu.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isDesigner && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">디자이너</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/my-tasks')}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border py-8 transition-colors bg-purple-50 hover:bg-purple-100 border-purple-200"
                >
                  <span className="text-3xl">✅</span>
                  <span className="text-sm font-semibold text-purple-700">내 업무</span>
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">관리자</p>
              <div className="grid grid-cols-2 gap-4">
                {ADMIN_MENUS.map(menu => (
                  <button
                    key={menu.id}
                    onClick={() => router.push(menu.href)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-8 transition-colors ${menu.color}`}
                  >
                    <span className="text-3xl">{menu.icon}</span>
                    <span className={`text-sm font-semibold ${menu.labelColor}`}>{menu.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
