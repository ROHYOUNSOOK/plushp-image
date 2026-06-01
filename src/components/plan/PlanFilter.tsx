'use client';

import { useEffect, useState } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { createBrowserClient } from '@supabase/ssr';
import { type PlanUser } from '@/hooks/usePlanData';

const DEPT_TEAMS: Record<string, string[]> = {
  '마케팅부': ['블로그팀', '플친팀', '콘텐츠팀', '마케팅기획실', '영상팀'],
  '디자인부': ['콘텐츠디자인팀', '디자인팀'],
  '글로벌부': ['일본팀', '중국팀', '글로벌팀', '태국팀', '대만팀', '러시아팀', '인도네시아팀'],
};

interface Props {
  onSelect: (userId: string | undefined) => void;
}

export default function PlanFilter({ onSelect }: Props) {
  const [dept, setDept] = useState('');
  const [team, setTeam] = useState('');
  const [users, setUsers] = useState<PlanUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    if (!team) { setUsers([]); setSelectedUser(''); onSelect(undefined); return; }
    supabase
      .from('users')
      .select('id, name, email, department, team')
      .eq('department', dept)
      .eq('team', team)
      .then(({ data }) => setUsers(data ?? []));
    setSelectedUser('');
    onSelect(undefined);
  }, [team]);

  const handleUserChange = (id: string) => {
    setSelectedUser(id);
    onSelect(id || undefined);
  };

  const handleDeptChange = (val: string) => {
    setDept(val);
    setTeam('');
    setUsers([]);
    setSelectedUser('');
    onSelect(undefined);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
      <span className="text-xs font-semibold text-blue-400 mr-1">필터</span>

      <CustomSelect
        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        value={dept}
        onChange={handleDeptChange}
        placeholder="부서 선택"
        options={[{ value: '', label: '부서 선택' }, ...Object.keys(DEPT_TEAMS).map(d => ({ value: d, label: d }))]}
      />

      <CustomSelect
        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        value={team}
        onChange={setTeam}
        disabled={!dept}
        placeholder="팀 선택"
        options={[{ value: '', label: '팀 선택' }, ...(DEPT_TEAMS[dept] ?? []).map(t => ({ value: t, label: t }))]}
      />

      <CustomSelect
        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
        value={selectedUser}
        onChange={handleUserChange}
        disabled={!users.length}
        placeholder="직원 선택"
        options={[{ value: '', label: '직원 선택' }, ...users.map(u => ({ value: u.id, label: u.name || u.email }))]}
      />
    </div>
  );
}
