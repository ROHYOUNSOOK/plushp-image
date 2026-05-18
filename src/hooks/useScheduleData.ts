'use client';

import { useEffect, useState } from 'react';
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
    setLoading(true);
    Promise.all([
      supabase.from('plus_schedule').select('*').eq('completed', false).order('date', { ascending: true }),
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
