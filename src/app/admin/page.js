'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2 } from 'lucide-react';

export default function AdminPage() {
  const [teams, setTeams] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch audits with team info
      const { data: auditsData, error: auditsError } = await supabase
        .from('audits')
        .select(`
          id,
          status,
          created_at,
          teams ( id, name )
        `)
        .order('created_at', { ascending: false });
        
      if (!auditsError && auditsData) {
        setTeams(auditsData);
      }

      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name, is_custom')
        .order('name');
        
      if (!brandsError && brandsData) {
        setBrands(brandsData);
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

  const handleDeleteTeam = async (teamId) => {
    if (!teamId) {
      alert("Error: Team ID is missing.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this team? This will delete all their audits and data.")) {
      try {
        const { data, error } = await supabase.from('teams').delete().eq('id', teamId).select();
        if (error) {
          alert("Error deleting team: " + error.message);
        } else if (!data || data.length === 0) {
          alert("Error: Team not found or you don't have permission to delete it.");
        } else {
          fetchData();
        }
      } catch (err) {
        console.error(err);
        alert("Unexpected error: " + err.message);
      }
    }
  };

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
        fetchData();
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

          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Current Brands</h3>
            <div style={{ background: 'white', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)', maxHeight: '400px', overflowY: 'auto' }}>
              {brands.map(brand => (
                <div key={brand.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-surface)' }}>
                  <span>{brand.name}</span>
                  {brand.is_custom && <span style={{ fontSize: '0.75rem', background: 'var(--color-sour-apple)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-forest)' }}>Custom</span>}
                </div>
              ))}
              {brands.length === 0 && <span style={{ color: 'var(--color-forest)' }}>No brands added yet.</span>}
            </div>
          </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                          background: audit.status === 'completed' ? 'var(--color-sour-apple)' : 'var(--color-surface)',
                          color: audit.status === 'completed' ? 'var(--color-forest)' : 'var(--color-charcoal)'
                        }}>
                          {audit.status}
                        </span>
                        <button 
                          className="icon-only" 
                          type="button"
                          style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', padding: '4px', border: 'none', cursor: 'pointer', display: 'flex' }}
                          onClick={() => handleDeleteTeam(audit.teams?.id)}
                          title="Delete Team"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
