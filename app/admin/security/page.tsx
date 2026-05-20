'use client'

import dynamic from 'next/dynamic';

const AdminSecurityDashboard = dynamic(() => import('@/src/views/AdminSecurityDashboard'), { ssr: false });

export default function SecurityPage() {
  return <AdminSecurityDashboard />;
}
