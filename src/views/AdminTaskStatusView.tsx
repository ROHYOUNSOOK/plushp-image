'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignment } from '@/hooks/useAssignment';
import type { ScheduleRow } from '@/lib/supabase';

type StatusFilter = '전체' | '미배분' | '진행중' | '완료';

function getStatus(row: ScheduleRow): Exclude<StatusFilter, '전체'> {
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

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

export default function AdminTaskStatusView() {
  const { rows, loading } = useAssignment();
  const router = useRouter();

  const [marketer, setMarketer] = useState<string>('');
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
      if (accountId && r.account_id !== accountId) return false;
      if (date && r.date !== date) return false;
      if (status !== '전체' && getStatus(r) !== status) return false;
      return true;
    });
  }, [rows, marketer, accountId, date, status]);

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
        <select
          value={marketer}
          onChange={e => setMarketer(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white outline-none focus:border-gray-400 transition"
        >
          <option value="">작성자</option>
          {marketers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white outline-none focus:border-gray-400 transition"
        >
          <option value="">블로그 아이디</option>
          {accountIds.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={date}
          onChange={e => setDate(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white outline-none focus:border-gray-400 transition"
        >
          <option value="">날짜</option>
          {dates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value as StatusFilter)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 bg-white outline-none focus:border-gray-400 transition"
        >
          <option value="전체">상태</option>
          <option value="미배분">미배분</option>
          <option value="진행중">진행중</option>
          <option value="완료">완료</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{sorted.length}건</span>
      </div>

      {sorted.length === 0 ? (
        <div className="text-sm text-gray-300 text-center py-16">데이터가 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-24">상태</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-44">작성일시</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-32">작성자</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 w-48">블로그 아이디</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500">키워드</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/plan?id=${row.id}`)}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5"><StatusBadge status={getStatus(row)} /></td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                  <td className="px-5 py-3.5 text-gray-700">{row.marketer || '-'}</td>
                  <td className="px-5 py-3.5 text-gray-600">{row.account_id || '-'}</td>
                  <td className="px-5 py-3.5 text-gray-800 font-medium">{row.keyword || '(키워드 없음)'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
