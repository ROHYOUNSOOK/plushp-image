'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { ScheduleRow } from '@/lib/supabase';

export function useMyTasks() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setLoading(false); return; }
      supabase
        .from('plus_schedule')
        .select('*')
        .eq('assigned_to', data.user.id)
        .order('date', { ascending: false })
        .then(({ data: taskData }) => {
          setRows(taskData ?? []);
          setLoading(false);
        });
    });
  }, []);

  const markCompleted = async (id: string) => {
    await supabase.from('plus_schedule').update({ completed: true }).eq('id', id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, completed: true } : r));
  };

  return { rows, loading, markCompleted };
}
