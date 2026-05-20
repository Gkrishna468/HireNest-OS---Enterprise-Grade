'use client'

import dynamic from 'next/dynamic';

const DashboardTab = dynamic(() => import('@/src/views/DashboardTab'), { ssr: false });

export default function DashboardPage() {
  return <DashboardTab />;
}
