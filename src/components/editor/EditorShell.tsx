'use client';

/* ===========================
   EditorShell — 최상위 3컬럼 레이아웃
=========================== */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import CanvasArea from './CanvasArea';
import PropsPanel from './PropsPanel';
import LayerPanel from './LayerPanel';
import { toast } from './Toast';
import ContextMenu from './ContextMenu';
import { useEditorStore, selectCurrentPage, selectBgKeyColor } from '@/store/editorStore';
import { makeLayer } from '@/lib/layerFactory';
import { downloadCurrentPage, downloadAllAsZip } from '@/canvas/export';
import { saveTemplate, openTemplatePicker, mergeTemplateIntoPage } from '@/lib/templateIO';
import type { LayerType, LogoLayer, BackgroundLayer } from '@/types/layer';
import { getDefaultLogoImage, LOGO_URL, autoLoadLogos } from '@/lib/logoLoader';
import { pickRandomBackground } from '@/lib/backgroundLoader';
import { applyBackgroundImage } from '@/lib/imageUpload';
import { calcAutoFillColor, calcShadowColor } from '@/lib/colorHelpers';

const LAYER_TYPES: { type: LayerType; icon: string; label: string }[] = [
  { type: 'background', icon: '🌄', label: '배경' },
  { type: 'frame', icon: '🖼', label: '프레임' },
  { type: 'image', icon: '🗃', label: '이미지' },
  { type: 'textbox', icon: '📦', label: '텍스트박스' },
  { type: 'text', icon: '✏️', label: '텍스트' },
  { type: 'logo', icon: '🏷', label: '로고' },
  { type: 'doctor-card', icon: '🩺', label: '의사카드' },
];

export default function EditorShell() {
  const { pages, currentPage, addPage, deletePage, switchPage, pushHistory, addLayer, setPages, renamePage, toggleMedicalLaw, setCurrentScheduleRow } = useEditorStore();
  // 앱 초기 마운트 시 로고 자동 로드
  useEffect(() => { autoLoadLogos(); }, []);

  const [editingTab, setEditingTab] = React.useState<{ index: number; value: string } | null>(null);
  const [dlOpen, setDlOpen] = React.useState(false);
  const [tplOpen, setTplOpen] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  /* ── 레이어 패널 리사이즈 ── */
  const [layerPanelW, setLayerPanelW] = useState(224); // 기본 w-56 = 224px
  const layerResizing = useRef(false);
  const layerResizeStartX = useRef(0);
  const layerResizeStartW = useRef(0);

  const onLayerResizerDown = useCallback((e: React.MouseEvent) => {
    layerResizing.current = true;
    layerResizeStartX.current = e.clientX;
    layerResizeStartW.current = layerPanelW;
    e.preventDefault();

    const onMove = (me: MouseEvent) => {
      if (!layerResizing.current) return;
      const next = Math.max(140, Math.min(400, layerResizeStartW.current + (me.clientX - layerResizeStartX.current)));
      setLayerPanelW(next);
    };
    const onUp = () => {
      layerResizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [layerPanelW]);

  const handleAddLayer = async (type: LayerType) => {
    pushHistory();
    const layer = makeLayer(type);
    addLayer(layer);
    toast(`${LAYER_TYPES.find(t => t.type === type)?.label} 추가됨`);

    // 배경 레이어: 랜덤 배경 자동 로드
    if (type === 'background') {
      try {
        const { img, url } = await pickRandomBackground();
        const state = useEditorStore.getState();
        const bgLayer = state.pages[state.currentPage]?.layers.find(l => l.id === layer.id) as BackgroundLayer | undefined;
        if (bgLayer) {
          applyBackgroundImage(bgLayer, img, url, state.pages);
          state.setPages([...state.pages]);
        }
      } catch {
        // 실패 시 빈 배경 유지
      }
    }

    // 로고 레이어: URL에서 자동 이미지 로드
    if (type === 'logo') {
      try {
        const img = await getDefaultLogoImage();
        const aspect = img.naturalWidth / img.naturalHeight;
        const state = useEditorStore.getState();
        const curPage = state.pages[state.currentPage];

        state.updateLayer(layer.id, {
          img,
          url: LOGO_URL,
          h: 86,
          w: Math.round(86 * aspect),
        } as Partial<LogoLayer>);
      } catch {
        toast('로고 이미지 자동 로드 실패 — 직접 업로드하세요');
      }
    }
  };

  // 어디서든 빈 영역 클릭 시 선택 해제
  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // 레이어 아이템, 버튼, input, canvas, 속성패널은 제외
    if (
      target.closest('[data-layer-id]') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('canvas') ||
      target.closest('.props-panel')
    ) return;
    useEditorStore.getState().selectSingle(null);
  };

  return (
    <div className="flex flex-col h-screen" onClick={handleGlobalClick}>
      {/* 상단 툴바 */}
      <div className="flex items-center gap-2 p-2 bg-[#0d8fa8] text-white text-sm">
        <Link
          href="/"
          className="px-2 py-1 rounded text-gray-300 hover:bg-[#1a5cba] hover:text-white transition-colors text-xs"
          title="기획안 페이지로 돌아가기"
        >
          ← 기획안
        </Link>
        <div className="w-px h-5 bg-[#1a5cba]" />
        <span className="font-bold mr-4">Plus 레이어 편집기</span>

        {/* 레이어 추가 버튼 */}
        {LAYER_TYPES.map(({ type, icon, label }) => (
          <button
            key={type}
            onClick={() => handleAddLayer(type)}
            className="px-2 py-1 rounded hover:bg-[#1a5cba] transition-colors"
            title={`${label} 추가`}
          >
            {icon} {label}
          </button>
        ))}

        {/* 구분선 */}
        <div className="w-px h-5 bg-[#1a5cba] mx-1" />

        {/* 단축키 패널 토글 */}
        <button
          onClick={() => setShowShortcuts(v => !v)}
          className={`px-2 py-1 rounded flex items-center gap-1 transition-colors ${
            showShortcuts ? 'bg-[#1a5cba] text-white' : 'hover:bg-[#1a5cba] text-gray-400'
          }`}
          title="단축키 패널 표시/숨기기"
        >
          ⌨ 단축키
        </button>

        {/* 구분선 */}
        <div className="w-px h-5 bg-[#1a5cba] mx-1" />

        {/* 다운로드 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setDlOpen(v => !v)}
            className="px-2 py-1 rounded hover:bg-[#1a5cba] flex items-center gap-1"
          >
            💾 다운로드 ▾
          </button>
          {dlOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDlOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 bg-[#0d8fa8] rounded shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={async () => {
                    setDlOpen(false);
                    const state = useEditorStore.getState();
                    const page = selectCurrentPage(state);
                    const bgKey = selectBgKeyColor(state);
                    if (!page) return;
                    toast('다운로드 중...');
                    await downloadCurrentPage(page, state.pages, bgKey, state.currentPage);
                    toast('다운로드 완료');
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#1a5cba]"
                >
                  현재 페이지
                </button>
                <button
                  onClick={async () => {
                    setDlOpen(false);
                    const state = useEditorStore.getState();
                    const bgKey = selectBgKeyColor(state);
                    toast(`전체 ${state.pages.length}장 ZIP 압축 중...`);
                    await downloadAllAsZip(state.pages, bgKey, state.currentScheduleRow);
                    toast('전체 다운로드 완료');
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#1a5cba]"
                >
                  전체 {pages.length}장
                </button>
              </div>
            </>
          )}
        </div>

        {/* 구분선 */}
        <div className="w-px h-5 bg-[#1a5cba] mx-1" />

        {/* 템플릿 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setTplOpen(v => !v)}
            className="px-2 py-1 rounded hover:bg-[#1a5cba] flex items-center gap-1"
          >
            📋 템플릿 ▾
          </button>
          {tplOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setTplOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 bg-[#0d8fa8] rounded shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={async () => {
                    setTplOpen(false);
                    try {
                      toast('템플릿 저장 중...');
                      const state = useEditorStore.getState();
                      await saveTemplate(state.pages, state.currentScheduleRow);
                      toast('템플릿 저장 완료');
                    } catch {
                      toast('저장 실패');
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#1a5cba]"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setTplOpen(false);
                    openTemplatePicker(
                      (tplPages, savedScheduleRow) => {
                        const state = useEditorStore.getState();
                        pushHistory();
                        const newPages = [...state.pages];
                        tplPages.forEach((tpl, i) => {
                          if (i < newPages.length) {
                            newPages[i] = mergeTemplateIntoPage(newPages[i], tpl);
                          } else {
                            newPages.push(mergeTemplateIntoPage(
                              { id: newPages.length + 1, name: tpl.name || '', layers: [] },
                              tpl
                            ));
                          }
                        });
                        setPages(newPages);
                        if (savedScheduleRow) setCurrentScheduleRow(savedScheduleRow);
                        toast('템플릿 불러오기 완료');
                      },
                      (msg) => toast(msg)
                    );
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#1a5cba]"
                >
                  열기
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* 페이지 탭 */}
      <div className="flex items-center gap-1 p-1 bg-[#1450a0] text-white text-sm">
        {pages.map((page, i) => (
          <div key={i} className="flex items-center">
            {editingTab?.index === i ? (
              <input
                autoFocus
                className="px-2 py-0.5 text-sm rounded-t bg-white text-gray-800 border border-blue-400 outline-none w-28"
                value={editingTab.value}
                onChange={e => setEditingTab(prev => prev ? { ...prev, value: e.target.value } : prev)}
                onBlur={() => {
                  const trimmed = editingTab.value.trim();
                  if (trimmed) renamePage(i, trimmed);
                  setEditingTab(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = editingTab.value.trim();
                    if (trimmed) renamePage(i, trimmed);
                    setEditingTab(null);
                  }
                  if (e.key === 'Escape') setEditingTab(null);
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <button
                onClick={() => switchPage(i)}
                onDoubleClick={e => { e.stopPropagation(); setEditingTab({ index: i, value: page.name || `페이지 ${i + 1}` }); }}
                className={`px-3 py-1 rounded-t text-sm flex items-center gap-1.5 ${
                  i === currentPage ? 'bg-[#1045a0] font-bold' : 'bg-[#1a5cba] hover:bg-[#1045a0]'
                }`}
              >
                {page.isMedicalLaw && <span className="text-amber-400 text-xs">⚖</span>}
                {page.name || `페이지 ${i + 1}`}
              </button>
            )}
            {pages.length > 1 && (
              <button
                onClick={() => { deletePage(i); toast('페이지 삭제됨'); }}
                className="ml-0.5 px-1 text-gray-400 hover:text-red-400 text-xs"
                title="페이지 삭제"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={async () => { addPage(); toast('페이지 추가됨'); await autoLoadLogos(); }}
          className="px-2 py-1 bg-[#1a5cba] hover:bg-[#1a5cba] rounded-t text-sm"
          title="페이지 추가"
        >
          +
        </button>
        <button
          onClick={async () => {
            addPage();
            const newIdx = useEditorStore.getState().pages.length - 1;
            toggleMedicalLaw(newIdx);
            renamePage(newIdx, '의료법');
            toast('의료법 페이지 추가됨');
            await autoLoadLogos();
            // 배경 색상 기반으로 로고 획 색상 동기화
            const state = useEditorStore.getState();
            const bgLayer = state.pages[0]?.layers.find(l => l.type === 'background') as BackgroundLayer | undefined;
            const bgColor = bgLayer?.solidColor ?? '#ffffff';
            state.applySyncColors(calcAutoFillColor(bgColor), calcShadowColor(bgColor));
          }}
          className="px-2 py-1 bg-[#1a5cba] hover:bg-[#1a5cba] rounded-t text-xs text-amber-400 ml-0.5"
          title="의료법 페이지 추가"
        >
          의료법+
        </button>
      </div>

      {/* 메인 영역: 3컬럼 */}
      <div className="flex flex-1 min-h-0">
        {/* 왼쪽: 레이어 목록 */}
        <div style={{ width: layerPanelW, minWidth: layerPanelW }} className="bg-gray-50 overflow-y-auto text-sm flex-shrink-0">
          <LayerPanel />
        </div>

        {/* 레이어 패널 리사이저 */}
        <div
          onMouseDown={onLayerResizerDown}
          className="relative w-3 bg-gray-100 hover:bg-blue-100 active:bg-blue-200 cursor-col-resize flex-shrink-0 transition-colors group border-x border-gray-200"
          title="드래그하여 너비 조절"
        >
          {/* 중앙 그립 점 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[3px] pointer-events-none">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-[3px] h-[3px] rounded-full bg-gray-400 group-hover:bg-blue-500 transition-colors" />
            ))}
          </div>
        </div>

        {/* 중앙: 캔버스 */}
        <CanvasArea showShortcuts={showShortcuts} />

        {/* 오른쪽: 속성 패널 */}
        <div className="props-panel w-72 bg-gray-50 border-l overflow-y-auto text-sm">
          <PropsPanel />
        </div>
      </div>

      {/* 컨텍스트 메뉴 */}
      <ContextMenu />
    </div>
  );
}
