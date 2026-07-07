'use client';

/* ===========================
   usePlanForm — 기획안 폼 저장 + 에디터 초기화 로직
   PlanForm.tsx에서 분리
=========================== */

import { createBrowserClient } from '@supabase/ssr';
import { type ScheduleRow } from '@/lib/supabase';
import { buildScheduleFolderName } from '@/hooks/useScheduleApplication';
import { useScheduleApplication } from '@/hooks/useScheduleApplication';

import { toast } from '@/components/editor/Toast';

interface Doctor {
  id: string;
  doctor_name: string;
  specialty: string;
  department: string;
}

interface FormValues {
  marketer: string;
  date: string;
  account_id: string;
  keyword: string;
  texts: string[];
  image_notes: string[];
  doctors: string[];
  doctor_specialty: string;
  doctors2: string[];
  doctor_specialty2: string;
}

export function usePlanForm(
  row: ScheduleRow | null,
  allDoctors: Doctor[],
  onSaved: (row: ScheduleRow) => void,
) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { navigateToEditor: doNavigate, navigating } = useScheduleApplication();

  const buildPayload = async (form: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    return {
      marketer: form.marketer,
      date: form.date,
      account_id: form.account_id,
      keyword: form.keyword,
      texts: form.texts.filter(t => t.trim()),
      image_notes: form.image_notes,
      doctors: form.doctors.filter(d => d.trim()),
      doctor_specialty: form.doctor_specialty,
      doctors2: form.doctors2.filter(d => d.trim()),
      doctor_specialty2: form.doctor_specialty2,
      completed: row?.completed ?? false,
      ...(row?.id ? {} : { created_by: user?.id ?? null }),
    };
  };

  const saveToDb = async (form: FormValues): Promise<ScheduleRow> => {
    const payload = await buildPayload(form);
    if (row?.id) {
      const { data, error } = await supabase.from('plus_schedule').update(payload).eq('id', row.id).select().single();
      if (error) throw error;
      return data as ScheduleRow;
    } else {
      const { data, error } = await supabase.from('plus_schedule').insert(payload).select().single();
      if (error) throw error;
      return data as ScheduleRow;
    }
  };

  const handleDelete = async (): Promise<boolean> => {
    if (!row?.id) return false;
    if (!confirm(`"${row.keyword || '이 기획안'}"을 삭제하시겠습니까?`)) return false;
    const { error } = await supabase.from('plus_schedule').delete().eq('id', row.id);
    if (error) { toast('삭제 실패: ' + error.message); return false; }
    const folderName = buildScheduleFolderName(row);
    fetch('/api/delete-schedule-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName }),
    }).catch(() => {});
    toast('삭제 완료');
    return true;
  };

  const handleSave = async (form: FormValues): Promise<ScheduleRow | null> => {
    try {
      const saved = await saveToDb(form);
      toast('저장 완료');
      onSaved(saved);
      return saved;
    } catch (e: unknown) {
      toast('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
      return null;
    }
  };

  const navigateToEditor = async (): Promise<void> => {
    if (!row?.id) return;
    await doNavigate(row, allDoctors);
  };

  const handleRevision = async (): Promise<void> => {
    if (!row?.id) return;
    if (!confirm('수정요청을 보내시겠습니까? 디자이너에게 업무가 재활성화됩니다.')) return;
    const { error } = await supabase.from('plus_schedule').update({ completed: false, confirmed: false }).eq('id', row.id);
    if (error) { toast('수정요청 실패: ' + error.message); return; }
    onSaved({ ...row, completed: false, confirmed: false });
    toast('수정요청이 전송되었습니다');
  };

  return { handleSave, navigateToEditor, handleDelete, handleRevision, navigating };
}
