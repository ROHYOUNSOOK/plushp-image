'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  department: string;
  team: string;
  role: string;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    supabase
      .from('users')
      .select('id, email, name, department, team, role')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setUsers(data ?? []);
        setLoading(false);
      });
  }, []);

  const updateUser = async (id: string, fields: Partial<UserRow>) => {
    await supabase.from('users').update(fields).eq('id', id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...fields } : u));
  };

  return { users, loading, updateUser };
}
