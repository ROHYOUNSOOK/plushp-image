'use client';

import { useState, useEffect } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { type ScheduleRow } from '@/lib/supabase';
import { usePlanForm } from '@/hooks/usePlanForm';
import { type UserPermissions } from '@/hooks/useUserPermissions';

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
  image_notes: ['', '', '', ''],
  doctors: [''],
  doctor_specialty: '',
  doctors2: [] as string[],       // 두 번째 원장님 페이지 (비어있으면 미생성)
  doctor_specialty2: '',
};

export default function PlanForm({ row, allDoctors, blogAccounts, permissions, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // 어느 원장님 페이지(그룹)의 몇 번째 입력에서 드롭다운이 열렸는지
  const [activeDoctor, setActiveDoctor] = useState<{ group: 1 | 2; idx: number } | null>(null);
  const [myName, setMyName] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const { handleSave, handleDelete, handleRevision } = usePlanForm(row, allDoctors, onSaved);

  const readOnly = !permissions.canEditPlans;
  const canDelete = permissions.canDeletePlans;

  // 업무배분에서 넘어온 경우, 그때 선택돼 있던 업로드 날짜 필터를 그대로 들고 돌아간다.
  const fromDate = searchParams.get('date');
  const assignHref = fromDate
    ? `/admin/users?tab=업무배분&date=${encodeURIComponent(fromDate)}`
    : '/admin/users?tab=업무배분';

  // 역할별 이동 버튼: 마케터 → 내 업무 / 관리자 → 업무 배분 / 디자이너 → 비활성(뷰어)
  const navTarget = permissions.isAdmin
    ? { label: '업무 배분으로 →', href: assignHref }
    : permissions.isMarketer
      ? { label: '내 업무로 →', href: '/my-tasks-marketer' }
      : null;

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from('users')
        .select('name')
        .eq('id', data.user.id)
        .single()
        .then(({ data: userData }) => {
          if (userData?.name) setMyName(userData.name);
        });
    });
  }, []);

  useEffect(() => {
    if (row) {
      setForm({
        marketer: row.marketer ?? '',
        date: row.date ?? '',
        account_id: row.account_id ?? '',
        keyword: row.keyword ?? '',
        texts: row.texts?.length ? [...row.texts] : ['', '', '', ''],
        image_notes: row.image_notes?.length ? [...row.image_notes] : Array(row.texts?.length || 4).fill(''),
        doctors: row.doctors?.length ? row.doctors : [''],
        doctor_specialty: row.doctor_specialty ?? '',
        doctors2: row.doctors2?.length ? [...row.doctors2] : [],
        doctor_specialty2: row.doctor_specialty2 ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM, marketer: myName });
    }
    setSuggestions([]);
    setActiveDoctor(null);
  }, [row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When user name loads after form init, fill marketer if still empty
  useEffect(() => {
    if (!row && myName) {
      setForm(f => f.marketer ? f : { ...f, marketer: myName });
    }
  }, [myName, row]);

  const setField = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const setTextAt = (i: number, v: string) => {
    setForm(f => { const texts = [...f.texts]; texts[i] = v; return { ...f, texts }; });
  };
  const setNoteAt = (i: number, v: string) => {
    setForm(f => { const image_notes = [...f.image_notes]; image_notes[i] = v; return { ...f, image_notes }; });
  };
  const addText = () => setForm(f => ({ ...f, texts: [...f.texts, ''], image_notes: [...f.image_notes, ''] }));
  const removeText = (i: number) => setForm(f => ({
    ...f,
    texts: f.texts.filter((_, idx) => idx !== i),
    image_notes: f.image_notes.filter((_, idx) => idx !== i),
  }));

  const doctorKey = (group: 1 | 2) => (group === 1 ? 'doctors' : 'doctors2') as 'doctors' | 'doctors2';

  const setDoctorAt = (group: 1 | 2, i: number, v: string) => {
    const key = doctorKey(group);
    setForm(f => { const arr = [...f[key]]; arr[i] = v; return { ...f, [key]: arr }; });
    const filtered = v.trim()
      ? allDoctors.filter(d => d.doctor_name.includes(v.trim())).map(d => d.doctor_name)
      : allDoctors.map(d => d.doctor_name);
    setSuggestions(filtered);
    setActiveDoctor({ group, idx: i });
  };

  const openDoctorDropdown = (group: 1 | 2, i: number) => {
    setSuggestions(allDoctors.map(d => d.doctor_name));
    setActiveDoctor({ group, idx: i });
  };

  const pickSuggestion = (name: string) => {
    if (activeDoctor) {
      const key = doctorKey(activeDoctor.group);
      const idx = activeDoctor.idx;
      setForm(f => { const arr = [...f[key]]; arr[idx] = name; return { ...f, [key]: arr }; });
    }
    setSuggestions([]);
    setActiveDoctor(null);
  };

  const addDoctor = (group: 1 | 2) => {
    const key = doctorKey(group);
    setForm(f => ({ ...f, [key]: [...f[key], ''] }));
  };
  const removeDoctor = (group: 1 | 2, i: number) => {
    const key = doctorKey(group);
    setForm(f => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }));
  };

  // 두 번째 원장님 페이지 추가/삭제 (빈 배열이면 페이지 미생성)
  const addDoctorPage = () => setForm(f => ({ ...f, doctors2: [''], doctor_specialty2: '' }));
  const removeDoctorPage = () => setForm(f => ({ ...f, doctors2: [], doctor_specialty2: '' }));

  // 원장님 페이지 블록 (그룹 1/2 공통 렌더)
  const renderDoctorBlock = (
    group: 1 | 2,
    doctorsArr: string[],
    specialty: string,
    pageNumber: number,
    onRemovePage?: () => void,
  ) => (
    <div className="mt-4 rounded-lg border-l-4 border-[#1450a0] bg-[#f4f7fc] px-3 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[11px] font-medium text-gray-300 w-4 shrink-0 text-right">{pageNumber}</span>
        <span className="text-xs font-semibold text-[#1450a0]">원장님 페이지</span>
        {!readOnly && onRemovePage && (
          <button
            onClick={onRemovePage}
            className="ml-auto text-[11px] text-gray-400 hover:text-red-400 transition-colors"
          >페이지 삭제</button>
        )}
      </div>

      <div className="ml-6 space-y-2.5">
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">원장님 페이지 제목</label>
          <Input
            value={specialty}
            onChange={v => setField(group === 1 ? 'doctor_specialty' : 'doctor_specialty2', v)}
            placeholder="ex. 정형외과 전문의 진료"
            disabled={readOnly}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">원장님</label>
          <div className="space-y-2">
            {doctorsArr.map((d, i) => (
              <div key={i} className="flex items-center gap-2 relative">
                <div className="flex-1 min-w-0 relative">
                  <input
                    className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1450a0] focus:ring-2 focus:ring-[#1450a0/10] transition placeholder:text-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
                    value={d}
                    onChange={e => setDoctorAt(group, i, e.target.value)}
                    onFocus={() => !readOnly && openDoctorDropdown(group, i)}
                    onBlur={() => setTimeout(() => { setSuggestions([]); setActiveDoctor(null); }, 150)}
                    placeholder="이름 입력 또는 선택"
                    disabled={readOnly}
                  />
                  {!readOnly && activeDoctor?.group === group && activeDoctor?.idx === i && suggestions.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto max-h-48">
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
                    onClick={() => removeDoctor(group, i)}
                    className={`shrink-0 w-5 text-base leading-none transition-colors ${doctorsArr.length > 1 ? 'text-gray-300 hover:text-red-400' : 'invisible'}`}
                  >×</button>
                )}
              </div>
            ))}
            {!readOnly && doctorsArr.length < 5 && (
              <button onClick={() => addDoctor(group)} className="mt-1 text-xs text-[#1450a0] hover:text-[#1045a0] transition-colors">
                + 원장님 추가
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

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
            className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            삭제
          </button>
        )}
      </div>

      {readOnly && (
        <div className="flex items-center gap-2 px-6 py-2 bg-gray-100 border-b border-gray-200">
          <span className="text-xs text-gray-500">🔒 조회 모드 — 수정 권한이 없습니다</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-2xl mx-auto space-y-5">

          <Section title="기본 정보">
            <div className="grid grid-cols-2 gap-3">
              <Field label="마케터">
                <Input value={form.marketer} onChange={v => setField('marketer', v)} placeholder="홍길동" disabled={readOnly || !permissions.isAdmin} />
              </Field>
              <Field label="업로드 날짜">
                <input
                  type="date"
                  className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1450a0] transition disabled:bg-gray-50 disabled:text-gray-500 [color-scheme:light]"
                  value={form.date}
                  onChange={e => setField('date', e.target.value)}
                  disabled={readOnly}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="블로그 아이디">
                <CustomSelect
                  className="w-full text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white transition"
                  value={form.account_id}
                  onChange={v => setField('account_id', v)}
                  disabled={readOnly}
                  placeholder="선택"
                  options={[{ value: '', label: '선택' }, ...blogAccounts.map(id => ({ value: id, label: id }))]}
                />
              </Field>
              <Field label="키워드">
                <Input value={form.keyword} onChange={v => setField('keyword', v)} placeholder="ex. 동춘동정형외과" disabled={readOnly} />
              </Field>
            </div>
          </Section>

          <div className="relative">
          {/* 넓은 화면: 왼쪽 여백 안내 문구 */}
          <aside className="hidden xl:block absolute right-full mr-6 top-0 w-56">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] text-amber-700 leading-relaxed">
              <p className="font-semibold mb-1.5">📌 안내</p>
              <p>※ 원장님 페이지 · 의료법 페이지는 <b>자동 생성</b>됩니다. 따로 추가하지 마세요.</p>
              <p className="mt-2">페이지 구성 오른쪽 <b>×</b> 버튼으로 페이지 삭제가 가능합니다.</p>
            </div>
          </aside>
          <Section title="페이지 구성">
            <div className="grid grid-cols-2 gap-2 mb-1.5 ml-6 mr-7">
              <span className="text-[10px] font-medium text-gray-400 text-center">문구</span>
              <span className="text-[10px] font-medium text-orange-400 text-center">이미지 요청</span>
            </div>
            <div className="space-y-2">
              {form.texts.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
                  <input
                    className="flex-1 text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-[#1450a0] transition placeholder:text-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
                    value={t}
                    onChange={e => setTextAt(i, e.target.value)}
                    placeholder={`문구 ${i + 1}`}
                    disabled={readOnly}
                  />
                  <input
                    className="flex-1 text-sm text-gray-900 border border-orange-200 rounded-lg px-3 py-2 bg-orange-50 outline-none focus:border-orange-400 transition placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
                    value={form.image_notes[i] ?? ''}
                    onChange={e => setNoteAt(i, e.target.value)}
                    placeholder="이미지 요청사항"
                    disabled={readOnly}
                  />
                  {!readOnly && form.texts.length > 1 && (
                    <button onClick={() => removeText(i)} className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none w-5 shrink-0">×</button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <button onClick={addText} className="ml-6 mt-1 text-xs text-[#1450a0] hover:text-[#1045a0] transition-colors">
                  + 페이지 추가
                </button>
              )}
            </div>

            {/* 원장님 페이지 (별도 블록 — 페이지 추가 로직과 무관) */}
            {renderDoctorBlock(1, form.doctors, form.doctor_specialty, form.texts.length + 1)}

            {/* 두 번째 원장님 페이지 (선택) */}
            {form.doctors2.length > 0
              ? renderDoctorBlock(2, form.doctors2, form.doctor_specialty2, form.texts.length + 2, removeDoctorPage)
              : (!readOnly && (
                  <button
                    onClick={addDoctorPage}
                    className="mt-3 ml-6 text-xs text-[#1450a0] hover:text-[#1045a0] transition-colors"
                  >
                    + 원장님 페이지 추가
                  </button>
                ))}
          </Section>
          </div>

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
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-40 transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        )}
        {navTarget && (
          <button
            onClick={() => router.push(navTarget.href)}
            className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-[#1450a0] text-white hover:bg-[#1045a0] transition-colors"
          >
            {navTarget.label}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
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
