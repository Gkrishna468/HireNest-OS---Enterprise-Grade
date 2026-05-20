'use client'

import dynamic from 'next/dynamic';

const ExecutionTracker = dynamic(() => import('@/src/views/ExecutionTracker'), { ssr: false });

export default function ExecutionPage() {
  return <ExecutionTracker />;
}
