'use client';

import Link from 'next/link';
import { useMyTasks } from '@/hooks/useMyTasks';
import { getScheduleStatus, STATUS_LABELS, STATUS_BADGE_CLASSES, STATUS_ORDER, type ScheduleStatus } from '@/lib/scheduleStatus';
import type { ScheduleRow } from '@/lib/supabase';

const DESIGNER_STAGES: ScheduleStatus[] = ['assigned', 'in_progress', 'design_done', 'confirmed'];
const HEADER_STAGES: ScheduleStatus[] = ['assigned', 'in_progress', 'design_done'];

export default function MyTasksPage() {
  const { rows, loading, navigateToEditor, navigating } = useMyTasks();

  const grouped = DESIGNER_STAGES.reduce<Record<ScheduleStatus, ScheduleRow[]>>(
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
        <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/home"
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              ← 홈으로
            </Link>
            <span className="text-sm font-semibold text-gray-800">내 업무</span>
          </div>
          {!loading && (
            <div className="flex items-center gap-1.5">
              {HEADER_STAGES.map(s => {
                const count = grouped[s]?.length ?? 0;
                if (count === 0) return null;
                return (
                  <span
                    key={s}
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_BADGE_CLASSES[s]}`}
                  >
                    {STATUS_LABELS[s]} {count}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-20">로딩 중...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-300 text-center py-20">배분된 업무가 없습니다.</div>
        ) : (
          DESIGNER_STAGES.map(stage => {
            const items = grouped[stage];
            if (items.length === 0) return null;
            return (
              <section key={stage}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {STATUS_LABELS[stage]}
                </p>
                <div className="space-y-2">
                  {items.map(row => (
                    <div key={row.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate block">{row.keyword || '(키워드 없음)'}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE_CLASSES[stage]}`}>
                            {STATUS_LABELS[stage]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {row.date && <span className="text-[11px] text-gray-400">업로드 {row.date}</span>}
                          {row.marketer && <span className="text-[11px] text-gray-300">{row.marketer}</span>}
                        </div>
                      </div>
                      {stage !== 'confirmed' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => navigateToEditor(row)}
                            disabled={navigating}
                            className="text-xs px-3 py-1.5 rounded-lg bg-[#1450a0] text-white hover:bg-[#1045a0] disabled:opacity-50 transition-colors"
                          >
                            {navigating ? '이동 중...' : '편집기 →'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
