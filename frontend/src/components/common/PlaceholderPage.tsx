import React from 'react';
import { LucideIcon, Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  phase?: number;
}

export default function PlaceholderPage({ title, subtitle, icon: Icon, phase = 2 }: PlaceholderPageProps) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="card">
        <div className="empty-state" style={{ padding: '80px 24px' }}>
          {Icon ? (
            <Icon size={56} style={{ color: 'var(--border-color)' }} />
          ) : (
            <Construction size={56} style={{ color: 'var(--border-color)' }} />
          )}
          <div className="font-bold text-lg" style={{ color: 'var(--text-secondary)' }}>
            {title}
          </div>
          <p className="text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
            This module is implemented in the backend and will be fully wired in Phase {phase}.
            The database schema, API endpoints, and seed data are all ready.
          </p>
          <div
            className="mt-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', border: '1px solid #3742FA25' }}
          >
            ✅ API: <code className="font-mono">/api/v1{subtitle.includes('ISP') ? '/isp' : `/${title.toLowerCase().replace(/ /g, '-')}`}</code> is live
          </div>
        </div>
      </div>
    </div>
  );
}
