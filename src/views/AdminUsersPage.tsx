'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminUsers, type UserRow } from '@/hooks/useAdminUsers';

const DEPT_TEAMS: Record<string, string[]> = {
  '마케팅부': ['블로그팀', '플친팀', '콘텐츠팀', '마케팅기획실', '영상팀'],
  '디자인부': ['콘텐츠디자인팀', '디자인팀'],
  '글로벌부': ['일본팀', '중국팀', '글로벌팀', '태국팀', '대만팀', '러시아팀', '인도네시아팀'],
};

const DEPARTMENTS = Object.keys(DEPT_TEAMS);
const ROLES = ['직원', '관리자'];

interface EditState {
  name: string;
  department: string;
  team: string;
  role: string;
}

export default function AdminUsersPage() {
  const { users, loading, updateUser } = useAdminUsers();
  const [editing, setEditing] = useState<Record<string, EditState>>({});

  const startEdit = (user: UserRow) => {
    setEditing(prev => ({
      ...prev,
      [user.id]: {
        name: user.name ?? '',
        department: user.department ?? '-',
        team: user.team ?? '-',
        role: user.role ?? '직원',
      },
    }));
  };

  const cancelEdit = (id: string) => {
    setEditing(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const saveEdit = async (id: string) => {
    await updateUser(id, editing[id]);
    cancelEdit(id);
  };

  const setEditField = (id: string, field: keyof EditState, value: string) => {
    setEditing(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
        ...(field === 'department' ? { team: '-' } : {}),
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← 홈</Link>
          <span className="text-sm font-semibold text-gray-800">직원 관리</span>
        </div>
      </header>

      <div className="p-6">
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-20">로딩 중...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이름</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이메일</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">부서</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">팀</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">권한</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const isEditing = !!editing[user.id];
                  const edit = editing[user.id];
                  const availableTeams = edit ? (DEPT_TEAMS[edit.department] ?? []) : [];

                  return (
                    <tr key={user.id} className={`border-b border-gray-100 last:border-0 ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            className="w-32 text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400"
                            value={edit.name}
                            onChange={e => setEditField(user.id, 'name', e.target.value)}
                          />
                        ) : (
                          <span className="text-gray-800">{user.name || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{user.email}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 bg-white"
                            value={edit.department}
                            onChange={e => setEditField(user.id, 'department', e.target.value)}
                          >
                            <option value="-">-</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full ${user.department && user.department !== '-' ? 'bg-blue-100 text-blue-700' : 'text-gray-400'}`}>
                            {user.department || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 bg-white"
                            value={edit.team}
                            onChange={e => setEditField(user.id, 'team', e.target.value)}
                            disabled={!availableTeams.length}
                          >
                            <option value="-">-</option>
                            {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : (
                          <span className="text-gray-600">{user.team || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400 bg-white"
                            value={edit.role}
                            onChange={e => setEditField(user.id, 'role', e.target.value)}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-1 rounded-full ${user.role === '관리자' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                            {user.role || '직원'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(user.id)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => cancelEdit(user.id)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(user)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              수정
                            </button>
                          )}
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
    </div>
  );
}
