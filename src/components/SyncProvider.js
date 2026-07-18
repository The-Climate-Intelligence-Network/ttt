'use client';
import { useSync } from '@/hooks/useSync';

export default function SyncProvider() {
  useSync();
  return null;
}
