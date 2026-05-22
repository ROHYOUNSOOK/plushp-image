'use client';

import { useEffect, useState } from 'react';
import { buildScheduleFolderName } from '@/hooks/useScheduleApplication';
import type { ScheduleRow } from '@/lib/supabase';

export function useTemplateCheck(row: ScheduleRow | null): { hasTemplate: boolean; checking: boolean } {
  const [hasTemplate, setHasTemplate] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!row?.id) { setHasTemplate(false); return; }
    setChecking(true);
    const folderName = buildScheduleFolderName(row);
    fetch('/api/check-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName }),
    })
      .then(r => r.json())
      .then(d => setHasTemplate(!!d.exists))
      .catch(() => setHasTemplate(false))
      .finally(() => setChecking(false));
  }, [row?.id]);

  return { hasTemplate, checking };
}
