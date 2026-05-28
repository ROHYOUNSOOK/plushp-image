import type { ScheduleRow } from '@/lib/supabase';

export type ScheduleStatus =
  | 'unassigned'
  | 'assigned'
  | 'in_progress'
  | 'design_done'
  | 'confirmed';

export function getScheduleStatus(row: ScheduleRow): ScheduleStatus {
  if (row.confirmed) return 'confirmed';
  if (row.completed) return 'design_done';
  if (row.started) return 'in_progress';
  if (row.assigned_to) return 'assigned';
  return 'unassigned';
}

export const STATUS_LABELS: Record<ScheduleStatus, string> = {
  unassigned: '미배분',
  assigned: '배분완료',
  in_progress: '진행중',
  design_done: '디자인완료',
  confirmed: '컨펌완료',
};

export const STATUS_ORDER: ScheduleStatus[] = [
  'unassigned',
  'assigned',
  'in_progress',
  'design_done',
  'confirmed',
];

export const STATUS_BADGE_CLASSES: Record<ScheduleStatus, string> = {
  unassigned: 'bg-gray-100 text-gray-500',
  assigned: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  design_done: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-green-100 text-green-700',
};
