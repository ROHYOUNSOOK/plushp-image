'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignment, type Designer } from '@/hooks/useAssignment';
import CustomSelect from '@/components/ui/CustomSelect';
import { getScheduleStatus, STATUS_LABELS, STATUS_BADGE_CLASSES, type ScheduleStatus } from '@/lib/scheduleStatus';

type StatusFilter = '전체' | ScheduleStatus;

const FILTER_OPTIONS: StatusFilter[] = ['전체', 'unassigned', 'assigned', 'in_progress', 'design_done', 'confirmed'];

export default function AdminAssignView() {
  const { rows, designers, loading, assign } = useAssignment();
  const [filter, setFilter] = useState<StatusFilter>('전체');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  const dates = [...new Set(rows.map(r => r.date).filter(Boolean))].sort().reverse();

  const designerMap = Object.fromEntries(designers.map((d: Designer) => [d.id, d.name]));

  const inProgressCount = rows.reduce<Record<string, number>>((acc, r) => {
    const s = getScheduleStatus(r);
    if ((s === 'assigned' || s === 'in_progress') && r.assigned_to) {
      acc[r.assigned_to] = (acc[r.assigned_to] ?? 0) + 1;
    }
    return acc;
  }, {});

  const filtered = rows.filter(r => {
    if (filter !== '전체' && getScheduleStatus(r) !== filter) return false;
    if (dateFilter && r.date !== dateFilter) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  const handleAssign = async (id: string, designerId: string) => {
    setSaving(id);
    await assign(id, designerId || null);
    setSaving(null);
  };

  if (loading) {
    return <div className="text-sm text-gray-400 text-center py-20">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTER_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s
                ? 'bg-[#1450a0] text-white border-[#1450a0]'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {s === '전체' ? '전체' : STATUS_LABELS[s]}
          </button>
        ))}
        <CustomSelect
          value={dateFilter}
          onChange={setDateFilter}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white"
          placeholder="업로드날짜"
          options={[{ value: '', label: '업로드날짜' }, ...dates.map(d => ({ value: d, label: d }))]}
        />
        <span className="ml-auto text-xs text-gray-400">{sorted.length}건</span>
      </div>

      {sorted.length === 0 && (
        <div className="text-sm text-gray-300 text-center py-16">기획안이 없습니다.</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
        {sorted.map(row => {
          const status = getScheduleStatus(row);
          return (
            <div
              key={row.id}
              className="px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => router.push(`/plan?id=${row.id}`)}
            >
              <span className="text-sm font-semibold text-gray-800 truncate shrink-0 max-w-[180px]">
                {row.keyword || '(키워드 없음)'}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE_CLASSES[status]}`}>
                {STATUS_LABELS[status]}
              </span>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {row.marketer && (
                  <span className="text-xs whitespace-nowrap">
                    <span className="text-gray-400">작성자 </span>
                    <span className="text-gray-700 font-medium">{row.marketer}</span>
                  </span>
                )}
                {row.assigned_to && (
                  <span className="text-xs whitespace-nowrap">
                    <span className="text-gray-400">담당디자이너 </span>
                    <span className="text-blue-600 font-medium">{designerMap[row.assigned_to] ?? '알 수 없음'}</span>
                  </span>
                )}
                {row.created_at && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">작성 {row.created_at.slice(0, 10)}</span>
                )}
                {row.date && (
                  <span className="text-xs text-gray-400 whitespace-nowrap">업로드 {row.date}</span>
                )}
              </div>
              {status !== 'confirmed' && (
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">담당자</span>
                  <CustomSelect
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white min-w-[120px]"
                    dropdownMaxWidth={270}
                    value={row.assigned_to ?? ''}
                    onChange={v => handleAssign(row.id, v)}
                    disabled={saving === row.id}
                    placeholder="미배분"
                    options={[
                      { value: '', label: '미배분' },
                      ...designers.map(d => ({
                        value: d.id,
                        label: `${d.name} (${d.team || '-'}) · 진행중 ${inProgressCount[d.id] ?? 0}건`,
                      })),
                    ]}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
