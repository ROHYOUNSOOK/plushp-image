'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { ScheduleRow } from '@/lib/supabase';
import { useScheduleApplication } from '@/hooks/useScheduleApplication';
import type { DoctorInfo } from '@/hooks/useScheduleData';
import { syncSheet } from '@/lib/sheetSync';

export function useMarketerTasks() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [designerMap, setDesignerMap] = useState<Record<string, string>>({});
  const [allDoctors, setAllDoctors] = useState<DoctorInfo[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { navigateToEditor: doNavigate, navigating } = useScheduleApplication();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const uid = data.user.id;
      setUserId(uid);
      Promise.all([
        supabase.from('plus_schedule').select('*').eq('created_by', uid).order('created_at', { ascending: false }),
        supabase.from('users').select('id, name').eq('department', '디자인부'),
        supabase.from('plus_doctors').select('id, doctor_name, specialty, department'),
      ]).then(([rowsRes, designerRes, doctorRes]) => {
        setRows(rowsRes.data ?? []);
        setDesignerMap(Object.fromEntries((designerRes.data ?? []).map(d => [d.id, d.name])));
        setAllDoctors(doctorRes.data ?? []);
        setLoading(false);
      });
    });
  }, []);

  const confirmRow = async (id: string) => {
    await supabase.from('plus_schedule').update({ confirmed: true }).eq('id', id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, confirmed: true } : r));
    // 협업시트 L열(컨펌완료) 체크 (best-effort)
    syncSheet({ action: 'confirm', id, checked: true });
  };

  // 디자인 확인: 편집기로 이동(완료 건은 Ch5에서 읽기 전용으로 강제)
  const navigateToEditor = (row: ScheduleRow) => doNavigate(row, allDoctors);

  return { rows, loading, userId, designerMap, confirmRow, navigateToEditor, navigating };
}
