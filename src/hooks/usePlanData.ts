'use client';

/* ===========================
   usePlanData — 기획안 페이지 Supabase 데이터 로드
   PlanPage.tsx에서 분리
=========================== */

import { useState, useEffect } from 'react';
import { supabase, type ScheduleRow } from '@/lib/supabase';
import { toast } from '@/components/editor/Toast';

interface Doctor {
  id: string;
  doctor_name: string;
  specialty: string;
  department: string;
}

export function usePlanData() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [blogAccounts, setBlogAccounts] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('plus_schedule').select('*').order('date', { ascending: false }),
      supabase.from('plus_doctors').select('id, doctor_name, specialty, department'),
      supabase.from('blog_accounts').select('blog_id').like('blog_id', '%plushospital%').order('blog_id', { ascending: true }),
    ]).then(([scheduleRes, doctorRes, blogRes]) => {
      setLoading(false);
      if (scheduleRes.error) {
        toast('스케줄 로드 실패: ' + scheduleRes.error.message);
      } else {
        setRows(scheduleRes.data ?? []);
      }
      if (!doctorRes.error) setAllDoctors(doctorRes.data ?? []);
      if (!blogRes.error) setBlogAccounts((blogRes.data ?? []).map((r: { blog_id: string }) => r.blog_id));
    });
  }, []);

  const upsertRow = (saved: ScheduleRow) => {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const deleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return { rows, loading, allDoctors, blogAccounts, upsertRow, deleteRow };
}
