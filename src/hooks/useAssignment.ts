'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { ScheduleRow } from '@/lib/supabase';
import { syncSheet } from '@/lib/sheetSync';

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
    // 협업시트 P열(디자이너) 동기화 — 미배분이면 빈값 (best-effort)
    const designerName = designerId ? (designers.find(d => d.id === designerId)?.name ?? '') : '';
    // 시트에 행이 없을 때(upsert 누락 등) Apps Script가 행을 만들 수 있게 기본정보도 함께 전달
    const row = rows.find(r => r.id === scheduleId);
    syncSheet({
      action: 'assign', id: scheduleId, designerName,
      reqDate: (row?.created_at ?? '').slice(0, 10),
      upDate: row?.date ?? '',
      accountId: row?.account_id ?? '',
      keyword: row?.keyword ?? '',
      marketer: row?.marketer ?? '',
    });
  };

  const updateDeadline = async (scheduleId: string, deadline: string) => {
    await supabase.from('plus_schedule').update({ deadline }).eq('id', scheduleId);
    setRows(prev => prev.map(r => r.id === scheduleId ? { ...r, deadline } : r));
  };

  return { rows, designers, loading, assign, updateDeadline };
}
