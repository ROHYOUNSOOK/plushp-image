'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMyTasks } from '@/hooks/useMyTasks';

export default function MyTasksPage() {
  const { rows, loading, markCompleted } = useMyTasks();
  const router = useRouter();

  const pending = rows.filter(r => !r.completed);
  const done = rows.filter(r => r.completed);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← 홈</Link>
          <span className="text-sm font-semibold text-gray-800">내 업무</span>
        </div>
        {!loading && (
          <span className="text-xs text-gray-400">진행중 {pending.length}건</span>
        )}
      </header>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-20">로딩 중...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-300 text-center py-20">배분된 업무가 없습니다.</div>
        ) : (
          <>
            {pending.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">진행중</p>
                <div className="space-y-2">
                  {pending.map(row => (
                    <div key={row.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800 truncate block">{row.keyword || '(키워드 없음)'}</span>
                        <div className="flex items-center gap-3 mt-0.5">
                          {row.deadline && <span className="text-[11px] text-orange-400 font-medium">마감 {row.deadline}</span>}
                          {row.date && <span className="text-[11px] text-gray-400">업로드 {row.date}</span>}
                          {row.marketer && <span className="text-[11px] text-gray-300">{row.marketer}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => router.push('/editor')}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#1450a0] text-white hover:bg-[#1045a0] transition-colors"
                        >
                          편집기 →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {done.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">완료</p>
                <div className="space-y-2">
                  {done.map(row => (
                    <div key={row.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 opacity-60">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-600 truncate block">{row.keyword || '(키워드 없음)'}</span>
                        {row.date && <span className="text-[11px] text-gray-400">{row.date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
