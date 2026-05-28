'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { ScheduleRow } from '@/lib/supabase';
import { useScheduleApplication } from '@/hooks/useScheduleApplication';
import type { DoctorInfo } from '@/hooks/useScheduleData';

export function useMyTasks() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { navigateToEditor: doNavigate, navigating } = useScheduleApplication();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setLoading(false); return; }
      Promise.all([
        supabase.from('plus_schedule').select('*').eq('assigned_to', data.user.id).order('date', { ascending: false }),
        supabase.from('plus_doctors').select('id, doctor_name, specialty, department'),
      ]).then(([taskRes, doctorRes]) => {
        setRows(taskRes.data ?? []);
        setAllDoctors(doctorRes.data ?? []);
        setLoading(false);
      });
    });
  }, []);

  const markCompleted = async (id: string) => {
    await supabase.from('plus_schedule').update({ completed: true }).eq('id', id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, completed: true } : r));
  };

  const navigateToEditor = (row: ScheduleRow) => doNavigate(row, allDoctors);

  return { rows, loading, markCompleted, navigateToEditor, navigating };
}
