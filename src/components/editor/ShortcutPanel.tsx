'use client';


import { useRef, useState } from 'react';

const SHORTCUTS = [
  { keys: 'Ctrl + Z', desc: '실행 취소' },
  { keys: 'Ctrl + Shift + Z', desc: '다시 실행' },
  { keys: 'Delete / Backspace', desc: '선택 레이어 삭제' },
  { keys: 'Ctrl + C', desc: '복사' },
  { keys: 'Ctrl + V', desc: '붙여넣기' },
  { keys: 'Ctrl + D', desc: '복제' },
  { keys: 'Ctrl + G', desc: '가이드라인 토글' },
  { keys: 'Ctrl + A', desc: '전체 선택' },
  { keys: 'Ctrl + 0', desc: '줌 초기화' },
  { keys: '↑ ↓ ← →', desc: '1px 이동' },
  { keys: 'Shift + 화살표', desc: '10px 이동' },
  { keys: 'Shift + Click', desc: '다중 선택' },
  { keys: 'Space + 드래그', desc: '캔버스 이동' },
  { keys: 'Ctrl + 휠', desc: '캔버스 확대/축소' },
  { keys: 'F', desc: '프레임 내부 이미지 편집' },
  { keys: 'Esc', desc: '선택 해제' },
  { keys: 'Enter / 더블클릭', desc: '텍스트 편집' },
];

export default function ShortcutPanel() {
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const [collapsed, setCollapsed] = useState(false);

  const dragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging.current = true;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...pos };
    e.preventDefault();

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: startPos.current.x + (me.clientX - startMouse.current.x),
        y: startPos.current.y + (me.clientY - startMouse.current.y),
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      style={{ position: 'absolute', left: pos.x, top: pos.y, zIndex: 40 }}
      onMouseDown={onMouseDown}
      className="bg-white/90 border border-gray-200 rounded-lg shadow-md select-none cursor-move min-w-[220px]"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
        <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">단축키</span>
        <button
          onClick={() => setCollapsed(v => !v)}
          className="text-gray-400 hover:text-gray-700 text-xs px-1 leading-none transition-colors cursor-pointer"
          title={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {/* 단축키 목록 */}
      {!collapsed && (
        <div className="px-3 py-2 space-y-1">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={keys} className="flex gap-2 items-baseline">
              <span className="font-mono text-blue-500 whitespace-nowrap text-[10px] w-36 shrink-0">{keys}</span>
              <span className="text-gray-500 text-[10px]">{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
