'use client';

import { useMemo, useState, useEffect } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useAssignment } from '@/hooks/useAssignment';
import { useScheduleApplication } from '@/hooks/useScheduleApplication';
import type { DoctorInfo } from '@/hooks/useScheduleData';
import { getScheduleStatus, STATUS_LABELS, STATUS_BADGE_CLASSES, type ScheduleStatus } from '@/lib/scheduleStatus';

type StatusFilter = '전체' | ScheduleStatus;

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

export default function AdminTaskStatusView() {
  const { rows, designers, loading } = useAssignment();
  const designerMap = Object.fromEntries(designers.map(d => [d.id, d.name]));
  const router = useRouter();
  const { navigateToEditor, navigating } = useScheduleApplication();
  const [allDoctors, setAllDoctors] = useState<DoctorInfo[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.from('plus_doctors').select('id, doctor_name, specialty, department')
      .then(({ data }) => setAllDoctors(data ?? []));
  }, []);

  const [marketer, setMarketer] = useState<string>('');
  const [designerId, setDesignerId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [status, setStatus] = useState<StatusFilter>('전체');

  const marketers = useMemo(
    () => [...new Set(rows.map(r => r.marketer).filter(Boolean))].sort(),
    [rows],
  );
  const accountIds = useMemo(
    () => [...new Set(rows.map(r => r.account_id).filter(Boolean))].sort(),
    [rows],
  );
  const dates = useMemo(
    () => [...new Set(rows.map(r => r.date).filter(Boolean))].sort().reverse(),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (marketer && r.marketer !== marketer) return false;
      if (designerId && r.assigned_to !== designerId) return false;
      if (accountId && r.account_id !== accountId) return false;
      if (date && r.date !== date) return false;
      if (status !== '전체' && getScheduleStatus(r) !== status) return false;
      return true;
    });
  }, [rows, marketer, designerId, accountId, date, status]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')),
    [filtered],
  );

  if (loading) {
    return <div className="text-sm text-gray-400 text-center py-20">로딩 중...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <CustomSelect
          value={marketer}
          onChange={setMarketer}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white"
          placeholder="작성자"
          options={[{ value: '', label: '작성자' }, ...marketers.map(m => ({ value: m, label: m }))]}
        />
        <CustomSelect
          value={designerId}
          onChange={setDesignerId}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white"
          placeholder="담당디자이너"
          options={[{ value: '', label: '담당디자이너' }, ...designers.map(d => ({ value: d.id, label: d.name }))]}
        />
        <CustomSelect
          value={accountId}
          onChange={setAccountId}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white"
          placeholder="블로그 아이디"
          options={[{ value: '', label: '블로그 아이디' }, ...accountIds.map(a => ({ value: a, label: a }))]}
        />
        <CustomSelect
          value={date}
          onChange={setDate}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white"
          placeholder="업로드날짜"
          options={[{ value: '', label: '업로드날짜' }, ...dates.map(d => ({ value: d, label: d }))]}
        />
        <CustomSelect
          value={status}
          onChange={v => setStatus(v as StatusFilter)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white"
          options={[
            { value: '전체', label: '상태' },
            { value: 'unassigned', label: '미배분' },
            { value: 'assigned', label: '배분완료' },
            { value: 'in_progress', label: '진행중' },
            { value: 'design_done', label: '디자인완료' },
            { value: 'confirmed', label: '컨펌완료' },
          ]}
        />
        <span className="ml-auto text-xs text-gray-400">{sorted.length}건</span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-sm text-gray-300 text-center py-16">데이터가 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-24">상태</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-40">작성일시</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-28">업로드날짜</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-36">작성자</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-36">담당디자이너</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-40">블로그 아이디</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">키워드</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 w-36">바로가기</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const s = getScheduleStatus(row);
                return (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_BADGE_CLASSES[s]}`}>
                      {STATUS_LABELS[s]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap text-xs">{formatDateTime(row.created_at)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {row.date
                      ? <span className="text-xs font-medium text-gray-700">{row.date}</span>
                      : <span className="text-xs text-gray-300">-</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 truncate">{row.marketer || '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600 truncate">
                    {row.assigned_to ? (designerMap[row.assigned_to] ?? '알 수 없음') : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 truncate">{row.account_id || '-'}</td>
                  <td className="px-5 py-3.5 text-gray-800 font-medium break-keep">{row.keyword || '(키워드 없음)'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/plan?id=${row.id}`)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
                      >
                        기획안
                      </button>
                      <button
                        onClick={() => navigateToEditor(row, allDoctors)}
                        disabled={navigating}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#1450a0] text-white hover:bg-[#1045a0] disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {navigating ? '이동 중...' : '편집기'}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
