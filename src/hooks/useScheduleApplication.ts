'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { type ScheduleRow, loadDoctorImages, loadRandomFrameImages, loadScheduleInnerImages } from '@/lib/supabase';
import { useEditorStore } from '@/store/editorStore';
import { toast, hideToast } from '@/components/editor/Toast';
import { autoLoadLogos } from '@/lib/logoLoader';
import { applyBgToAllPages } from '@/lib/imageUpload';
import { replaceTextboxImageColors } from '@/lib/colorHelpers';
import type { BackgroundLayer } from '@/types/layer';
import { pickRandomBackground } from '@/lib/backgroundLoader';
import { loadCloudTemplate, mergeTemplateIntoPage } from '@/lib/templateIO';
import { applyScheduleImagesToTemplatePages, applyScheduleTextsToTemplatePages } from '@/lib/scheduleImageApply';
import type { FrameLayer } from '@/types/layer';
import type { DoctorInfo } from './useScheduleData';

export function buildScheduleFolderName(row: ScheduleRow): string {
  const date = row.date ?? '';
  const yy = date.slice(2, 4), mm = date.slice(5, 7), dd = date.slice(8, 10);
  return [yy + mm + dd, row.account_id, row.keyword].filter(Boolean).join('_');
}

export function resolveDoctorInfo(doctors: string[], allDoctors: DoctorInfo[]) {
  return {
    specialties: doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.specialty ?? ''),
    departments: doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.department ?? ''),
    ids: doctors.map(n => allDoctors.find(d => d.doctor_name === n.trim())?.id ?? null),
  };
}

/** 본인에게 배분된 미시작 건이면 started=true로 전환 (배분완료 → 진행중) */
export async function maybeMarkStarted(row: ScheduleRow): Promise<void> {
  if (row.started || !row.assigned_to) return;
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (user && row.assigned_to === user.id) {
    await supabase.from('plus_schedule').update({ started: true }).eq('id', row.id);
  }
}

export async function checkTemplateExists(folderName: string): Promise<boolean> {
  try {
    const res = await fetch('/api/check-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName }),
    });
    const data = await res.json();
    return !!data.exists;
  } catch {
    return false;
  }
}

export async function applyCloudTemplate(selectedRow: ScheduleRow, folderName: string, allDoctors: DoctorInfo[] = []): Promise<void> {
  void allDoctors;
  toast('템플릿 불러오는 중...', 0);
  const store = useEditorStore.getState();
  store.setCurrentScheduleRow(selectedRow as unknown as Record<string, unknown>);

  const { pages: tplPages } = await loadCloudTemplate(folderName);
  const pagesWithImages = applyScheduleTextsToTemplatePages(
    await applyScheduleImagesToTemplatePages(tplPages, folderName),
    selectedRow.texts,
  );

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
  // 색상 동기화는 여기서 자동으로 하지 않는다 — 저장된 디자인의 색을 덮어쓰게 되기 때문.
  // 색이 어긋난 경우 프레임 속성의 '배경색 다시 적용' 버튼으로 디자이너가 직접 적용한다.
  // selectedRow는 이미 위에서 설정했으므로 덮어쓰지 않음
  await autoLoadLogos();
}

export async function applyRandomFlow(selectedRow: ScheduleRow, allDoctors: DoctorInfo[], folderName: string): Promise<void> {
  toast('이미지 불러오는 중...', 0);
  const { specialties, departments, ids } = resolveDoctorInfo(selectedRow.doctors, allDoctors);
  const doctors2 = selectedRow.doctors2 ?? [];
  const g2Info = doctors2.length ? resolveDoctorInfo(doctors2, allDoctors) : null;

  const [doctorImagesResult, doctorImages2Result, frameImages, frameInnerImages] = await Promise.all([
    loadDoctorImages(ids),
    loadDoctorImages(g2Info ? g2Info.ids : []),
    loadRandomFrameImages(selectedRow.texts.length),
    loadScheduleInnerImages(folderName, selectedRow.texts.length),
    fetch('/api/ensure-schedule-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName }),
    }).catch(() => {}),
  ]) as [Awaited<ReturnType<typeof loadDoctorImages>>, Awaited<ReturnType<typeof loadDoctorImages>>, { img: HTMLImageElement | null; url: string | null }[], { img: HTMLImageElement | null; url: string | null }[], unknown];

  const doctorImages = doctorImagesResult.map(r => r?.img ?? null);
  const doctorImageUrls = doctorImagesResult.map(r => r?.url ?? null);

  toast('스케줄 적용 중...', 0);
  const state = useEditorStore.getState();
  state.setCurrentScheduleRow(selectedRow as unknown as Record<string, unknown>);
  state.applySchedule(
    selectedRow.texts, selectedRow.doctors, selectedRow.doctor_specialty,
    specialties, departments, doctorImageUrls, doctorImages, frameImages, frameInnerImages,
    g2Info ? {
      doctors: doctors2,
      doctorSpecialty: selectedRow.doctor_specialty2 ?? '',
      doctorSpecialties: g2Info.specialties,
      doctorDepartments: g2Info.departments,
      doctorImageUrls: doctorImages2Result.map(r => r?.url ?? null),
      doctorImages: doctorImages2Result.map(r => r?.img ?? null),
    } : undefined,
  );
  await autoLoadLogos();

  toast('배경 불러오는 중...', 0);
  try {
    const { img, url } = await pickRandomBackground();
    const s = useEditorStore.getState();
    applyBgToAllPages(img, url, s.pages);
    s.setPages([...s.pages]);
  } catch { /* 실패 시 기존 배경 유지 */ }
}

export function useScheduleApplication() {
  const [isApplying, setIsApplying] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const pushHistory = useEditorStore(s => s.pushHistory);
  const router = useRouter();

  const applySelectedSchedule = async (selectedRow: ScheduleRow, allDoctors: DoctorInfo[]) => {
    setIsApplying(true);
    pushHistory();

    try {
      await maybeMarkStarted(selectedRow);
      const folderName = buildScheduleFolderName(selectedRow);
      toast('템플릿 확인 중...', 0);
      const hasTemplate = await checkTemplateExists(folderName);

      if (hasTemplate) {
        await applyCloudTemplate(selectedRow, folderName, allDoctors);
        hideToast();
        toast('저장된 템플릿 적용 완료');
      } else {
        await applyRandomFlow(selectedRow, allDoctors, folderName);
        hideToast();
        toast(`총 ${selectedRow.texts.length + (selectedRow.doctors.length > 0 ? 1 : 0) + 1}페이지 적용됨`);
      }
    } catch {
      hideToast();
      toast('스케줄 적용 실패');
    } finally {
      setIsApplying(false);
    }
  };

  const navigateToEditor = async (rowArg: ScheduleRow, allDoctors: DoctorInfo[]) => {
    setNavigating(true);
    useEditorStore.getState().resetEditor();
    toast('템플릿 확인 중...', 0);
    try {
      // DB에서 최신 row를 다시 읽어 사용 (기획안 수정분이 항상 반영되도록)
      let row = rowArg;
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        const { data: fresh } = await supabase.from('plus_schedule').select('*').eq('id', rowArg.id).single();
        if (fresh) row = fresh as ScheduleRow;
      } catch { /* 실패 시 전달받은 row 사용 */ }

      // 배분완료 → 진행중 자동 전환 (본인에게 배분된 경우)
      await maybeMarkStarted(row);

      const folderName = buildScheduleFolderName(row);
      const hasTemplate = await checkTemplateExists(folderName);

      if (hasTemplate) {
        await applyCloudTemplate(row, folderName, allDoctors);
        hideToast();
        toast('저장된 템플릿 적용 완료');
      } else {
        await applyRandomFlow(row, allDoctors, folderName);
        hideToast();
        toast(`총 ${row.texts.length + (row.doctors.length > 0 ? 1 : 0) + 1}페이지 적용됨`);
      }

      // 편집기 마운트 시 중복 재적용 방지 플래그 (방금 적용했으므로)
      try { sessionStorage.setItem('plusEditorApplied', '1'); } catch { /* noop */ }
      router.push('/editor');
    } catch (e: unknown) {
      hideToast();
      toast('이동 실패: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setNavigating(false);
    }
  };

  const applyRandomBackground = async () => {
    try {
      toast('배경 변경 중...', 0);
      const state = useEditorStore.getState();
      const { img, url } = await pickRandomBackground();
      state.pushHistory();
      applyBgToAllPages(img, url, state.pages);
      state.setPages([...state.pages]);
      hideToast();
      toast('배경 변경 완료');
    } catch {
      hideToast();
      toast('변경 실패');
    }
  };

  const applyRandomFrameForCurrentPage = async () => {
    try {
      const state = useEditorStore.getState();
      const page = state.pages[state.currentPage];
      if (!page || page.isMedicalLaw || page.layers.some(l => l.type === 'doctor-card')) {
        toast('이 페이지는 프레임을 변경할 수 없습니다');
        return;
      }
      toast('프레임 변경 중...', 0);
      const [frameResult] = await loadRandomFrameImages(1);
      if (!frameResult?.img) { hideToast(); toast('변경 실패'); return; }
      state.pushHistory();
      const frameLayer = page.layers.find(l => l.type === 'frame') as FrameLayer | undefined;
      if (frameLayer) {
        frameLayer.frameMaskImg = frameResult.img;
        frameLayer.frameMaskUrl = frameResult.url ?? '';
        const bgLayer = page.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
        if (bgLayer?.solidColor) {
          frameLayer.frameMaskProcessed = replaceTextboxImageColors(frameResult.img, bgLayer.solidColor);
        }
      }
      state.setPages([...state.pages]);
      hideToast();
      toast('프레임 변경 완료');
    } catch {
      hideToast();
      toast('변경 실패');
    }
  };

  return { isApplying, applySelectedSchedule, applyRandomBackground, applyRandomFrameForCurrentPage, navigateToEditor, navigating };
}
