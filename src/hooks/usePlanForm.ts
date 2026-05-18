'use client';

/* ===========================
   usePlanForm — 기획안 폼 저장 + 에디터 초기화 로직
   PlanForm.tsx에서 분리
=========================== */

import { useRouter } from 'next/navigation';
import { supabase, type ScheduleRow, loadDoctorImages, loadRandomFrameImages, loadScheduleInnerImages } from '@/lib/supabase';
import { buildScheduleFolderName } from '@/hooks/useScheduleApplication';
import { autoLoadLogos } from '@/lib/logoLoader';
import { pickRandomBackground } from '@/lib/backgroundLoader';
import { applyBgToAllPages } from '@/lib/imageUpload';
import { useEditorStore } from '@/store/editorStore';
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
  doctors: string[];
  doctor_specialty: string;
}

export function usePlanForm(
  row: ScheduleRow | null,
  allDoctors: Doctor[],
  onSaved: (row: ScheduleRow) => void,
) {
  const router = useRouter();
  const applySchedule = useEditorStore(s => s.applySchedule);
  const setCurrentScheduleRow = useEditorStore(s => s.setCurrentScheduleRow);
  const pushHistory = useEditorStore(s => s.pushHistory);

  const buildPayload = (form: FormValues) => ({
    marketer: form.marketer,
    date: form.date,
    account_id: form.account_id,
    keyword: form.keyword,
    texts: form.texts.filter(t => t.trim()),
    doctors: form.doctors.filter(d => d.trim()),
    doctor_specialty: form.doctor_specialty,
    completed: row?.completed ?? false,
  });

  const saveToDb = async (form: FormValues): Promise<ScheduleRow> => {
    const payload = buildPayload(form);
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

  const handleSaveAndEdit = async (form: FormValues): Promise<void> => {
    try {
      const saved = await saveToDb(form);
      setCurrentScheduleRow(saved as unknown as Record<string, unknown>);
      pushHistory();

      const doctors = saved.doctors ?? [];
      const doctorSpecialties = doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.specialty ?? '');
      const doctorDepartments = doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.department ?? '');
      const doctorIds = doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.id ?? null);

      const folderName = buildScheduleFolderName(saved);
      const textCount = (saved.texts ?? []).length;

      const [doctorImagesResult, frameImages, frameInnerImages] = await Promise.all([
        loadDoctorImages(doctorIds),
        loadRandomFrameImages(textCount),
        loadScheduleInnerImages(folderName, textCount),
        fetch('/api/ensure-schedule-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName }),
        }).catch(() => {}),
      ]) as [Awaited<ReturnType<typeof loadDoctorImages>>, { img: HTMLImageElement | null; url: string | null }[], { img: HTMLImageElement | null; url: string | null }[], unknown];

      const doctorImages = doctorImagesResult.map(r => r?.img ?? null);
      const resolvedDoctorImageUrls = doctorImagesResult.map(r => r?.url ?? null);

      applySchedule(
        saved.texts ?? [], doctors, saved.doctor_specialty,
        doctorSpecialties, doctorDepartments, resolvedDoctorImageUrls, doctorImages, frameImages, frameInnerImages,
      );
      onSaved(saved);
      await autoLoadLogos();

      // 랜덤 배경 자동 적용
      try {
        const { img, url } = await pickRandomBackground();
        const state = useEditorStore.getState();
        applyBgToAllPages(img, url, state.pages);
        state.setPages([...state.pages]);
      } catch { /* 실패 시 기존 배경 유지 */ }

      router.push('/editor');
    } catch (e: unknown) {
      toast('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return { handleSave, handleSaveAndEdit, handleDelete };
}
