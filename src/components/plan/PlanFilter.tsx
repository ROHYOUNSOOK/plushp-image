'use client';

import { useEffect, useState } from 'react';
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

      <select
        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none"
        value={dept}
        onChange={e => handleDeptChange(e.target.value)}
      >
        <option value="">부서 선택</option>
        {Object.keys(DEPT_TEAMS).map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <select
        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none disabled:opacity-40"
        value={team}
        onChange={e => setTeam(e.target.value)}
        disabled={!dept}
      >
        <option value="">팀 선택</option>
        {(DEPT_TEAMS[dept] ?? []).map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <select
        className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none disabled:opacity-40"
        value={selectedUser}
        onChange={e => handleUserChange(e.target.value)}
        disabled={!users.length}
      >
        <option value="">직원 선택</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
      </select>
    </div>
  );
}
