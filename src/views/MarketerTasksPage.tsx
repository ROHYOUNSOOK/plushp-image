'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMarketerTasks } from '@/hooks/useMarketerTasks';
import { getScheduleStatus, STATUS_LABELS, STATUS_BADGE_CLASSES, STATUS_ORDER, type ScheduleStatus } from '@/lib/scheduleStatus';
import type { ScheduleRow } from '@/lib/supabase';

const ALL_STAGES: ScheduleStatus[] = [...STATUS_ORDER];
const HEADER_STAGES: ScheduleStatus[] = ['assigned', 'in_progress', 'design_done', 'confirmed'];

export default function MarketerTasksPage() {
  const { rows, loading, designerMap, navigateToEditor, navigating } = useMarketerTasks();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<ScheduleStatus | null>(null);

  const grouped = ALL_STAGES.reduce<Record<ScheduleStatus, ScheduleRow[]>>(
    (acc, s) => { acc[s] = []; return acc; },
    {} as Record<ScheduleStatus, ScheduleRow[]>,
  );
  rows.forEach(r => {
    const s = getScheduleStatus(r);
    if (grouped[s]) grouped[s].push(r);
  });


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-[1280px] mx-auto relative flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              ← 홈으로
            </Link>
            <span className="text-sm font-semibold text-gray-800">마케터 내 업무</span>
          </div>
          {!loading && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {HEADER_STAGES.map(s => {
                const count = grouped[s]?.length ?? 0;
                if (count === 0) return null;
                const isActive = activeFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveFilter(isActive ? null : s)}
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-all ${
                      isActive
                        ? 'ring-2 ring-offset-1 ring-current opacity-100 scale-105'
                        : 'opacity-80 hover:opacity-100'
                    } ${STATUS_BADGE_CLASSES[s]}`}
                  >
                    {STATUS_LABELS[s]} {count}
                  </button>
                );
              })}
            </div>
          )}
          <Link
            href="/plan"
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            기획안 →
          </Link>
        </div>
      </header>

      <div className="p-6 max-w-[1280px] mx-auto space-y-6">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-20">로딩 중...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-300 text-center py-20">작성한 기획안이 없습니다.</div>
        ) : (
          ALL_STAGES.map(stage => {
            if (activeFilter && activeFilter !== stage) return null;
            const items = grouped[stage];
            if (items.length === 0) return null;
            return (
              <section key={stage}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {STATUS_LABELS[stage]}
                </p>
                <div className="space-y-2">
                  {items.map(row => {
                    const isDone = stage === 'design_done' || stage === 'confirmed';
                    return (
                    <div
                      key={row.id}
                      onClick={() => router.push(`/plan?id=${row.id}`)}
                      className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-800 truncate min-w-0 flex-shrink-0 w-[240px]">
                        {row.keyword || '(키워드 없음)'}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE_CLASSES[stage]}`}>
                        {STATUS_LABELS[stage]}
                      </span>
                      <div className="flex items-center gap-4 ml-2 flex-1 min-w-0">
                        {row.created_at && <span className="text-xs text-gray-400 whitespace-nowrap">작성 {row.created_at.slice(0, 10)}</span>}
                        {row.date && <span className="text-xs text-gray-400 whitespace-nowrap">업로드 {row.date}</span>}
                        {row.assigned_to && (
                          <span className="text-xs whitespace-nowrap">
                            <span className="text-gray-400">담당디자이너 </span>
                            <span className="text-blue-600 font-medium">{designerMap[row.assigned_to] ?? '알 수 없음'}</span>
                          </span>
                        )}
                      </div>
                      {isDone && (
                        <button
                          onClick={e => { e.stopPropagation(); navigateToEditor(row); }}
                          disabled={navigating}
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-[#1450a0] text-white hover:bg-[#1045a0] disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          {navigating ? '이동 중...' : '디자인 확인'}
                        </button>
                      )}
                    </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
