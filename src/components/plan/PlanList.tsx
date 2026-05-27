
import type { ScheduleRow } from '@/lib/supabase';

function RowStatusDot({ row }: { row: ScheduleRow }) {
  if (row.completed) return <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="완료" />;
  if (row.assigned_to) return <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="진행중" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" title="미배분" />;
}

interface Props {
  rows: ScheduleRow[];
  selectedId: string | null;
  onSelect: (row: ScheduleRow) => void;
  onNew: () => void;
  canCreate: boolean;
}

export default function PlanList({ rows, selectedId, onSelect, onNew, canCreate }: Props) {
  const grouped: Record<string, ScheduleRow[]> = {};
  for (const row of rows) {
    const key = row.date || '날짜 없음';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="px-4 py-3.5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">기획안</span>
          {canCreate && (
            <button
              onClick={onNew}
              className="text-[11px] font-medium text-[#1450a0] hover:text-[#1045a0] transition-colors"
            >
              + 새 기획안
            </button>
          )}
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {sortedDates.length === 0 && (
          <div className="py-12 text-xs text-gray-300 text-center">기획안이 없습니다.</div>
        )}
        {sortedDates.map(date => (
          <div key={date}>
            <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 tracking-widest bg-gray-50 border-y border-gray-100 sticky top-0">
              {date}
            </div>
            {grouped[date].map(row => (
              <button
                key={row.id}
                onClick={() => onSelect(row)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors group ${
                  selectedId === row.id
                    ? 'bg-[#e3edf8] border-l-[3px] border-l-[#1450a0]'
                    : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <RowStatusDot row={row} />
                  <span className={`text-xs font-medium truncate ${selectedId === row.id ? 'text-[#1045a0]' : 'text-gray-700'}`}>
                    {row.keyword || '(키워드 없음)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {row.marketer && (
                    <span className="text-[10px] text-gray-400">{row.marketer}</span>
                  )}
                  {row.account_id && (
                    <span className="text-[10px] text-gray-300">{row.account_id}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
