'use client';

import { useScheduleData } from '@/hooks/useScheduleData';
import { useScheduleApplication } from '@/hooks/useScheduleApplication';
import { useEditorStore } from '@/store/editorStore';
import { getScheduleStatus, STATUS_LABELS } from '@/lib/scheduleStatus';
import CustomSelect from '@/components/ui/CustomSelect';

export default function SchedulePanel() {
  const {
    loading, allDoctors,
    selectedDate, setSelectedDate,
    selectedRow, setSelectedRow,
    dates, keywords,
  } = useScheduleData();

  const { isApplying, applySelectedSchedule, applyRandomBackground, applyRandomFrameForCurrentPage } = useScheduleApplication();
  const editorReadOnly = useEditorStore(s => s.editorReadOnly);

  return (
    <div className="p-2 border-b border-gray-200 bg-gray-50">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">📅 스케줄 적용</div>
      <div className="flex flex-col gap-1">
        {!editorReadOnly && (
          <>
            <button
              onClick={() => {
                if (!confirm('배경을 변경하시겠습니까?\n전체 페이지의 배경이 변경됩니다.')) return;
                applyRandomBackground();
              }}
              className="w-full py-1 text-xs rounded border transition-colors px-2 border-gray-300 bg-white hover:bg-gray-100 text-gray-600"
            >
              🎲 배경 변경
            </button>
            <button
              onClick={() => {
                if (!confirm('현재 페이지의 프레임을 변경하시겠습니까?')) return;
                applyRandomFrameForCurrentPage();
              }}
              className="w-full py-1 text-xs rounded border transition-colors px-2 border-[#1450a0] bg-[#1450a0] hover:bg-[#1045a0] text-white"
            >
              🎲 프레임 변경
            </button>
          </>
        )}

        <CustomSelect
          className="w-full text-xs text-gray-900 border border-gray-300 rounded px-1.5 py-1 bg-white"
          value={selectedDate}
          onChange={v => { setSelectedDate(v); setSelectedRow(null); }}
          disabled={loading}
          placeholder={loading ? '로딩 중...' : '날짜 선택'}
          options={dates.map(d => ({ value: d, label: d }))}
        />

        <CustomSelect
          className="w-full text-xs text-gray-900 border border-gray-300 rounded px-1.5 py-1 bg-white"
          value={selectedRow?.id ?? ''}
          onChange={v => {
            const row = keywords.find(r => r.id === v) ?? null;
            setSelectedRow(row);
            if (row) applySelectedSchedule(row, allDoctors);
          }}
          disabled={!selectedDate || isApplying}
          placeholder={isApplying ? '적용 중...' : '키워드 선택'}
          options={keywords.map(r => {
            const status = getScheduleStatus(r);
            return { value: r.id, label: status === 'unassigned' ? r.keyword : `${r.keyword} · ${STATUS_LABELS[status]}` };
          })}
        />

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
