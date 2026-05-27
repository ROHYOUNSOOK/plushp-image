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
  assigned_to?: string | null;
  created_by?: string | null;
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

/** id + 확장자 순차 시도로 HTMLImageElement + 성공한 URL 로드, 없으면 null */
function loadImageByIdWithExtensions(id: string): Promise<{ img: HTMLImageElement; url: string } | null> {
  return new Promise(resolve => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= EXTENSIONS.length) { resolve(null); return; }
      const rawUrl = `${DOCTOR_BUCKET}/${id}.${EXTENSIONS[idx]}`;
      const proxyUrl = toProxyUrl(rawUrl);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve({ img, url: proxyUrl });
      img.onerror = () => { idx++; tryNext(); };
      img.src = proxyUrl;
    };
    tryNext();
  });
}

/** doctor id 배열을 { img, url } 배열로 병렬 로드 (없으면 null) */
export async function loadDoctorImages(ids: (string | null)[]): Promise<({ img: HTMLImageElement; url: string } | null)[]> {
  return Promise.all(ids.map(id => id ? loadImageByIdWithExtensions(id) : Promise.resolve(null)));
}

const FRAME_BUCKET = `${VULTR_BASE}/plus_frame`;
const SCHEDULE_BASE = `http://158.247.227.8/image/plushospital/schedule`;

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

/** 스케줄 폴더에서 페이지 순서대로 내부 이미지 로드 (1.jpg, 2.jpg, ...) */
export async function loadScheduleInnerImages(
  folderName: string,
  count: number,
): Promise<{ img: HTMLImageElement | null; url: string | null }[]> {
  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        const rawUrl = `${SCHEDULE_BASE}/${folderName}/${i + 1}.${ext}`;
        const proxyUrl = toProxyUrl(rawUrl);
        const bustUrl = proxyUrl + (proxyUrl.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`);
        try {
          const res = await fetch(bustUrl, { method: 'HEAD', cache: 'no-store' });
          if (res.ok) {
            const img = await loadImageFromUrl(rawUrl);
            return { img, url: proxyUrl };
          }
        } catch { /* 없으면 다음 확장자 시도 */ }
      }
      return { img: null, url: null };
    })
  );
}

/** count개의 랜덤 프레임 마스크 이미지 로드 (URL 포함 반환) */
export async function loadRandomFrameImages(count: number): Promise<{ img: HTMLImageElement | null; url: string | null }[]> {
  const files = await listFilesFromDir(FRAME_BUCKET);
  if (files.length === 0) return Array(count).fill({ img: null, url: null });
  return Promise.all(
    Array.from({ length: count }, async () => {
      const file = files[Math.floor(Math.random() * files.length)];
      const rawUrl = `${FRAME_BUCKET}/${file}`;
      const proxyUrl = toProxyUrl(rawUrl);
      const img = await loadImageFromUrl(rawUrl);
      return { img, url: proxyUrl };
    })
  );
}
