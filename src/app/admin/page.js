'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus } from 'lucide-react';

export default function AdminPage() {
  const [teams, setTeams] = useState([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch audits with team info
      const { data, error } = await supabase
        .from('audits')
        .select(`
          id,
          status,
          created_at,
          teams ( name )
        `)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setTeams(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('brands')
        .insert({ name: newBrandName.trim(), is_custom: false });
        
      if (!error) {
        alert(`Brand ${newBrandName} added successfully.`);
        setNewBrandName('');
      } else {
        alert('Error adding brand.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
      <h1 style={{ marginBottom: 'var(--spacing-xl)' }}>Admin Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-xl)' }}>
        
        <section>
          <h2>Manage Brands</h2>
          <form onSubmit={handleAddBrand} style={{ background: 'white', padding: 'var(--spacing-lg)', borderRadius: 'var(--border-radius-lg)' }}>
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Add Default Brand</label>
              <input 
                type="text" 
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value)}
                placeholder="Brand name..."
                required
              />
            </div>
            <button type="submit" className="primary"><Plus size={16} /> Add Brand</button>
          </form>
        </section>
        
        <section>
          <h2>Active Teams & Audits</h2>
          <div style={{ background: 'white', padding: 'var(--spacing-lg)', borderRadius: 'var(--border-radius-lg)' }}>
            {loading ? <p>Loading...</p> : (
              teams.length === 0 ? <p>No audits found.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {teams.map(audit => (
                    <div key={audit.id} className="flex-between" style={{ paddingBottom: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-surface)' }}>
                      <div>
                        <strong>{audit.teams?.name || 'Unknown Team'}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-forest)' }}>
                          Started: {new Date(audit.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                        background: audit.status === 'completed' ? 'var(--color-sour-apple)' : 'var(--color-surface)',
                        color: audit.status === 'completed' ? 'var(--color-forest)' : 'var(--color-charcoal)'
                      }}>
                        {audit.status}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </section>
        
      </div>
    </main>
  );
}
