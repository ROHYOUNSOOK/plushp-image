'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { ScheduleRow } from '@/lib/supabase';

export function useMarketerTasks() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const uid = data.user.id;
      setUserId(uid);
      supabase
        .from('plus_schedule')
        .select('*')
        .eq('created_by', uid)
        .order('created_at', { ascending: false })
        .then(({ data: rows }) => {
          setRows(rows ?? []);
          setLoading(false);
        });
    });
  }, []);

  const confirmRow = async (id: string) => {
    await supabase.from('plus_schedule').update({ confirmed: true }).eq('id', id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, confirmed: true } : r));
  };

  return { rows, loading, userId, confirmRow };
}
