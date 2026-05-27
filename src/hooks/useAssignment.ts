'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { ScheduleRow } from '@/lib/supabase';

export interface Designer {
  id: string;
  name: string;
  team: string;
}

export function useAssignment() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('plus_schedule').select('*').order('date', { ascending: false }),
      supabase.from('users').select('id, name, team').eq('department', '디자인부').order('name'),
    ]).then(([schedRes, designerRes]) => {
      setRows(schedRes.data ?? []);
      setDesigners(designerRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const assign = async (scheduleId: string, designerId: string | null) => {
    await supabase.from('plus_schedule').update({ assigned_to: designerId }).eq('id', scheduleId);
    setRows(prev => prev.map(r => r.id === scheduleId ? { ...r, assigned_to: designerId } : r));
  };

  return { rows, designers, loading, assign };
}
