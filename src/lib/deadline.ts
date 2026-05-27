/** 업로드 날짜 기준 전날 마감, 토/일이면 금요일로 당김 */
export function calcDeadline(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() - 2);
  if (day === 6) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function isOverdue(deadlineStr: string): boolean {
  return deadlineStr < new Date().toISOString().slice(0, 10);
}
