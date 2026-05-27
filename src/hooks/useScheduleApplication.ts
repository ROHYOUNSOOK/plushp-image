'use client';

import { useState } from 'react';
import { type ScheduleRow, loadDoctorImages, loadRandomFrameImages, loadScheduleInnerImages } from '@/lib/supabase';
import { useEditorStore } from '@/store/editorStore';
import { toast, hideToast } from '@/components/editor/Toast';
import { autoLoadLogos } from '@/lib/logoLoader';
import { applyBgToAllPages } from '@/lib/imageUpload';
import { replaceTextboxImageColors } from '@/lib/colorHelpers';
import type { BackgroundLayer } from '@/types/layer';
import { pickRandomBackground } from '@/lib/backgroundLoader';
import { loadCloudTemplate, mergeTemplateIntoPage } from '@/lib/templateIO';
import { applyScheduleImagesToTemplatePages } from '@/lib/scheduleImageApply';
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

async function checkTemplateExists(folderName: string): Promise<boolean> {
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

export function useScheduleApplication() {
  const [isApplying, setIsApplying] = useState(false);
  const pushHistory = useEditorStore(s => s.pushHistory);
  const applySchedule = useEditorStore(s => s.applySchedule);
  const setCurrentScheduleRow = useEditorStore(s => s.setCurrentScheduleRow);

  const applyCloudTemplate = async (selectedRow: ScheduleRow, folderName: string) => {
    toast('템플릿 불러오는 중...', 0);
    setCurrentScheduleRow(selectedRow as unknown as Record<string, unknown>);
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
    if (savedScheduleRow) setCurrentScheduleRow(savedScheduleRow);
    await autoLoadLogos();
  };

  const applyRandomFlow = async (selectedRow: ScheduleRow, allDoctors: DoctorInfo[], folderName: string) => {
    toast('이미지 불러오는 중...', 0);
    const { specialties, departments, ids } = resolveDoctorInfo(selectedRow.doctors, allDoctors);

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
  };

  const applySelectedSchedule = async (selectedRow: ScheduleRow, allDoctors: DoctorInfo[]) => {
    setIsApplying(true);
    pushHistory();

    try {
      const folderName = buildScheduleFolderName(selectedRow);
      toast('템플릿 확인 중...', 0);
      const hasTemplate = await checkTemplateExists(folderName);

      if (hasTemplate) {
        await applyCloudTemplate(selectedRow, folderName);
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
        if (frameLayer) {
          frameLayer.frameMaskImg = frameResult.img;
          frameLayer.frameMaskUrl = frameResult.url ?? '';
          const bgLayer = page.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
          if (bgLayer?.solidColor && frameResult.img) {
            frameLayer.frameMaskProcessed = replaceTextboxImageColors(frameResult.img, bgLayer.solidColor);
          }
        }
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
