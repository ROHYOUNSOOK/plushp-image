'use client';


import { useEditorStore, selectSelectedLayer } from '@/store/editorStore';
import BackgroundProps from '@/components/props/BackgroundProps';
import FrameProps from '@/components/props/FrameProps';
import ImageProps from '@/components/props/ImageProps';
import TextboxProps from '@/components/props/TextboxProps';
import TextProps from '@/components/props/TextProps';
import LogoProps from '@/components/props/LogoProps';
import DoctorCardProps from '@/components/props/DoctorCardProps';
import MedicalLawProps from '@/components/props/MedicalLawProps';
import MedBoxProps from '@/components/props/MedBoxProps';
import MedTitleProps from '@/components/props/MedTitleProps';
import MedDescProps from '@/components/props/MedDescProps';
import type { MedBoxLayer, MedTitleLayer, MedDescLayer } from '@/types/layer';

export default function PropsPanel() {
  const layer = useEditorStore(selectSelectedLayer);
  const isMedicalLaw = useEditorStore(s => s.pages[s.currentPage]?.isMedicalLaw ?? false);

  // 의료법 페이지: 선택된 레이어 타입에 따라 전용 패널 표시
  if (isMedicalLaw) {
    if (layer?.type === 'med-box') {
      return <div className="p-3" key={layer.id}><MedBoxProps layer={layer as MedBoxLayer} /></div>;
    }
    if (layer?.type === 'med-title') {
      return <div className="p-3" key={layer.id}><MedTitleProps layer={layer as MedTitleLayer} /></div>;
    }
    if (layer?.type === 'med-desc') {
      return <div className="p-3" key={layer.id}><MedDescProps layer={layer as MedDescLayer} /></div>;
    }
    if (layer?.type === 'logo') {
      return <div className="p-3" key={layer.id}><LogoProps layer={layer} /></div>;
    }
    if (layer?.type === 'background') {
      return <div className="p-3" key={layer.id}><BackgroundProps layer={layer} /></div>;
    }
    return (
      <div className="p-3">
        <MedicalLawProps />
      </div>
    );
  }

  if (!layer) {
    return (
      <div className="p-3">
        <div className="font-bold text-xs text-gray-500 mb-2">속성</div>
        <div className="text-gray-400 text-xs">레이어를 선택하세요</div>
      </div>
    );
  }

  return (
    <div className="p-3" key={layer.id}>
      {layer.type === 'background' && <BackgroundProps layer={layer} />}
      {layer.type === 'frame' && <FrameProps layer={layer} />}
      {layer.type === 'image' && <ImageProps layer={layer} />}
      {layer.type === 'textbox' && <TextboxProps layer={layer} />}
      {layer.type === 'text' && <TextProps layer={layer} />}
      {layer.type === 'logo' && <LogoProps layer={layer} />}
      {layer.type === 'doctor-card' && <DoctorCardProps layer={layer} />}
    </div>
  );
}
