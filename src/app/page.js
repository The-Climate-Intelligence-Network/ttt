'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuditStore } from '@/store/auditStore';
import { PlayCircle } from 'lucide-react';

export default function LandingPage() {
  const [teamName, setTeamName] = useState('');
  const startAudit = useAuditStore(state => state.startAudit);
  const router = useRouter();

  const handleStart = (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    startAudit(teamName.trim());
    router.push('/audit');
  };

  return (
    <main className="mobile-container flex-center">
      <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0', width: '100%' }}>
        <h1 style={{ color: 'var(--color-teal)', marginBottom: 'var(--spacing-xs)', fontSize: '3rem' }}>
          Track The Trash
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-xl)', color: 'var(--color-forest)' }}>
          Beach Clean-up Brand Audit
        </p>

        <form onSubmit={handleStart} style={{ 
          background: 'white', 
          padding: 'var(--spacing-xl)', 
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
        }}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '600', color: 'var(--color-deep-forest)', textAlign: 'left' }}>
              Register Team
            </label>
            <input 
              type="text" 
              placeholder="Enter team name..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              style={{ fontSize: '1.1rem' }}
            />
          </div>
          
          <button type="submit" className="primary" style={{ width: '100%', fontSize: '1.2rem', padding: '1rem' }}>
            <PlayCircle size={24} /> Start Audit
          </button>
        </form>
      </div>
    </main>
  );
}
