'use client';


import { useState, useRef } from 'react';
import { useEditorStore, selectCurrentPage } from '@/store/editorStore';
import { LAYER_ICONS } from '@/types/constants';
import type { Layer, LayerType } from '@/types/layer';
import { toast } from './Toast';
import SchedulePanel from './SchedulePanel';

type EditingState = { id: string; value: string } | null;

export default function LayerPanel() {
  const selectedLayerIds = useEditorStore(s => s.selectedLayerIds);
  const editorReadOnly = useEditorStore(s => s.editorReadOnly);
  const page = useEditorStore(selectCurrentPage);
  const layers = page?.layers ?? [];

  const { selectSingle, selectToggle, toggleVisible, toggleLocked, removeLayer, reorderLayer, reorderLayers, pushHistory, addLayer, groupLayers, ungroupLayers } = useEditorStore();

  const lastClickedId = useRef<string | null>(null);

  // 인라인 이름 편집 상태
  const [editing, setEditing] = useState<EditingState>(null);

  // 드래그 순서변경 상태
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const dragSrcIdx = useRef<number | null>(null);

  /* ── 클릭 선택 ── */
  const handleClick = (id: string, e: React.MouseEvent) => {
    const clickedLayer = layers.find(l => l.id === id);
    if (e.shiftKey && lastClickedId.current) {
      const from = layers.findIndex(l => l.id === lastClickedId.current);
      const to = layers.findIndex(l => l.id === id);
      if (from >= 0 && to >= 0) {
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        const ids = layers.slice(lo, hi + 1).map(l => l.id);
        const store = useEditorStore.getState();
        store.selectSingle(ids[0]);
        ids.slice(1).forEach(rid => store.selectToggle(rid));
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      selectToggle(id);
    } else if (clickedLayer?.groupId) {
      // 그룹 레이어 클릭 → 같은 그룹 전체 선택
      const members = layers.filter(l => l.groupId === clickedLayer.groupId);
      selectSingle(members[0].id);
      members.slice(1).forEach(m => selectToggle(m.id));
    } else {
      selectSingle(id);
    }
    const canvas = document.querySelector('canvas');
    if (canvas) (canvas as HTMLElement).focus();
    lastClickedId.current = id;
  };

  /* ── 드래그 순서변경 ── */
  const onDragStart = (e: React.DragEvent, realIdx: number) => {
    dragSrcIdx.current = realIdx;
    setIsDraggingActive(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(realIdx));
  };

  const onDragOver = (e: React.DragEvent, realIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(realIdx);
  };

  const onDrop = (e: React.DragEvent, targetRealIdx: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    const fromIdx = dragSrcIdx.current;
    dragSrcIdx.current = null;
    if (fromIdx === null) return;

    // 드래그한 레이어가 다중 선택에 포함되어 있으면 선택된 전체를 이동
    const draggedId = layers[fromIdx]?.id;
    const selIdxs = selectedLayerIds
      .map(id => layers.findIndex(l => l.id === id))
      .filter(i => i >= 0);

    const isMulti = draggedId && selectedLayerIds.includes(draggedId) && selIdxs.length > 1;

    if (isMulti) {
      pushHistory();
      reorderLayers(selIdxs, targetRealIdx);
    } else {
      if (fromIdx === targetRealIdx) return;
      pushHistory();
      reorderLayer(fromIdx, targetRealIdx);
    }
    toast('레이어 순서 변경');
  };

  const onDragEnd = () => {
    dragSrcIdx.current = null;
    setDragOverIdx(null);
    setIsDraggingActive(false);
  };

  const startEdit = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing({ id, value: name });
  };

  const commitEdit = () => {
    if (!editing) return;
    const trimmed = editing.value.trim();
    if (trimmed) {
      useEditorStore.getState().updateLayer(editing.id, { name: trimmed });
    }
    setEditing(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { setEditing(null); }
  };

  const handleDuplicate = (layer: Layer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (layer.type === 'background') return;
    pushHistory();
    const copy = JSON.parse(JSON.stringify(layer)) as Layer;
    copy.id = `l${Date.now()}_dup`;
    copy.name = `${layer.name} 복사`;
    if ('x' in copy) (copy as { x: number }).x += 20;
    if ('y' in copy) (copy as { y: number }).y += 20;
    if ('img' in layer && layer.img) {
      (copy as { img: HTMLImageElement | null }).img = (layer as { img: HTMLImageElement }).img;
    }
    addLayer(copy);
    selectSingle(copy.id);
    toast('레이어 복제됨');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    pushHistory();
    removeLayer(id);
    toast('레이어 삭제됨');
  };

  // 역순 (최상단 레이어가 목록 맨 위)
  const reversed = [...layers].map((l, i) => ({ layer: l, idx: i })).reverse();

  if (editorReadOnly) {
    return (
      <div className="select-none">
        <SchedulePanel />
        <div className="p-3 text-[11px] text-gray-400 leading-relaxed">
          🔒 읽기 전용 모드입니다.<br />레이어 편집은 비활성화됩니다.
        </div>
      </div>
    );
  }

  return (
    <div className="select-none">
      <SchedulePanel />
      <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-xs text-gray-500">레이어 ({layers.length})</span>
        {(() => {
          const selLayers = selectedLayerIds.map(id => layers.find(l => l.id === id)).filter(Boolean);
          const groupIds = [...new Set(selLayers.map(l => l?.groupId).filter(Boolean))];
          const allSameGroup = selLayers.length >= 2 && groupIds.length === 1 && selLayers.every(l => l?.groupId === groupIds[0]);
          const anyGrouped = selLayers.length >= 1 && selLayers.some(l => l?.groupId);

          if (allSameGroup) {
            return (
              <button
                onClick={() => {
                  const members = layers.filter(l => l.groupId === groupIds[0]).map(l => l.id);
                  pushHistory();
                  ungroupLayers(members);
                  toast('그룹 해제됨');
                }}
                className="text-xs text-orange-600 hover:text-orange-800 px-1.5 py-0.5 rounded border border-orange-300 hover:bg-orange-50"
                title="그룹 해제 (Ctrl+Shift+G)"
              >
                🔓 그룹 해제
              </button>
            );
          }
          if (selectedLayerIds.length >= 2 && !anyGrouped) {
            return (
              <button
                onClick={() => {
                  pushHistory();
                  groupLayers(selectedLayerIds);
                  toast(`${selectedLayerIds.length}개 그룹화됨`);
                }}
                className="text-xs text-purple-600 hover:text-purple-800 px-1.5 py-0.5 rounded border border-purple-300 hover:bg-purple-50"
                title="그룹화 (Ctrl+G)"
              >
                🔗 그룹화
              </button>
            );
          }
          return null;
        })()}
      </div>

      {reversed.length === 0 && (
        <div className="text-gray-400 text-xs">레이어가 없습니다</div>
      )}

      {reversed.map(({ layer, idx }) => {
        const isSelected = selectedLayerIds.includes(layer.id);
        const icon = LAYER_ICONS[layer.type as LayerType] || '📄';
        const isDragOver = dragOverIdx === idx;
        const isDragging = isDraggingActive && isSelected && dragSrcIdx.current !== null && selectedLayerIds.includes(layers[dragSrcIdx.current]?.id ?? '');
        const isGrouped = !!layer.groupId;

        return (
          <div
            key={layer.id}
            data-layer-id={layer.id}
            draggable
            onDragStart={e => onDragStart(e, idx)}
            onDragOver={e => onDragOver(e, idx)}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={e => onDrop(e, idx)}
            onDragEnd={onDragEnd}
            onClick={e => handleClick(layer.id, e)}
            className={`flex items-center gap-1 px-1.5 py-1 rounded mb-0.5 cursor-pointer text-xs group
              ${isSelected ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}
              ${layer.locked ? 'opacity-60' : ''}
              ${isDragging ? 'opacity-40' : ''}
              ${isDragOver ? 'border-t-2 border-blue-400' : ''}
              ${isGrouped ? 'border-l-2 border-purple-400 pl-2' : ''}`}
          >
            <span className="w-4 text-center text-gray-300 shrink-0 cursor-grab">⠿</span>
            <span className="w-5 text-center shrink-0">{isGrouped ? '🔗' : icon}</span>
            {editing?.id === layer.id ? (
              <input
                autoFocus
                className="flex-1 text-xs px-0.5 border border-blue-400 rounded outline-none bg-white text-gray-800 min-w-0"
                value={editing.value}
                onChange={e => setEditing(prev => prev ? { ...prev, value: e.target.value } : prev)}
                onBlur={commitEdit}
                onKeyDown={handleEditKeyDown}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className={`flex-1 truncate ${!layer.visible ? 'line-through text-gray-400' : ''}`}
                onDoubleClick={e => startEdit(layer.id, layer.name, e)}
              >
                {layer.name}
              </span>
            )}

            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
              {isGrouped && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    const members = layers.filter(l => l.groupId === layer.groupId).map(l => l.id);
                    pushHistory();
                    ungroupLayers(members);
                    toast('그룹 해제됨');
                  }}
                  className="px-1 text-purple-400 hover:text-purple-700" title="그룹 해제">
                  🔓
                </button>
              )}
              <button onClick={e => { e.stopPropagation(); toggleVisible(layer.id); }}
                className="px-1 text-gray-400 hover:text-gray-700" title={layer.visible ? '숨기기' : '보이기'}>
                {layer.visible ? '👁' : '🚫'}
              </button>
              <button onClick={e => { e.stopPropagation(); toggleLocked(layer.id); }}
                className="px-1 text-gray-400 hover:text-gray-700" title={layer.locked ? '잠금 해제' : '잠금'}>
                {layer.locked ? '🔒' : '🔓'}
              </button>
              {layer.type !== 'background' && (
                <button onClick={e => handleDuplicate(layer, e)}
                  className="px-1 text-gray-400 hover:text-blue-500" title="복제">
                  ⧉
                </button>
              )}
              <button onClick={e => handleDelete(layer.id, e)}
                className="px-1 text-gray-400 hover:text-red-500" title="삭제">
                ✕
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
