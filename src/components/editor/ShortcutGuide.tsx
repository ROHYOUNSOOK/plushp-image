'use client';


import { useState } from 'react';

const SHORTCUTS = [
  { keys: 'Ctrl + Z', desc: '실행 취소' },
  { keys: 'Ctrl + Shift + Z', desc: '다시 실행' },
  { keys: 'Delete / Backspace', desc: '선택 레이어 삭제' },
  { keys: 'Ctrl + C', desc: '레이어 복사' },
  { keys: 'Ctrl + V', desc: '레이어 붙여넣기' },
  { keys: 'Ctrl + D', desc: '레이어 복제' },
  { keys: 'Ctrl + G', desc: '가이드라인 토글' },
  { keys: '↑ ↓ ← →', desc: '1px 이동' },
  { keys: 'Shift + 화살표', desc: '10px 이동' },
  { keys: 'Ctrl + A', desc: '전체 레이어 선택' },
  { keys: 'Shift + Click', desc: '레이어 다중 선택' },
  { keys: 'Space + 드래그', desc: '캔버스 패닝' },
  { keys: 'Ctrl + 휠', desc: '캔버스 줌' },
  { keys: 'Ctrl + 0', desc: '줌 초기화' },
  { keys: 'F', desc: '프레임 이미지 편집 모드' },
  { keys: 'Esc', desc: '편집 취소 / 선택 해제' },
  { keys: 'Enter / 더블클릭', desc: '텍스트 인라인 편집' },
];

export default function ShortcutGuide() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="px-2 py-1 rounded hover:bg-gray-600 text-white text-sm"
        title="단축키 안내"
      >
        ⌨ 단축키
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          {/* 배경 오버레이 */}
          <div className="absolute inset-0 bg-black/40" />

          {/* 패널 */}
          <div
            className="relative bg-white rounded-lg shadow-2xl w-80 max-h-[80vh] overflow-y-auto p-4 z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm text-gray-800">단축키 안내</span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <table className="w-full text-xs">
              <tbody>
                {SHORTCUTS.map(({ keys, desc }) => (
                  <tr key={keys} className="border-b border-gray-100 last:border-0">
                    <td className="py-1.5 pr-3 font-mono text-blue-700 whitespace-nowrap">{keys}</td>
                    <td className="py-1.5 text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
