'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { supabase, type ScheduleRow } from '@/lib/supabase';
import { useEditorStore } from '@/store/editorStore';
import { toast } from '@/components/editor/Toast';

export interface DoctorInfo {
  id: string;
  doctor_name: string;
  specialty: string;
  department: string;
}

export function useScheduleData() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [allDoctors, setAllDoctors] = useState<DoctorInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRow, setSelectedRow] = useState<ScheduleRow | null>(null);

  const currentScheduleRow = useEditorStore(s => s.currentScheduleRow);

  useEffect(() => {
    const browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    setLoading(true);
    browserClient.auth.getUser().then(({ data: authData }) => {
      const userId = authData.user?.id;
      if (!userId) { setLoading(false); return; }

      browserClient
        .from('users')
        .select('role, department')
        .eq('id', userId)
        .single()
        .then(({ data: userData }) => {
          const isAdmin = userData?.role === '관리자';
          const isDesigner = userData?.department === '디자인부';
          const isMarketer = userData?.department === '마케팅부';

          let scheduleQuery = supabase
            .from('plus_schedule')
            .select('*')
            .eq('completed', false)
            .order('date', { ascending: false });

          if (isAdmin) {
            // 관리자: 배분된 미완료 건만 (미배분 제외)
            scheduleQuery = scheduleQuery.not('assigned_to', 'is', null);
          } else if (isDesigner) {
            // 디자이너: 본인에게 배분된 미완료 건만
            scheduleQuery = scheduleQuery.eq('assigned_to', userId);
          } else if (isMarketer) {
            // 마케터: 본인이 작성한 기획안만
            scheduleQuery = scheduleQuery.eq('created_by', userId);
          }

          Promise.all([
            scheduleQuery,
            supabase.from('plus_doctors').select('id, doctor_name, specialty, department'),
          ]).then(([scheduleRes, doctorRes]) => {
            setLoading(false);
            if (scheduleRes.error) { toast('스케줄 로드 실패'); return; }
            setRows(scheduleRes.data ?? []);
            if (doctorRes.error) {
              toast('의사 정보 로드 실패 — Supabase plus_doctor RLS 확인 필요');
            } else {
              setAllDoctors(doctorRes.data ?? []);
            }
          });
        });
    });
  }, []);

  // 현재 적용된 스케줄은 완료/미배분 등으로 목록에서 빠져도 항상 포함
  // (디자인 확인·관리자 진입 시 적용 스케줄이 드롭다운에 보이도록)
  const mergedRows: ScheduleRow[] = (() => {
    const cur = currentScheduleRow as unknown as ScheduleRow | null;
    if (!cur?.id) return rows;
    if (rows.some(r => r.id === cur.id)) return rows;
    return [...rows, cur];
  })();

  // currentScheduleRow 바뀔 때마다 드롭다운 자동 선택
  useEffect(() => {
    if (!currentScheduleRow?.id || !mergedRows.length) return;
    const matched = mergedRows.find((r: { id: string }) => r.id === currentScheduleRow.id);
    if (matched) {
      setSelectedDate((matched as { date?: string }).date ?? '');
      setSelectedRow(matched as ScheduleRow);
    }
  }, [currentScheduleRow?.id, mergedRows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const dates = [...new Set(mergedRows.map(r => r.date).filter(Boolean))].sort().reverse();
  const keywords = mergedRows.filter(r => r.date === selectedDate);

  return {
    rows: mergedRows, loading, allDoctors,
    selectedDate, setSelectedDate,
    selectedRow, setSelectedRow,
    dates, keywords,
  };
}
