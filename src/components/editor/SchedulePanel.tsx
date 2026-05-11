'use client';


import { useEffect, useState } from 'react';
import { supabase, type ScheduleRow, loadDoctorImages, loadRandomFrameImages } from '@/lib/supabase';
import { useEditorStore } from '@/store/editorStore';
import { toast } from './Toast';
import { autoLoadLogos } from '@/lib/logoLoader';
import { applyBackgroundImage } from '@/lib/imageUpload';
import { makeLayer } from '@/lib/layerFactory';
import { pickRandomBackground } from '@/lib/backgroundLoader';
import type { BackgroundLayer } from '@/types/layer';

export default function SchedulePanel() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRow, setSelectedRow] = useState<ScheduleRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [allDoctors, setAllDoctors] = useState<{ id: string; doctor_name: string; specialty: string; department: string }[]>([]);
  const [bgApplied, setBgApplied] = useState(false);

  const pushHistory = useEditorStore(s => s.pushHistory);
  const applySchedule = useEditorStore(s => s.applySchedule);
  const setCurrentScheduleRow = useEditorStore(s => s.setCurrentScheduleRow);

  // 데이터 로드 (스케줄 + 전체 의사 목록)
  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('plus_schedule').select('*').eq('completed', false).order('date', { ascending: true }),
      supabase.from('plus_doctors').select('id, doctor_name, specialty, department'),
    ]).then(([scheduleRes, doctorRes]) => {
      setLoading(false);
      if (scheduleRes.error) { toast('스케줄 로드 실패'); return; }
      setRows(scheduleRes.data ?? []);
      if (doctorRes.error) {
        toast(`의사 정보 로드 실패 — Supabase plus_doctor RLS 확인 필요`);
        console.error('[SchedulePanel] plus_doctor fetch error:', doctorRes.error);
      } else {
        setAllDoctors(doctorRes.data ?? []);
        console.log('[SchedulePanel] plus_doctor loaded:', doctorRes.data?.length, 'rows');
      }
    });
  }, []);

  // 고유 날짜 목록
  const dates = [...new Set(rows.map(r => r.date).filter(Boolean))];

  // 선택 날짜의 키워드 목록
  const keywords = rows.filter(r => r.date === selectedDate);

  const handleRandomBg = async () => {
    try {
      toast('배경 불러오는 중...');
      const { img, url } = await pickRandomBackground();
      const state = useEditorStore.getState();
      const { pages } = state;
      state.pushHistory();
      pages.forEach(pg => {
        if (!pg.layers.find(l => l.type === 'background')) {
          pg.layers.unshift(makeLayer('background') as BackgroundLayer);
        }
      });
      const page1Bg = pages[0]?.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
      if (page1Bg) applyBackgroundImage(page1Bg, img, url, pages);
      pages.slice(1).forEach(pg => {
        const bg = pg.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
        if (bg) { bg.img = img; bg.url = url; bg.solidColor = page1Bg?.solidColor ?? ''; }
      });
      state.setPages([...pages]);
      setBgApplied(true);
      toast('전 페이지 배경 적용됨');
    } catch {
      toast('배경 로드 실패');
    }
  };

  const handleApply = async () => {
    if (!selectedRow) return;
    pushHistory();

    const doctorSpecialties: string[] = selectedRow.doctors.map(name => {
      const found = allDoctors.find(d => d.doctor_name === name.trim());
      return found?.specialty ?? '';
    });
    const doctorDepartments: string[] = selectedRow.doctors.map(name => {
      const found = allDoctors.find(d => d.doctor_name === name.trim());
      return found?.department ?? '';
    });
    const doctorIds: (string | null)[] = selectedRow.doctors.map(name => {
      const found = allDoctors.find(d => d.doctor_name === name.trim());
      return found?.id ?? null;
    });
    const [doctorImages, frameImages] = await Promise.all([
      loadDoctorImages(doctorIds),
      loadRandomFrameImages(selectedRow.texts.length),
    ]);

    setCurrentScheduleRow(selectedRow as unknown as Record<string, unknown>);
    applySchedule(selectedRow.texts, selectedRow.doctors, selectedRow.doctor_specialty, doctorSpecialties, doctorDepartments, doctorIds, doctorImages, frameImages);
    toast(`총 ${selectedRow.texts.length + (selectedRow.doctors.length > 0 ? 1 : 0) + 1}페이지 적용됨`);
    await autoLoadLogos();

    // 랜덤 배경 자동 적용
    try {
      toast('배경 불러오는 중...');
      const { img, url } = await pickRandomBackground();
      const state = useEditorStore.getState();
      const { pages } = state;
      pages.forEach(pg => {
        if (!pg.layers.find(l => l.type === 'background')) {
          pg.layers.unshift(makeLayer('background') as BackgroundLayer);
        }
      });
      const page1Bg = pages[0]?.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
      if (page1Bg) applyBackgroundImage(page1Bg, img, url, pages);
      pages.slice(1).forEach(pg => {
        const bg = pg.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
        if (bg) { bg.img = img; bg.url = url; bg.solidColor = page1Bg?.solidColor ?? ''; }
      });
      state.setPages([...pages]);
      toast('배경 적용 완료');
    } catch {
      toast('배경 로드 실패 — 수동으로 선택하세요');
    }
  };

  return (
    <div className="p-2 border-b border-gray-200 bg-gray-50">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">📅 스케줄 적용</div>
      <div className="flex flex-col gap-1">
        {/* 랜덤 배경 선택 */}
        <button
          onClick={handleRandomBg}
          className={`w-full py-1 text-xs rounded border transition-colors px-2 ${bgApplied ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 bg-white hover:bg-gray-100 text-gray-600'}`}
        >
          {bgApplied ? '🖼 배경 적용됨 (재선택)' : '🎲 배경 색상 및 이미지 변경'}
        </button>

        {/* 날짜 선택 */}
        <select
          className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setSelectedRow(null); }}
          disabled={loading}
        >
          <option value="">{loading ? '로딩 중...' : '날짜 선택'}</option>
          {dates.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* 키워드 선택 */}
        <select
          className="w-full text-xs border border-gray-300 rounded px-1.5 py-1 bg-white disabled:opacity-50"
          value={selectedRow?.id ?? ''}
          onChange={e => {
            const row = keywords.find(r => r.id === e.target.value) ?? null;
            setSelectedRow(row);
          }}
          disabled={!selectedDate}
        >
          <option value="">키워드 선택</option>
          {keywords.map(r => (
            <option key={r.id} value={r.id}>{r.keyword}</option>
          ))}
        </select>

        {/* 미리보기 + 적용 */}
        {selectedRow && (
          <div className="text-[10px] text-gray-500">
            문구 {selectedRow.texts.length}장
            {selectedRow.doctors.length > 0 && ` + 원장님 1장 (${selectedRow.doctors.join(', ')})`}
            {' + 의료법 1장'}
          </div>
        )}
        <button
          onClick={handleApply}
          disabled={!selectedRow}
          className="w-full py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          적용
        </button>
      </div>
    </div>
  );
}
