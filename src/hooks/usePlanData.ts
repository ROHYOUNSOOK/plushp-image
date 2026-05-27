'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { type ScheduleRow } from '@/lib/supabase';
import { toast } from '@/components/editor/Toast';

interface Doctor {
  id: string;
  doctor_name: string;
  specialty: string;
  department: string;
}

export interface PlanUser {
  id: string;
  name: string;
  email: string;
  department: string;
  team: string;
}

export function usePlanData(filterUserId?: string) {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [blogAccounts, setBlogAccounts] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setCurrentUserId(data.user.id);
      supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()
        .then(({ data: userData }) => {
          setIsAdmin(userData?.role === '관리자');
        });
    });
  }, []);

  useEffect(() => {
    if (currentUserId === null) return;

    setLoading(true);

    const targetId = isAdmin ? filterUserId : currentUserId;

    let query = supabase.from('plus_schedule').select('*').order('date', { ascending: false });
    if (targetId) query = query.eq('created_by', targetId);

    Promise.all([
      query,
      supabase.from('plus_doctors').select('id, doctor_name, specialty, department'),
      supabase.from('blog_accounts').select('blog_id').like('blog_id', '%plushospital%').order('blog_id'),
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
  }, [currentUserId, isAdmin, filterUserId]);

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

  const markCompleted = async (id: string) => {
    await supabase.from('plus_schedule').update({ completed: true }).eq('id', id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, completed: true } : r));
  };

  return { rows, loading, allDoctors, blogAccounts, isAdmin, upsertRow, deleteRow, markCompleted };
}
