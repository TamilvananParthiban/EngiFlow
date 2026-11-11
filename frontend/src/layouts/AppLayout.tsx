import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { useUIStore } from '../store/uiStore';

export default function AppLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden" style={{ background: 'var(--bg-body)' }}>
      <Sidebar />
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <TopBar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
