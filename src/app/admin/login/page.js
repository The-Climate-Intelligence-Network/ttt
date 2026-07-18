'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <main className="mobile-container flex-center">
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: '50%', color: 'var(--color-teal)' }}>
            <Lock size={48} />
          </div>
        </div>
        
        <h1 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-deep-forest)' }}>Admin Access</h1>
        <p style={{ marginBottom: 'var(--spacing-xl)', color: 'var(--color-forest)' }}>Sign in to view the dashboard</p>

        <form onSubmit={handleLogin} style={{ background: 'white', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
          {error && (
            <div style={{ background: 'var(--color-vibrant-rose)', color: 'white', padding: 'var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', marginBottom: 'var(--spacing-md)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 'var(--spacing-md)', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 'var(--spacing-xl)', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
