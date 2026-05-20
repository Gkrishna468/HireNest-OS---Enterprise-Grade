'use client'

import dynamic from 'next/dynamic';

const AdminUsersManager = dynamic(() => import('@/src/views/AdminUsersManager'), { ssr: false });

export default function UsersPage() {
  return <AdminUsersManager orgData={{}} />;
}
