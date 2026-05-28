'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMarketerTasks } from '@/hooks/useMarketerTasks';
import { getScheduleStatus, STATUS_LABELS, STATUS_BADGE_CLASSES, STATUS_ORDER, type ScheduleStatus } from '@/lib/scheduleStatus';
import type { ScheduleRow } from '@/lib/supabase';

const ALL_STAGES: ScheduleStatus[] = [...STATUS_ORDER];

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

  const activeCount = rows.filter(r => !r.confirmed).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← 홈</Link>
          <span className="text-sm font-semibold text-gray-800">내 업무</span>
        </div>
        {!loading && (
          <span className="text-xs text-gray-400">진행중 {activeCount}건</span>
        )}
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
                    <div key={row.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/plan?id=${row.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate">{row.keyword || '(키워드 없음)'}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE_CLASSES[stage]}`}>
                            {STATUS_LABELS[stage]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {row.date && <span className="text-[11px] text-gray-400">업로드 {row.date}</span>}
                          {row.created_at && <span className="text-[11px] text-gray-300">작성 {row.created_at.slice(0, 10)}</span>}
                        </div>
                      </div>
                      {stage === 'design_done' && (
                        <button
                          onClick={async () => {
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
