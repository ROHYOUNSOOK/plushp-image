'use client';

import { useScheduleData } from '@/hooks/useScheduleData';
import { useScheduleApplication } from '@/hooks/useScheduleApplication';
import { getScheduleStatus, STATUS_LABELS } from '@/lib/scheduleStatus';

export default function SchedulePanel() {
  const {
    loading, allDoctors,
    selectedDate, setSelectedDate,
    selectedRow, setSelectedRow,
    dates, keywords,
  } = useScheduleData();

  const { isApplying, applySelectedSchedule, applyRandomBackgroundAndFrames } = useScheduleApplication();

  return (
    <div className="p-2 border-b border-gray-200 bg-gray-50">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">📅 스케줄 적용</div>
      <div className="flex flex-col gap-1">
        <button
          onClick={applyRandomBackgroundAndFrames}
          className="w-full py-1 text-xs rounded border transition-colors px-2 border-gray-300 bg-white hover:bg-gray-100 text-gray-600"
        >
          🎲 배경 및 프레임 변경
        </button>

        <select
          className="w-full text-xs text-gray-900 border border-gray-300 rounded px-1.5 py-1 bg-white"
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); setSelectedRow(null); }}
          disabled={loading}
        >
          <option value="">{loading ? '로딩 중...' : '날짜 선택'}</option>
          {dates.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          className="w-full text-xs text-gray-900 border border-gray-300 rounded px-1.5 py-1 bg-white disabled:opacity-50"
          value={selectedRow?.id ?? ''}
          onChange={e => {
            const row = keywords.find(r => r.id === e.target.value) ?? null;
            setSelectedRow(row);
            if (row) applySelectedSchedule(row, allDoctors);
          }}
          disabled={!selectedDate || isApplying}
        >
          <option value="">{isApplying ? '적용 중...' : '키워드 선택'}</option>
          {keywords.map(r => {
            const status = getScheduleStatus(r);
            const label = status === 'unassigned' ? r.keyword : `${r.keyword} · ${STATUS_LABELS[status]}`;
            return <option key={r.id} value={r.id}>{label}</option>;
          })}
        </select>

        {selectedRow && (
          <div className="text-[10px] text-gray-500">
            문구 {selectedRow.texts.length}장
            {selectedRow.doctors.length > 0 && ` + 원장님 1장 (${selectedRow.doctors.join(', ')})`}
            {' + 의료법 1장'}
          </div>
        )}
      </div>
    </div>
  );
}
