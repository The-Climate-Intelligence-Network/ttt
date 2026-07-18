'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Pencil, Check, X, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [teams, setTeams] = useState([]);
  const [brands, setBrands] = useState([]);
  const [events, setEvents] = useState([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [editingBrand, setEditingBrand] = useState(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, id: null });

  const fetchData = async () => {
    try {
      // Fetch teams with their audits and event info
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          event_id,
          created_at,
          events ( id, name ),
          audits ( id, status, created_at )
        `)
        .order('created_at', { ascending: false });
        
      if (!teamsError && teamsData) {
        const mappedTeams = teamsData.map(team => {
          const sortedAudits = team.audits ? [...team.audits].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];
          const audit = sortedAudits[0] || null;
          return {
            id: audit ? audit.id : `no-audit-${team.id}`,
            status: audit ? audit.status : 'registered',
            created_at: audit ? audit.created_at : team.created_at,
            team_id: team.id,
            teams: {
              id: team.id,
              name: team.name,
              event_id: team.event_id,
              events: team.events
            }
          };
        });
        setTeams(mappedTeams);
      }

      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name, is_custom')
        .order('name');
        
      if (!brandsError && brandsData) {
        setBrands(brandsData);
      }

      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, is_active')
        .order('created_at', { ascending: false });
        
      if (!eventsError && eventsData) {
        setEvents(eventsData);
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

  const handleDeleteTeam = (teamId) => {
    if (!teamId) return;
    setConfirmDialog({ isOpen: true, type: 'team', id: teamId });
  };

  const handleDeleteBrand = (brandId) => {
    if (!brandId) return;
    setConfirmDialog({ isOpen: true, type: 'brand', id: brandId });
  };

  const executeDelete = async () => {
    const { type, id } = confirmDialog;
    if (!type || !id) return;

    try {
      if (type === 'team') {
        const { data, error } = await supabase.from('teams').delete().eq('id', id).select();
        if (error) alert("Error deleting team: " + error.message);
        else if (!data || data.length === 0) alert("Error: Team not found or no permission.");
        else fetchData();
      } else if (type === 'brand') {
        const { error } = await supabase.from('brands').delete().eq('id', id);
        if (error) alert("Error deleting brand: " + error.message);
        else fetchData();
      }
    } catch (err) {
      console.error(err);
      alert("Unexpected error: " + err.message);
    } finally {
      setConfirmDialog({ isOpen: false, type: null, id: null });
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

  const handleEditBrand = async (brandId) => {
    if (!editBrandName.trim()) return;
    try {
      const { error } = await supabase
        .from('brands')
        .update({ name: editBrandName.trim() })
        .eq('id', brandId);
      
      if (!error) {
        setEditingBrand(null);
        setEditBrandName('');
        fetchData();
      } else {
        alert('Error updating brand: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('events')
        .insert({ name: newEventName.trim(), is_active: true });
        
      if (!error) {
        alert(`Event "${newEventName}" added successfully.`);
        setNewEventName('');
        fetchData();
      } else {
        alert('Error adding event: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleEventActive = async (eventId, currentActiveStatus) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: !currentActiveStatus })
        .eq('id', eventId);
        
      if (!error) {
        fetchData();
      } else {
        alert('Error updating event status: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="container" style={{ padding: 'var(--spacing-xl) 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ marginBottom: 0 }}>Admin Overview</h1>
        <Link href="/admin/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '10px 16px', borderRadius: 'var(--border-radius-lg)', color: 'white', background: 'var(--color-forest)', fontWeight: 'bold' }}>
          <LayoutDashboard size={18} /> View Dashboard
        </Link>
      </div>
      
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
                  {editingBrand === brand.id ? (
                    <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                      <input 
                        type="text" 
                        value={editBrandName}
                        onChange={e => setEditBrandName(e.target.value)}
                        style={{ padding: '4px 8px', flex: 1, borderRadius: '4px', border: '1px solid var(--color-surface)' }}
                        autoFocus
                      />
                      <button type="button" style={{ background: 'transparent', color: 'var(--color-forest)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => handleEditBrand(brand.id)} title="Save"><Check size={18} /></button>
                      <button type="button" style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => setEditingBrand(null)} title="Cancel"><X size={18} /></button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{brand.name}</span>
                        {brand.is_custom && <span style={{ fontSize: '0.75rem', background: 'var(--color-sour-apple)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-forest)' }}>Custom</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button type="button" style={{ background: 'transparent', color: 'var(--color-charcoal)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => { setEditingBrand(brand.id); setEditBrandName(brand.name); }} title="Edit Brand">
                          <Pencil size={16} />
                        </button>
                        <button type="button" style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => handleDeleteBrand(brand.id)} title="Delete Brand">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {brands.length === 0 && <span style={{ color: 'var(--color-forest)' }}>No brands added yet.</span>}
            </div>
          </div>
        </section>

        <section>
          <h2>Manage Events</h2>
          <form onSubmit={handleAddEvent} style={{ background: 'white', padding: 'var(--spacing-lg)', borderRadius: 'var(--border-radius-lg)' }}>
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Add Event</label>
              <input 
                type="text" 
                value={newEventName}
                onChange={e => setNewEventName(e.target.value)}
                placeholder="Event name (e.g. Beach Clean-up)..."
                required
              />
            </div>
            <button type="submit" className="primary"><Plus size={16} /> Add Event</button>
          </form>

          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Events</h3>
            <div style={{ background: 'white', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)', maxHeight: '400px', overflowY: 'auto' }}>
              {events.map(event => (
                <div key={event.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-surface)' }}>
                  <div>
                    <span style={{ fontWeight: event.is_active ? 'bold' : 'normal' }}>{event.name}</span>
                  </div>
                  <div>
                    <button 
                      type="button" 
                      onClick={() => handleToggleEventActive(event.id, event.is_active)}
                      style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        border: '1px solid var(--color-surface)',
                        background: event.is_active ? 'var(--color-sour-apple)' : 'var(--color-surface)',
                        color: event.is_active ? 'var(--color-forest)' : 'var(--color-charcoal)'
                      }}
                    >
                      {event.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ))}
              {events.length === 0 && <span style={{ color: 'var(--color-forest)' }}>No events added yet.</span>}
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
                        {audit.teams?.events?.name && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            background: 'var(--color-surface)', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            marginLeft: '8px', 
                            color: 'var(--color-forest)',
                            fontWeight: 'normal'
                          }}>
                            {audit.teams.events.name}
                          </span>
                        )}
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-forest)' }}>
                          {audit.status === 'registered' ? 'Registered' : 'Started'}: {new Date(audit.created_at).toLocaleTimeString()}
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
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteTeam(audit.team_id || audit.teams?.id); }}
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
      {confirmDialog.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(47, 62, 52, 0.8)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)'
        }}>
          <div style={{ background: 'white', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
              {confirmDialog.type === 'team' ? 'Delete Team?' : 'Delete Brand?'}
            </h3>
            <p>
              {confirmDialog.type === 'team' 
                ? 'Are you sure you want to delete this team? This will delete all their audits and data.'
                : 'Are you sure you want to delete this brand?'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
              <button className="secondary" style={{ flex: 1 }} onClick={() => setConfirmDialog({ isOpen: false, type: null, id: null })}>Cancel</button>
              <button className="primary" style={{ flex: 1, background: 'var(--color-vibrant-rose)' }} onClick={executeDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
