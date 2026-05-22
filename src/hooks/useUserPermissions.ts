'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export interface UserPermissions {
  loaded: boolean;
  role: string;
  team: string;
  department: string;
  isAdmin: boolean;
  isDesigner: boolean;
  canEditPlans: boolean;
  canDeletePlans: boolean;
  canAccessEditorWithoutTemplate: boolean;
}

const DEFAULT: UserPermissions = {
  loaded: false,
  role: '',
  team: '',
  department: '',
  isAdmin: false,
  isDesigner: false,
  canEditPlans: false,
  canDeletePlans: false,
  canAccessEditorWithoutTemplate: false,
};

export function useUserPermissions(): UserPermissions {
  const [perms, setPerms] = useState<UserPermissions>(DEFAULT);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setPerms({ ...DEFAULT, loaded: true }); return; }
      supabase
        .from('users')
        .select('role, team, department')
        .eq('id', data.user.id)
        .single()
        .then(({ data: u }) => {
          const role = u?.role ?? '직원';
          const team = u?.team ?? '';
          const department = u?.department ?? '';
          const isAdmin = role === '관리자';
          const isDesigner = department === '디자인부';
          setPerms({
            loaded: true,
            role, team, department,
            isAdmin, isDesigner,
            canEditPlans: isAdmin || !isDesigner,
            canDeletePlans: isAdmin,
            canAccessEditorWithoutTemplate: isAdmin || isDesigner,
          });
        });
    });
  }, []);

  return perms;
}
