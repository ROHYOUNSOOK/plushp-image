'use client';

/* ===========================
   EditorShell — 최상위 3컬럼 레이아웃
=========================== */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import CanvasArea from './CanvasArea';
import PropsPanel from './PropsPanel';
import LayerPanel from './LayerPanel';
import { toast, hideToast } from './Toast';
import Toast from './Toast';
import ContextMenu from './ContextMenu';
import { useEditorStore, selectCurrentPage, selectBgKeyColor } from '@/store/editorStore';
import { makeLayer } from '@/lib/layerFactory';
import { downloadCurrentPage, downloadAllAsZip } from '@/canvas/export';
import { saveTemplate, openTemplatePicker, mergeTemplateIntoPage, saveCloudTemplate, loadCloudTemplate, listCloudTemplates, type TemplatePage } from '@/lib/templateIO';
import { loadScheduleInnerImages, supabase } from '@/lib/supabase';
import { buildScheduleFolderName } from '@/hooks/useScheduleApplication';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import type { FrameLayer } from '@/types/layer';
import { applyFrameImage } from '@/lib/imageUpload';
import type { LayerType, LogoLayer, BackgroundLayer } from '@/types/layer';
import { getDefaultLogoImage, LOGO_URL, autoLoadLogos } from '@/lib/logoLoader';
import { pickRandomBackground } from '@/lib/backgroundLoader';
import { applyBackgroundImage } from '@/lib/imageUpload';
import { calcAutoFillColor, calcShadowColor } from '@/lib/colorHelpers';
import ImageNotePopup from './ImageNotePopup';

const LAYER_TYPES: { type: LayerType; icon: string; label: string }[] = [
  { type: 'background', icon: '🌄', label: '배경' },
  { type: 'frame', icon: '🖼', label: '프레임' },
  { type: 'image', icon: '🗃', label: '이미지' },
  { type: 'textbox', icon: '📦', label: '텍스트박스' },
  { type: 'text', icon: '✏️', label: '텍스트' },
  { type: 'logo', icon: '🏷', label: '로고' },
  { type: 'doctor-card', icon: '🩺', label: '의사카드' },
];

/** 템플릿 로드 후 스케줄 폴더에서 페이지별 이미지를 프레임에 적용 */
async function applyScheduleImagesToPages(
  pages: TemplatePage[],
  scheduleRow: Record<string, unknown> | null,
): Promise<TemplatePage[]> {
  if (!scheduleRow) return pages;
  try {
    const folderName = buildScheduleFolderName(scheduleRow as unknown as Parameters<typeof buildScheduleFolderName>[0]);
    const textPages = pages.filter(pg => !pg.isMedicalLaw && pg.name !== '원장님');
    if (!textPages.length) return pages;
    const innerImages = await loadScheduleInnerImages(folderName, textPages.length);
    const updatedPages = pages.map(pg => {
      const textIdx = textPages.indexOf(pg);
      if (textIdx < 0) return pg;
      const inner = innerImages[textIdx];
      if (!inner?.img) return pg;
      return {
        ...pg,
        layers: pg.layers.map(l => {
          if (l.type !== 'frame') return l;
          const fr = l as FrameLayer;
          // 템플릿에 저장된 scale/offset 보존, img/url만 교체
          return { ...fr, img: inner.img!, url: inner.url ?? '' };
        }),
      };
    });
    return updatedPages as TemplatePage[];
  } catch {
    return pages;
  }
}

export default function EditorShell() {
  const { pages, currentPage, addPage, deletePage, switchPage, pushHistory, addLayer, setPages, renamePage, toggleMedicalLaw, setCurrentScheduleRow } = useEditorStore();
  // 앱 초기 마운트 시 로고 자동 로드
  useEffect(() => { autoLoadLogos(); }, []);

  const [editingTab, setEditingTab] = React.useState<{ index: number; value: string } | null>(null);
  const [dlOpen, setDlOpen] = React.useState(false);
  const [tplOpen, setTplOpen] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);
  const permissions = useUserPermissions();
  const currentScheduleRow = useEditorStore(s => s.currentScheduleRow);

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
      <ImageNotePopup />
      {/* 상단 툴바 */}
      <div className="flex items-center gap-2 p-2 bg-[#0d8fa8] text-white text-sm">
        <Link
          href="/plan"
          className="text-xs px-3 py-1.5 rounded-lg border border-white/40 text-white hover:bg-white/10 transition-colors"
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
                  내 PC에 저장
                </button>
                <button
                  onClick={() => {
                    setTplOpen(false);
                    openTemplatePicker(
                      async (tplPages, savedScheduleRow) => {
                        const state = useEditorStore.getState();
                        pushHistory();
                        toast('템플릿 불러오는 중...', 0);
                        const pagesWithImages = await applyScheduleImagesToPages(tplPages, savedScheduleRow);
                        const newPages = [...state.pages];
                        pagesWithImages.forEach((tpl, i) => {
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
                        const curBg = newPages[0]?.layers.find(l => l.type === 'background') as { solidColor?: string } | undefined;
                        const curBgColor = curBg?.solidColor ?? '#ffffff';
                        useEditorStore.getState().applySyncColors(calcAutoFillColor(curBgColor), calcShadowColor(curBgColor));
                        hideToast();
                        toast('템플릿 불러오기 완료');
                        autoLoadLogos();
                      },
                      (msg) => toast(msg)
                    );
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#1a5cba]"
                >
                  내 PC에서 열기
                </button>
                <div className="border-t border-[#1a5cba]" />
                <button
                  onClick={async () => {
                    setTplOpen(false);
                    try {
                      const state = useEditorStore.getState();
                      const row = state.currentScheduleRow;
                      if (row) {
                        const date = (row.date as string) ?? '';
                        const yy = date.slice(2, 4), mm = date.slice(5, 7), dd = date.slice(8, 10);
                        const folderName = [yy + mm + dd, row.account_id, row.keyword].filter(Boolean).join('_');
                        const checkRes = await fetch('/api/check-template', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ folderName }),
                        }).catch(() => null);
                        const exists = checkRes?.ok ? (await checkRes.json()).exists : false;
                        if (exists && !confirm(`"${folderName}" 템플릿이 이미 존재합니다.\n덮어쓰시겠습니까?`)) return;
                      }
                      toast('클라우드 저장 중...');
                      await saveCloudTemplate(state.pages, row);
                      toast('클라우드 저장 완료');
                    } catch {
                      toast('클라우드 저장 실패');
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#1a5cba]"
                >
                  ☁ 클라우드 저장
                </button>
                <button
                  onClick={async () => {
                    setTplOpen(false);
                    try {
                      const { currentScheduleRow: sr } = useEditorStore.getState();
                      if (!sr) { toast('스케줄을 먼저 적용해주세요'); return; }
                      const date = (sr.date as string) ?? '';
                      const yy = date.slice(2, 4), mm = date.slice(5, 7), dd = date.slice(8, 10);
                      const currentFolder = [yy + mm + dd, sr.account_id, sr.keyword].filter(Boolean).join('_');
                      toast('템플릿 목록 불러오는 중...');
                      const allFolders = await listCloudTemplates();
                      const matched = allFolders.filter(f => f === currentFolder);
                      if (!matched.length) { toast('저장된 템플릿 없음'); return; }
                      const folder = matched.length === 1
                        ? matched[0]
                        : window.prompt(
                            `불러올 템플릿 선택:\n${matched.map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
                            matched[0]
                          );
                      if (!folder) return;
                      toast('클라우드에서 불러오는 중...', 0);
                      const { pages: tplPages, scheduleRow: savedScheduleRow } = await loadCloudTemplate(folder);
                      const state = useEditorStore.getState();
                      const curBg = state.pages[0]?.layers.find(l => l.type === 'background') as { solidColor?: string } | undefined;
                      const curBgColor = curBg?.solidColor ?? '#ffffff';
                      const pagesWithImages = await applyScheduleImagesToPages(tplPages, savedScheduleRow);
                      pushHistory();
                      const newPages = [...state.pages];
                      pagesWithImages.forEach((tpl, i) => {
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
                      useEditorStore.getState().applySyncColors(calcAutoFillColor(curBgColor), calcShadowColor(curBgColor));
                      hideToast();
                      toast('클라우드 템플릿 불러오기 완료');
                      autoLoadLogos();
                    } catch {
                      toast('클라우드 불러오기 실패');
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#1a5cba]"
                >
                  ☁ 클라우드 열기
                </button>
              </div>
            </>
          )}
        </div>

        {permissions.isDesigner && currentScheduleRow && !currentScheduleRow.completed && currentScheduleRow.assigned_to === permissions.userId && (
          <button
            onClick={async () => {
              const id = currentScheduleRow.id as string;
              if (!id) return;
              if (!confirm('작업을 완료 처리하시겠습니까?')) return;
              await supabase.from('plus_schedule').update({ completed: true }).eq('id', id);
              useEditorStore.getState().setCurrentScheduleRow({ ...currentScheduleRow, completed: true });
              toast('완료 처리되었습니다');
            }}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-white transition-colors whitespace-nowrap"
          >
            완료
          </button>
        )}
        <Link
          href="/home"
          className={`${permissions.isDesigner && currentScheduleRow && !currentScheduleRow.completed ? '' : 'ml-auto'} text-xs px-3 py-1.5 rounded-lg border border-white/40 text-white hover:bg-white/10 transition-colors whitespace-nowrap`}
        >
          홈으로 →
        </Link>
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
                onClick={() => { if (window.confirm('이 페이지를 삭제하시겠습니까?')) { deletePage(i); toast('페이지 삭제됨'); } }}
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
      <Toast />
    </div>
  );
}
