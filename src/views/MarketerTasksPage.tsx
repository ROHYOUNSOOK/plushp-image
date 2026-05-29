'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMarketerTasks } from '@/hooks/useMarketerTasks';
import { getScheduleStatus, STATUS_LABELS, STATUS_BADGE_CLASSES, STATUS_ORDER, type ScheduleStatus } from '@/lib/scheduleStatus';
import type { ScheduleRow } from '@/lib/supabase';

const ALL_STAGES: ScheduleStatus[] = [...STATUS_ORDER];
const HEADER_STAGES: ScheduleStatus[] = ['assigned', 'in_progress', 'design_done', 'confirmed'];

export default function MarketerTasksPage() {
  const { rows, loading, confirmRow } = useMarketerTasks();
  const router = useRouter();

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
        <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/home" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← 홈</Link>
            <span className="text-sm font-semibold text-gray-800">내 업무</span>
          </div>
          {!loading && (
            <div className="flex items-center gap-1.5 flex-wrap">
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
          <div className="text-sm text-gray-300 text-center py-20">작성한 기획안이 없습니다.</div>
        ) : (
          ALL_STAGES.map(stage => {
            const items = grouped[stage];
            if (items.length === 0) return null;
            return (
              <section key={stage}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {STATUS_LABELS[stage]}
                </p>
                <div className="space-y-2">
                  {items.map(row => (
                    <div
                      key={row.id}
                      onClick={() => router.push(`/plan?id=${row.id}`)}
                      className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-800 truncate min-w-0 flex-shrink-0 max-w-[180px]">
                        {row.keyword || '(키워드 없음)'}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE_CLASSES[stage]}`}>
                        {STATUS_LABELS[stage]}
                      </span>
                      <div className="flex items-center gap-4 ml-2 flex-1 min-w-0">
                        {row.created_at && <span className="text-xs text-gray-400 whitespace-nowrap">작성 {row.created_at.slice(0, 10)}</span>}
                        {row.date && <span className="text-xs text-gray-400 whitespace-nowrap">업로드 {row.date}</span>}
                      </div>
                      {stage === 'design_done' && (
                        <button
                          onClick={async e => {
                            e.stopPropagation();
                            if (!confirm('컨펌 완료 처리하시겠습니까?')) return;
                            await confirmRow(row.id);
                          }}
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-400 transition-colors whitespace-nowrap"
                        >
                          컨펌완료
                        </button>
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
