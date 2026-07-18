'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  const fetchStats = async () => {
    try {
      // Get all audit items with brand names
      const { data, error } = await supabase
        .from('audit_items')
        .select(`
          count,
          brands ( name )
        `);
        
      if (!error && data) {
        let total = 0;
        const brandCounts = {};
        
        data.forEach(item => {
          total += item.count;
          const name = item.brands?.name || 'Unknown';
          brandCounts[name] = (brandCounts[name] || 0) + item.count;
        });
        
        const sortedStats = Object.entries(brandCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
          
        setStats(sortedStats);
        setTotalItems(total);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: 'var(--color-deep-forest)', 
      color: 'white', 
      padding: 'var(--spacing-2xl)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header className="flex-between" style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <h1 style={{ color: 'var(--color-surface)', fontSize: '3rem', margin: 0 }}>Live Audit Dashboard</h1>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', color: 'var(--color-jade)' }}>Total Items Found</div>
          <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--color-sunflower)', lineHeight: 1 }}>{totalItems}</div>
        </div>
      </header>
      
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)', alignContent: 'start' }}>
        {stats.map((stat, i) => (
          <div key={stat.name} style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: 'var(--spacing-lg)', 
            borderRadius: 'var(--border-radius-lg)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <span style={{ fontSize: '1.5rem', color: 'var(--color-jade)', fontWeight: 600 }}>#{i + 1}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stat.name}</span>
            </div>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-teal)' }}>{stat.count}</span>
          </div>
        ))}
        {stats.length === 0 && (
          <div style={{ fontSize: '1.5rem', color: 'var(--color-jade)' }}>Waiting for audit data...</div>
        )}
      </div>
    </main>
  );
}
