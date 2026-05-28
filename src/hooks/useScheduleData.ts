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
            .order('date', { ascending: true });

          // 마케터는 본인이 작성한 기획안만 표시
          if (isMarketer && !isAdmin && !isDesigner) {
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

  // currentScheduleRow 바뀔 때마다 드롭다운 자동 선택
  useEffect(() => {
    if (!currentScheduleRow?.id || !rows.length) return;
    const matched = rows.find((r: { id: string }) => r.id === currentScheduleRow.id);
    if (matched) {
      setSelectedDate((matched as { date?: string }).date ?? '');
      setSelectedRow(matched as ScheduleRow);
    }
  }, [currentScheduleRow?.id, rows]);

  const dates = [...new Set(rows.map(r => r.date).filter(Boolean))];
  const keywords = rows.filter(r => r.date === selectedDate);

  return {
    rows, loading, allDoctors,
    selectedDate, setSelectedDate,
    selectedRow, setSelectedRow,
    dates, keywords,
  };
}
