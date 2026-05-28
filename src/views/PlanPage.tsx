'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ScheduleRow } from '@/lib/supabase';
import PlanList from '@/components/plan/PlanList';
import PlanForm from '@/components/plan/PlanForm';
import PlanFilter from '@/components/plan/PlanFilter';
import { usePlanData } from '@/hooks/usePlanData';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import Toast from '@/components/editor/Toast';

export default function PlanPage() {
  const [filterUserId, setFilterUserId] = useState<string | undefined>();
  const { rows, loading, allDoctors, blogAccounts, isAdmin, upsertRow, deleteRow, markCompleted } = usePlanData(filterUserId);
  const permissions = useUserPermissions();
  const [selectedRow, setSelectedRow] = useState<ScheduleRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading) return;
    const id = searchParams.get('id');
    if (!id) return;
    const found = rows.find(r => r.id === id);
    if (found) { setSelectedRow(found); setIsNew(false); }
  }, [loading, searchParams]);

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
      <Toast />
      <header className="flex items-center justify-between px-6 py-3 border-b border-[#0b7a8f] bg-[#0d8fa8]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">Plus 기획안</span>
        </div>
        <Link
          href="/home"
          className="text-xs px-3 py-1.5 rounded-lg border border-white text-white hover:bg-[#0b7a8f] transition-colors"
        >
          홈으로 →
        </Link>
      </header>

      {isAdmin && <PlanFilter onSelect={setFilterUserId} />}

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
              canCreate={permissions.canEditPlans}
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
              permissions={permissions}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onCompleted={id => { markCompleted(id); setSelectedRow(prev => prev?.id === id ? { ...prev, completed: true } : prev); }}
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
