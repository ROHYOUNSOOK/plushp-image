'use client';

import { useState, useEffect } from 'react';
import { type ScheduleRow } from '@/lib/supabase';
import { usePlanForm } from '@/hooks/usePlanForm';
import { type UserPermissions } from '@/hooks/useUserPermissions';
import { useTemplateCheck } from '@/hooks/useTemplateCheck';

interface Props {
  row: ScheduleRow | null;
  allDoctors: { id: string; doctor_name: string; specialty: string; department: string }[];
  blogAccounts: string[];
  permissions: UserPermissions;
  onSaved: (row: ScheduleRow) => void;
  onDeleted: (id: string) => void;
  onCompleted?: (id: string) => void;
}

const EMPTY_FORM = {
  marketer: '',
  date: '',
  account_id: '',
  keyword: '',
  texts: ['', '', '', ''],
  doctors: [''],
  doctor_specialty: '',
};

export default function PlanForm({ row, allDoctors, blogAccounts, permissions, onSaved, onDeleted, onCompleted }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeDoctorIdx, setActiveDoctorIdx] = useState<number | null>(null);

  const { handleSave, navigateToEditor, handleDelete, handleRevision } = usePlanForm(row, allDoctors, onSaved);
  const { hasTemplate, checking } = useTemplateCheck(row);

  const readOnly = !permissions.canEditPlans;
  const canDelete = permissions.canDeletePlans;
  const canGoToEditor = permissions.canAccessEditorWithoutTemplate || hasTemplate;
  const canComplete = permissions.isDesigner && !!row?.id && row.assigned_to === permissions.userId && !row.completed;

  useEffect(() => {
    if (row) {
      setForm({
        marketer: row.marketer ?? '',
        date: row.date ?? '',
        account_id: row.account_id ?? '',
        keyword: row.keyword ?? '',
        texts: row.texts?.length ? [...row.texts] : ['', '', '', ''],
        doctors: row.doctors?.length ? row.doctors : [''],
        doctor_specialty: row.doctor_specialty ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setSuggestions([]);
    setActiveDoctorIdx(null);
  }, [row?.id]);

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const setTextAt = (i: number, v: string) => {
    setForm(f => { const texts = [...f.texts]; texts[i] = v; return { ...f, texts }; });
  };
  const addText = () => setForm(f => ({ ...f, texts: [...f.texts, ''] }));
  const removeText = (i: number) => setForm(f => ({ ...f, texts: f.texts.filter((_, idx) => idx !== i) }));

  const setDoctorAt = (i: number, v: string) => {
    setForm(f => { const doctors = [...f.doctors]; doctors[i] = v; return { ...f, doctors }; });
    if (v.trim()) {
      setSuggestions(allDoctors.filter(d => d.doctor_name.includes(v.trim())).map(d => d.doctor_name).slice(0, 5));
      setActiveDoctorIdx(i);
    } else {
      setSuggestions([]);
      setActiveDoctorIdx(null);
    }
  };

  const pickSuggestion = (name: string) => {
    if (activeDoctorIdx !== null) setDoctorAt(activeDoctorIdx, name);
    setSuggestions([]);
    setActiveDoctorIdx(null);
  };

  const addDoctor = () => setForm(f => ({ ...f, doctors: [...f.doctors, ''] }));
  const removeDoctor = (i: number) => setForm(f => ({ ...f, doctors: f.doctors.filter((_, idx) => idx !== i) }));

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium">
            {readOnly ? '조회' : row ? '편집' : '새 기획안'}
          </p>
          <h2 className="text-base font-semibold text-gray-800 mt-0.5">
            {form.keyword || '제목 없음'}
          </h2>
        </div>
        {row?.id && canDelete && (
          <button
            onClick={async () => {
              const deleted = await handleDelete();
              if (deleted) onDeleted(row.id);
            }}
            disabled={saving}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
          >
            삭제
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-2xl mx-auto space-y-5">

          <Section title="기본 정보">
            <div className="grid grid-cols-2 gap-3">
              <Field label="마케터">
                <Input value={form.marketer} onChange={v => setField('marketer', v)} placeholder="홍길동" disabled={readOnly} />
              </Field>
              <Field label="업로드 날짜">
                <input
                  type="date"
                  className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1450a0] focus:ring-2 focus:ring-[#1450a0/10] transition disabled:bg-gray-50 disabled:text-gray-500"
                  value={form.date}
                  onChange={e => setField('date', e.target.value)}
                  disabled={readOnly}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="블로그 아이디">
                <select
                  className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1450a0] focus:ring-2 focus:ring-[#1450a0/10] transition disabled:bg-gray-50 disabled:text-gray-500"
                  value={form.account_id}
                  onChange={e => setField('account_id', e.target.value)}
                  disabled={readOnly}
                >
                  <option value="">선택</option>
                  {blogAccounts.map(id => <option key={id} value={id}>{id}</option>)}
                </select>
              </Field>
              <Field label="키워드">
                <Input value={form.keyword} onChange={v => setField('keyword', v)} placeholder="ex. 동춘동정형외과" disabled={readOnly} />
              </Field>
            </div>
          </Section>

          <Section title="문구">
            <div className="space-y-2">
              {form.texts.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-[11px] font-medium text-gray-300 w-4 text-right">{i + 1}</span>
                  <input
                    className="flex-1 text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1450a0] focus:ring-2 focus:ring-[#1450a0/10] transition placeholder:text-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
                    value={t}
                    onChange={e => setTextAt(i, e.target.value)}
                    placeholder={`문구 ${i + 1}`}
                    disabled={readOnly}
                  />
                  {!readOnly && form.texts.length > 1 && (
                    <button onClick={() => removeText(i)} className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none w-5">×</button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button onClick={addText} className="ml-6 mt-1 text-xs text-[#1450a0] hover:text-[#1045a0] transition-colors">
                  + 페이지 추가
                </button>
              )}
            </div>
          </Section>

          <Section title="원장님">
            <div className="space-y-2">
              {form.doctors.map((d, i) => (
                <div key={i} className="flex items-center gap-2 relative">
                  <span className="text-[11px] font-medium text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0 relative">
                    <input
                      className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1450a0] focus:ring-2 focus:ring-[#1450a0/10] transition placeholder:text-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
                      value={d}
                      onChange={e => setDoctorAt(i, e.target.value)}
                      placeholder="이름 입력"
                      onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                      disabled={readOnly}
                    />
                    {!readOnly && activeDoctorIdx === i && suggestions.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {suggestions.map(s => (
                          <button
                            key={s}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#e3edf8] border-b border-gray-100 last:border-0"
                            onMouseDown={() => pickSuggestion(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => removeDoctor(i)}
                      className={`shrink-0 w-5 text-base leading-none transition-colors ${form.doctors.length > 1 ? 'text-gray-300 hover:text-red-400' : 'invisible'}`}
                    >×</button>
                  )}
                </div>
              ))}
              {!readOnly && form.doctors.length < 4 && (
                <button onClick={addDoctor} className="ml-6 mt-1 text-xs text-[#1450a0] hover:text-[#1045a0] transition-colors">
                  + 원장님 추가
                </button>
              )}
            </div>
          </Section>

          <Section title="진료과">
            <Input
              value={form.doctor_specialty}
              onChange={v => setField('doctor_specialty', v)}
              placeholder="ex. 정형외과 전문의 진료"
              disabled={readOnly}
            />
          </Section>

        </div>
      </div>

      <div className="px-6 py-4 bg-white border-t border-gray-200 flex gap-2">
        {row?.completed && permissions.canEditPlans ? (
          <button
            onClick={async () => { setSaving(true); await handleRevision(); setSaving(false); }}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-orange-300 bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-40 transition-colors"
          >
            {saving ? '처리 중...' : '수정요청'}
          </button>
        ) : !readOnly && (
          <button
            onClick={async () => { setSaving(true); await handleSave(form); setSaving(false); }}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        )}
        <button
          onClick={async () => { setSaving(true); await navigateToEditor(); setSaving(false); }}
          disabled={saving || checking || !row?.id || !canGoToEditor}
          title={!row?.id ? '먼저 기획안을 저장하세요' : !canGoToEditor ? '디자이너가 아직 템플릿을 저장하지 않았습니다' : ''}
          className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-[#1450a0] text-white hover:bg-[#1045a0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '이동 중...' : checking ? '확인 중...' : '편집기로 →'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1450a0] focus:ring-2 focus:ring-[#1450a0/10] transition placeholder:text-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
