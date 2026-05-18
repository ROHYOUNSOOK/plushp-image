'use client';

import { useState } from 'react';
import { useScheduleData } from '@/hooks/useScheduleData';
import { useScheduleApplication } from '@/hooks/useScheduleApplication';

export default function SchedulePanel() {
  const [bgApplied, setBgApplied] = useState(false);

  const {
    loading, allDoctors,
    selectedDate, setSelectedDate,
    selectedRow, setSelectedRow,
    dates, keywords,
  } = useScheduleData();

  const { isApplying, applySelectedSchedule, applyRandomBackground } = useScheduleApplication();

  return (
    <div className="p-2 border-b border-gray-200 bg-gray-50">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">📅 스케줄 적용</div>
      <div className="flex flex-col gap-1">
        {/* 랜덤 배경 선택 */}
        <button
          onClick={() => applyRandomBackground(() => setBgApplied(true))}
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

        {/* 미리보기 */}
        {selectedRow && (
          <div className="text-[10px] text-gray-500">
            문구 {selectedRow.texts.length}장
            {selectedRow.doctors.length > 0 && ` + 원장님 1장 (${selectedRow.doctors.join(', ')})`}
            {' + 의료법 1장'}
          </div>
        )}

        <button
          onClick={() => selectedRow && applySelectedSchedule(selectedRow, allDoctors)}
          disabled={!selectedRow || isApplying}
          className="w-full py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isApplying ? '적용 중...' : '적용'}
        </button>
      </div>
    </div>
  );
}
