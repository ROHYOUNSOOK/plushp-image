'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { ScheduleRow } from '@/lib/supabase';
import { useEditorStore } from '@/store/editorStore';
import { toast, hideToast } from '@/components/editor/Toast';
import {
  buildScheduleFolderName,
  checkTemplateExists,
  applyCloudTemplate,
  applyRandomFlow,
} from '@/hooks/useScheduleApplication';
import type { DoctorInfo } from '@/hooks/useScheduleData';

export function useMyTasks() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

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

  const navigateToEditor = async (row: ScheduleRow) => {
    setNavigating(true);
    toast('템플릿 확인 중...', 0);
    try {
      useEditorStore.getState().pushHistory();
      const folderName = buildScheduleFolderName(row);
      const hasTemplate = await checkTemplateExists(folderName);

      if (hasTemplate) {
        await applyCloudTemplate(row, folderName);
        hideToast();
        toast('저장된 템플릿 적용 완료');
      } else {
        await applyRandomFlow(row, allDoctors, folderName);
        hideToast();
        toast(`총 ${row.texts.length + (row.doctors.length > 0 ? 1 : 0) + 1}페이지 적용됨`);
      }

      router.push('/editor');
    } catch (e: unknown) {
      hideToast();
      toast('이동 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setNavigating(false);
    }
  };

  return { rows, loading, markCompleted, navigateToEditor, navigating };
}
