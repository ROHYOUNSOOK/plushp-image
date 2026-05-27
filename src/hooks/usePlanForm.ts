'use client';

/* ===========================
   usePlanForm — 기획안 폼 저장 + 에디터 초기화 로직
   PlanForm.tsx에서 분리
=========================== */

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { type ScheduleRow, loadDoctorImages, loadRandomFrameImages, loadScheduleInnerImages } from '@/lib/supabase';
import { buildScheduleFolderName } from '@/hooks/useScheduleApplication';
import { autoLoadLogos } from '@/lib/logoLoader';
import { pickRandomBackground } from '@/lib/backgroundLoader';
import { applyBgToAllPages } from '@/lib/imageUpload';
import { loadCloudTemplate, mergeTemplateIntoPage } from '@/lib/templateIO';
import { applyScheduleImagesToTemplatePages } from '@/lib/scheduleImageApply';
import { useEditorStore } from '@/store/editorStore';
import { toast, hideToast } from '@/components/editor/Toast';

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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const applySchedule = useEditorStore(s => s.applySchedule);
  const setCurrentScheduleRow = useEditorStore(s => s.setCurrentScheduleRow);
  const pushHistory = useEditorStore(s => s.pushHistory);

  const buildPayload = async (form: FormValues) => {
    const { data: { user } } = await supabase.auth.getUser();
    return {
      marketer: form.marketer,
      date: form.date,
      account_id: form.account_id,
      keyword: form.keyword,
      texts: form.texts.filter(t => t.trim()),
      doctors: form.doctors.filter(d => d.trim()),
      doctor_specialty: form.doctor_specialty,
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
    toast('템플릿 확인 중...', 0);
    try {
      const saved = row;
      pushHistory();
      setCurrentScheduleRow(saved as unknown as Record<string, unknown>);

      const folderName = buildScheduleFolderName(saved);

      // 저장된 템플릿이 있는지 확인
      const checkRes = await fetch('/api/check-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName }),
      }).catch(() => null);
      const hasTemplate = checkRes?.ok ? (await checkRes.json()).exists : false;

      if (hasTemplate) {
        // ── 클라우드 템플릿 로드 경로 ──
        toast('저장된 템플릿 불러오는 중...', 0);
        const { pages: tplPages, scheduleRow: savedScheduleRow } = await loadCloudTemplate(folderName);
        const pagesWithImages = await applyScheduleImagesToTemplatePages(tplPages, folderName);

        const state = useEditorStore.getState();
        const newPages = [...state.pages];
        pagesWithImages.forEach((tpl, i) => {
          if (i < newPages.length) {
            newPages[i] = mergeTemplateIntoPage(newPages[i], tpl);
          } else {
            newPages.push(mergeTemplateIntoPage(
              { id: newPages.length + 1, name: tpl.name || '', layers: [] },
              tpl,
            ));
          }
        });
        state.setPages(newPages);
        if (savedScheduleRow) setCurrentScheduleRow(savedScheduleRow as unknown as Record<string, unknown>);
        await autoLoadLogos();
        onSaved(saved);
      } else {
        // ── 랜덤 플로우 경로 ──
        toast('이미지 불러오는 중...', 0);
        const doctors = saved.doctors ?? [];
        const doctorSpecialties = doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.specialty ?? '');
        const doctorDepartments = doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.department ?? '');
        const doctorIds = doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.id ?? null);
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

        try {
          const { img, url } = await pickRandomBackground();
          const state = useEditorStore.getState();
          applyBgToAllPages(img, url, state.pages);
          state.setPages([...state.pages]);
        } catch { /* 실패 시 기존 배경 유지 */ }
      }

      hideToast();
      router.push('/editor');
    } catch (e: unknown) {
      hideToast();
      toast('이동 실패: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return { handleSave, navigateToEditor, handleDelete };
}
