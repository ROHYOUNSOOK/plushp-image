'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScheduleRow } from '@/lib/supabase';
import PlanList from '@/components/plan/PlanList';
import PlanForm from '@/components/plan/PlanForm';
import { usePlanData } from '@/hooks/usePlanData';

export default function PlanPage() {
  const { rows, loading, allDoctors, blogAccounts, upsertRow, deleteRow } = usePlanData();
  const [selectedRow, setSelectedRow] = useState<ScheduleRow | null>(null);
  const [isNew, setIsNew] = useState(true);

  const handleSelect = (row: ScheduleRow) => { setSelectedRow(row); setIsNew(false); };
  const handleNew = () => { setSelectedRow(null); setIsNew(true); };

  const handleSaved = (saved: ScheduleRow) => {
    upsertRow(saved);
    setSelectedRow(saved);
    setIsNew(false);
  };

  const handleDeleted = (id: string) => {
    deleteRow(id);
    setSelectedRow(null);
    setIsNew(false);
  };

  const formRow = isNew ? null : selectedRow;
  const showForm = isNew || selectedRow !== null;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#0b7a8f] bg-[#0d8fa8]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Plus 기획안</span>
        </div>
        <Link
          href="/editor"
          className="text-xs px-3 py-1.5 rounded-lg border border-white text-white hover:bg-[#0b7a8f] transition-colors"
        >
          편집기로 →
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r border-gray-200 flex flex-col bg-white">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-400">로딩 중...</div>
          ) : (
            <PlanList
              rows={rows}
              selectedId={selectedRow?.id ?? null}
              onSelect={handleSelect}
              onNew={handleNew}
            />
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {showForm ? (
            <PlanForm
              key={formRow?.id ?? 'new'}
              row={formRow}
              allDoctors={allDoctors}
              blogAccounts={blogAccounts}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <span className="text-3xl opacity-30">📋</span>
              <p className="text-sm text-gray-400">좌측에서 기획안을 선택하거나 새로 만드세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
