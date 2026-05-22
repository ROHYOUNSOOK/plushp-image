'use client';

import { useState } from 'react';
import { type ScheduleRow, loadDoctorImages, loadRandomFrameImages, loadScheduleInnerImages } from '@/lib/supabase';
import { useEditorStore } from '@/store/editorStore';
import { toast, hideToast } from '@/components/editor/Toast';
import { autoLoadLogos } from '@/lib/logoLoader';
import { applyBgToAllPages, applyFrameImage } from '@/lib/imageUpload';
import { pickRandomBackground } from '@/lib/backgroundLoader';
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

export function useScheduleApplication() {
  const [isApplying, setIsApplying] = useState(false);
  const pushHistory = useEditorStore(s => s.pushHistory);
  const applySchedule = useEditorStore(s => s.applySchedule);
  const setCurrentScheduleRow = useEditorStore(s => s.setCurrentScheduleRow);

  const applySelectedSchedule = async (selectedRow: ScheduleRow, allDoctors: DoctorInfo[]) => {
    setIsApplying(true);
    pushHistory();

    try {
      toast('이미지 불러오는 중...', 0);
      const { specialties, departments, ids } = resolveDoctorInfo(selectedRow.doctors, allDoctors);
      const folderName = buildScheduleFolderName(selectedRow);

      const [doctorImagesResult, frameImages, frameInnerImages] = await Promise.all([
        loadDoctorImages(ids),
        loadRandomFrameImages(selectedRow.texts.length),
        loadScheduleInnerImages(folderName, selectedRow.texts.length),
        fetch('/api/ensure-schedule-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderName }),
        }).catch(() => {}),
      ]) as [Awaited<ReturnType<typeof loadDoctorImages>>, { img: HTMLImageElement | null; url: string | null }[], { img: HTMLImageElement | null; url: string | null }[], unknown];

      const doctorImages = doctorImagesResult.map(r => r?.img ?? null);
      const doctorImageUrls = doctorImagesResult.map(r => r?.url ?? null);

      toast('스케줄 적용 중...', 0);
      setCurrentScheduleRow(selectedRow as unknown as Record<string, unknown>);
      applySchedule(
        selectedRow.texts, selectedRow.doctors, selectedRow.doctor_specialty,
        specialties, departments, doctorImageUrls, doctorImages, frameImages, frameInnerImages,
      );
      await autoLoadLogos();

      toast('배경 불러오는 중...', 0);
      try {
        const { img, url } = await pickRandomBackground();
        const state = useEditorStore.getState();
        applyBgToAllPages(img, url, state.pages);
        state.setPages([...state.pages]);
      } catch { /* 실패 시 기존 배경 유지 */ }

      hideToast();
      toast(`총 ${selectedRow.texts.length + (selectedRow.doctors.length > 0 ? 1 : 0) + 1}페이지 적용됨`);
    } catch {
      hideToast();
      toast('스케줄 적용 실패');
    } finally {
      setIsApplying(false);
    }
  };

  const applyRandomBackgroundAndFrames = async () => {
    try {
      toast('배경 및 프레임 변경 중...', 0);
      const state = useEditorStore.getState();
      const textPages = state.pages.filter(
        p => !p.isMedicalLaw && !p.layers.some(l => l.type === 'doctor-card'),
      );

      const [bgResult, frameImages] = await Promise.all([
        pickRandomBackground(),
        loadRandomFrameImages(textPages.length),
      ]);

      state.pushHistory();
      applyBgToAllPages(bgResult.img, bgResult.url, state.pages);

      textPages.forEach((page, idx) => {
        const frameResult = frameImages[idx];
        if (!frameResult?.img) return;
        const frameLayer = page.layers.find(l => l.type === 'frame') as FrameLayer | undefined;
        if (frameLayer) applyFrameImage(frameLayer, frameResult.img, frameResult.url!);
      });

      state.setPages([...state.pages]);
      hideToast();
      toast('배경 및 프레임 변경 완료');
    } catch {
      hideToast();
      toast('변경 실패');
    }
  };

  return { isApplying, applySelectedSchedule, applyRandomBackgroundAndFrames };
}
