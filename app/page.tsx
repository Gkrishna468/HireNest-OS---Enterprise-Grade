'use client'

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import of the legacy Vite/React entry point 
// to keep using the existing React Router structure within Next.js if needed,
// or we can redirect. For now, let's just render the main layout.
const AdminSecurityDashboard = dynamic(() => import('@/src/views/AdminSecurityDashboard'), { ssr: false });

export default function page() {
  return (
    <div className="min-h-screen bg-white">
      <AdminSecurityDashboard />
    </div>
  );
}
