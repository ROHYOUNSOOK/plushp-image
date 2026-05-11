const BG_BUCKET = `http://158.247.227.8/image/original-images/Cardnews_image/background_image`;

async function listFilesFromDir(dirUrl: string): Promise<string[]> {
  try {
    const res = await fetch(dirUrl + '/');
    const html = await res.text();
    const matches = [...html.matchAll(/href="([^"]+\.(?:png|jpg|jpeg|webp))"/gi)];
    return matches.map(m => m[1]);
  } catch {
    return [];
  }
}

function applyRandomHue(img: HTMLImageElement): Promise<HTMLImageElement> {
  const hue = Math.floor(Math.random() * 360);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.filter = `hue-rotate(${hue}deg)`;
  ctx.drawImage(img, 0, 0);
  ctx.filter = 'none';
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (!blob) { resolve(img); return; }
      const blobUrl = URL.createObjectURL(blob);
      const newImg = new Image();
      newImg.onload = () => resolve(newImg);
      newImg.onerror = () => resolve(img);
      newImg.src = blobUrl;
    }, 'image/jpeg', 0.95);
  });
}

export async function pickRandomBackground(): Promise<{ img: HTMLImageElement; url: string }> {
  const files = await listFilesFromDir(BG_BUCKET);
  if (files.length === 0) throw new Error('배경 이미지 없음');
  const file = files[Math.floor(Math.random() * files.length)];
  const url = `${BG_BUCKET}/${file}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지 로드 실패: ${url}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = blobUrl;
  });
  return { img: await applyRandomHue(img), url };
}
