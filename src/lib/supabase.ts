import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ScheduleRow {
  id: string;
  completed: boolean;
  date: string;
  account_id: string;
  keyword: string;
  texts: string[];
  doctors: string[];
  doctor_specialty: string;
  page6_medical_law: string;
  marketer: string;
}

export interface DoctorRow {
  id: string;
  department: string;
  doctor_name: string;
  specialty: string;
}

const VULTR_BASE = `http://158.247.227.8/image/original-images/Plus`;
const DOCTOR_BUCKET = `${VULTR_BASE}/plus_doctors`;
const EXTENSIONS = ['jpg', 'png', 'webp', 'jpeg'];

/** HTTP URL을 프록시 URL로 변환 (HTTPS 환경에서 Mixed Content 방지) */
function toProxyUrl(url: string): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** id + 확장자 순차 시도로 HTMLImageElement 로드, 없으면 null */
function loadImageByIdWithExtensions(id: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= EXTENSIONS.length) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => { idx++; tryNext(); };
      img.src = toProxyUrl(`${DOCTOR_BUCKET}/${id}.${EXTENSIONS[idx]}`);
    };
    tryNext();
  });
}

/** doctor id 배열을 HTMLImageElement 배열로 병렬 로드 (없으면 null) */
export async function loadDoctorImages(ids: (string | null)[]): Promise<(HTMLImageElement | null)[]> {
  return Promise.all(ids.map(id => id ? loadImageByIdWithExtensions(id) : Promise.resolve(null)));
}

const FRAME_BUCKET = `${VULTR_BASE}/plus_frame`;

async function listFilesFromDir(dirUrl: string): Promise<string[]> {
  try {
    const res = await fetch(toProxyUrl(dirUrl + '/'));
    const html = await res.text();
    const matches = [...html.matchAll(/href="([^"]+\.(?:png|jpg|jpeg|webp))"/gi)];
    return matches.map(m => m[1]);
  } catch {
    return [];
  }
}

async function loadImageFromUrl(url: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(toProxyUrl(url));
    if (!res.ok) return null;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    return await new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = blobUrl;
    });
  } catch {
    return null;
  }
}

/** count개의 랜덤 프레임 이미지 로드 (디렉토리 목록에서 랜덤 선택) */
export async function loadRandomFrameImages(count: number): Promise<(HTMLImageElement | null)[]> {
  const files = await listFilesFromDir(FRAME_BUCKET);
  if (files.length === 0) return Array(count).fill(null);
  return Promise.all(
    Array.from({ length: count }, () => {
      const file = files[Math.floor(Math.random() * files.length)];
      return loadImageFromUrl(`${FRAME_BUCKET}/${file}`);
    })
  );
}
