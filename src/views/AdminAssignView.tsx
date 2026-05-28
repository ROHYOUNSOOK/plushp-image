'use client';

import { useState } from 'react';
import { useAssignment, type Designer } from '@/hooks/useAssignment';
import type { ScheduleRow } from '@/lib/supabase';

type StatusFilter = '전체' | '미배분' | '진행중' | '완료';

function getStatus(row: ScheduleRow) {
  if (row.completed) return '완료';
  if (row.assigned_to) return '진행중';
  return '미배분';
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === '완료' ? 'bg-green-100 text-green-700' :
    status === '진행중' ? 'bg-blue-100 text-blue-700' :
    'bg-gray-100 text-gray-500';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>;
}

export default function AdminAssignView() {
  const { rows, designers, loading, assign } = useAssignment();
  const [filter, setFilter] = useState<StatusFilter>('전체');
  const [saving, setSaving] = useState<string | null>(null);

  const designerMap = Object.fromEntries(designers.map((d: Designer) => [d.id, d.name]));

  const filtered = rows.filter(r => {
    const s = getStatus(r);
    return filter === '전체' || s === filter;
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
      <div className="flex items-center gap-2 mb-4">
        {(['전체', '미배분', '진행중', '완료'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === s
                ? 'bg-[#1450a0] text-white border-[#1450a0]'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{sorted.length}건</span>
      </div>

      {sorted.length === 0 && (
        <div className="text-sm text-gray-300 text-center py-16">기획안이 없습니다.</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
        {sorted.map(row => {
          const status = getStatus(row);
          return (
            <div key={row.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">{row.keyword || '(키워드 없음)'}</span>
                  <StatusBadge status={status} />
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {row.marketer && <span className="text-[11px] text-gray-400">{row.marketer}</span>}
                  {row.assigned_to && (
                    <span className="text-[11px] text-blue-500">→ {designerMap[row.assigned_to] ?? '알 수 없음'}</span>
                  )}
                  {row.created_at && (
                    <span className="text-[11px] text-gray-400">작성 {row.created_at.slice(0, 10)}</span>
                  )}
                  {row.date && (
                    <span className="text-[11px] text-gray-400">업로드 {row.date}</span>
                  )}
                </div>
              </div>
              {!row.completed && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">담당자</span>
                  <select
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-gray-400 transition min-w-[120px]"
                    value={row.assigned_to ?? ''}
                    onChange={e => handleAssign(row.id, e.target.value)}
                    disabled={saving === row.id}
                  >
                    <option value="">미배분</option>
                    {designers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.team || '-'})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
