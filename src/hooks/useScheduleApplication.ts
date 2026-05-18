'use client';

import { type ScheduleRow, loadDoctorImages, loadRandomFrameImages, loadScheduleInnerImages } from '@/lib/supabase';
import { useEditorStore } from '@/store/editorStore';
import { toast } from '@/components/editor/Toast';
import { autoLoadLogos } from '@/lib/logoLoader';
import { applyBgToAllPages } from '@/lib/imageUpload';
import { pickRandomBackground } from '@/lib/backgroundLoader';
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

export function useScheduleApplication() {
  const pushHistory = useEditorStore(s => s.pushHistory);
  const applySchedule = useEditorStore(s => s.applySchedule);
  const setCurrentScheduleRow = useEditorStore(s => s.setCurrentScheduleRow);

  const applySelectedSchedule = async (selectedRow: ScheduleRow, allDoctors: DoctorInfo[]) => {
    pushHistory();

    const { specialties, departments, ids } = resolveDoctorInfo(selectedRow.doctors, allDoctors);
    const folderName = buildScheduleFolderName(selectedRow);

    const [doctorImagesResult, frameImages, frameInnerImages] = await Promise.all([
      loadDoctorImages(ids),
      loadRandomFrameImages(selectedRow.texts.length),
      loadScheduleInnerImages(folderName, selectedRow.texts.length),
    ]);

    const doctorImages = doctorImagesResult.map(r => r?.img ?? null);
    const doctorImageUrls = doctorImagesResult.map(r => r?.url ?? null);

    setCurrentScheduleRow(selectedRow as unknown as Record<string, unknown>);
    applySchedule(
      selectedRow.texts, selectedRow.doctors, selectedRow.doctor_specialty,
      specialties, departments, doctorImageUrls, doctorImages, frameImages, frameInnerImages,
    );
    toast(`총 ${selectedRow.texts.length + (selectedRow.doctors.length > 0 ? 1 : 0) + 1}페이지 적용됨`);
    await autoLoadLogos();

    try {
      toast('배경 불러오는 중...');
      const { img, url } = await pickRandomBackground();
      const state = useEditorStore.getState();
      applyBgToAllPages(img, url, state.pages);
      state.setPages([...state.pages]);
      toast('배경 적용 완료');
    } catch {
      toast('배경 로드 실패 — 수동으로 선택하세요');
    }
  };

  const applyRandomBackground = async (onApplied?: () => void) => {
    try {
      toast('배경 불러오는 중...');
      const { img, url } = await pickRandomBackground();
      const state = useEditorStore.getState();
      state.pushHistory();
      applyBgToAllPages(img, url, state.pages);
      state.setPages([...state.pages]);
      onApplied?.();
      toast('전 페이지 배경 적용됨');
    } catch {
      toast('배경 로드 실패');
    }
  };

  return { applySelectedSchedule, applyRandomBackground };
}
