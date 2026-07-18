'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Pencil, Check, X, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

const SRI_LANKA_DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", 
  "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", 
  "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", 
  "Matale", "Matara", "Moneragala", "Mullaitivu", "Nuwara Eliya", 
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

export default function AdminPage() {
  const [teams, setTeams] = useState([]);
  const [brands, setBrands] = useState([]);
  const [events, setEvents] = useState([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [editingBrand, setEditingBrand] = useState(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newOrganization, setNewOrganization] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState('');
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [multiLocations, setMultiLocations] = useState(['']);

  const [editingEventId, setEditingEventId] = useState(null);
  const [editEventData, setEditEventData] = useState({
    name: '',
    organization: '',
    district: '',
    location: '',
    event_date: '',
    is_multi_location: false,
    locations: ['']
  });

  const [bulkBrandsText, setBulkBrandsText] = useState('');
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [dragOverParent, setDragOverParent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: null, id: null });

  const [expandedAuditId, setExpandedAuditId] = useState(null);
  const [auditItems, setAuditItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const handleToggleExpand = async (auditId) => {
    if (expandedAuditId === auditId) {
      setExpandedAuditId(null);
      setAuditItems([]);
      return;
    }
    
    setExpandedAuditId(auditId);
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('audit_items')
        .select(`
          id,
          count,
          proof_photo_url,
          brands ( name, is_custom )
        `)
        .eq('audit_id', auditId)
        .order('count', { ascending: false });
        
      if (!error && data) {
        setAuditItems(data);
      } else {
        setAuditItems([]);
      }
    } catch (err) {
      console.error('Error fetching audit items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

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
          audits ( id, status, created_at, before_photo_url, after_photo_url )
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
            before_photo_url: audit ? audit.before_photo_url : null,
            after_photo_url: audit ? audit.after_photo_url : null,
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
        .select('id, name, is_custom, parent_id')
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
      } else if (type === 'event') {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) alert("Error deleting event: " + error.message);
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
        .insert({ name: newBrandName.trim(), is_custom: false, parent_id: newParentId || null });
        
      if (!error) {
        alert(`Brand ${newBrandName} added successfully.`);
        setNewBrandName('');
        setNewParentId('');
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
        .update({ name: editBrandName.trim(), parent_id: editParentId || null })
        .eq('id', brandId);
      
      if (!error) {
        setEditingBrand(null);
        setEditBrandName('');
        setEditParentId('');
        fetchData();
      } else {
        alert('Error updating brand: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkAddBrands = async () => {
    if (!bulkBrandsText.trim()) return;
    setIsBulkAdding(true);
    
    try {
      const lines = bulkBrandsText.split(/\r?\n/).filter(l => l.trim() !== '');
      const newBrands = [];
      
      // Parse CSV: Brand Name, Parent Brand Name
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        const brandName = parts[0];
        const parentName = parts.length > 1 ? parts[1] : null;
        if (brandName) {
           newBrands.push({ name: brandName, parentName, is_custom: false });
        }
      }
      
      let addedCount = 0;
      
      // First pass: Process all unique parent names and insert them if they don't exist
      const uniqueParents = [...new Set(newBrands.map(b => b.parentName).filter(Boolean))];
      
      for (const pName of uniqueParents) {
         const existing = brands.find(b => b.name.toLowerCase() === pName.toLowerCase());
         if (!existing) {
            await supabase.from('brands').insert({ name: pName, is_custom: false });
         }
      }
      
      // Fetch fresh brands to get the new parent IDs
      const { data: freshBrands } = await supabase.from('brands').select('id, name');
      
      // Second pass: Insert the actual brands
      for (const b of newBrands) {
         const existingBrand = freshBrands?.find(fb => fb.name.toLowerCase() === b.name.toLowerCase());
         if (!existingBrand) {
            let parent_id = null;
            if (b.parentName) {
               parent_id = freshBrands?.find(fb => fb.name.toLowerCase() === b.parentName.toLowerCase())?.id || null;
            }
            await supabase.from('brands').insert({ name: b.name, parent_id, is_custom: false });
            addedCount++;
         }
      }
      
      alert(`Bulk add completed. Added ${addedCount} new brands.`);
      setBulkBrandsText('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error during bulk add: ' + err.message);
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleDragStart = (e, brand) => {
    e.dataTransfer.setData('brandId', brand.id);
  };

  const handleDragOver = (e, parentId) => {
    e.preventDefault();
    setDragOverParent(parentId);
  };

  const handleDragLeave = (e) => {
    setDragOverParent(null);
  };

  const handleDrop = async (e, targetParentId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverParent(null);
    
    const brandId = e.dataTransfer.getData('brandId');
    if (!brandId) return;
    if (brandId === targetParentId) return; // Can't drop on itself
    
    // Check if dragging a parent into its own child
    if (targetParentId) {
      const targetBrand = brands.find(b => b.id === targetParentId);
      if (targetBrand?.parent_id === brandId) {
        alert("Cannot move a parent brand under its own sub-brand.");
        return;
      }
    }

    // Check if dragged brand has children
    const hasChildren = brands.some(b => b.parent_id === brandId);
    if (hasChildren && targetParentId !== null) {
      alert("Cannot nest a brand that already has sub-brands. Move its sub-brands first.");
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .update({ parent_id: targetParentId || null })
        .eq('id', brandId);
      
      if (!error) {
        fetchData();
      } else {
        alert('Error moving brand: ' + error.message);
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
        .insert({ 
          name: newEventName.trim(), 
          is_active: true,
          organization: newOrganization.trim() || null,
          district: newDistrict.trim() || null,
          location: newLocation.trim() || null,
          event_date: newDate || null,
          is_multi_location: isMultiLocation,
          locations: isMultiLocation ? multiLocations.filter(l => l.trim() !== '') : []
        });
        
      if (!error) {
        alert(`Event "${newEventName}" added successfully.`);
        setNewEventName('');
        setNewOrganization('');
        setNewDistrict('');
        setNewLocation('');
        setNewDate('');
        setIsMultiLocation(false);
        setMultiLocations(['']);
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

  const handleEditEventClick = (event) => {
    setEditingEventId(event.id);
    setEditEventData({
      name: event.name || '',
      organization: event.organization || '',
      district: event.district || '',
      location: event.location || '',
      event_date: event.event_date || '',
      is_multi_location: event.is_multi_location || false,
      locations: event.locations && event.locations.length > 0 ? event.locations : ['']
    });
  };

  const handleEditEventSave = async (eventId) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: editEventData.name.trim(),
          organization: editEventData.organization.trim() || null,
          district: editEventData.district.trim() || null,
          location: editEventData.location.trim() || null,
          event_date: editEventData.event_date || null,
          is_multi_location: editEventData.is_multi_location,
          locations: editEventData.is_multi_location ? editEventData.locations.filter(l => l.trim() !== '') : []
        })
        .eq('id', eventId);
        
      if (!error) {
        setEditingEventId(null);
        fetchData();
      } else {
        alert('Error updating event: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = (eventId) => {
    if (!eventId) return;
    setConfirmDialog({ isOpen: true, type: 'event', id: eventId });
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
                style={{ width: '100%', marginBottom: '8px' }}
              />
              <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontSize: '0.9rem' }}>Parent Brand (Optional)</label>
              <select 
                value={newParentId} 
                onChange={e => setNewParentId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-surface)' }}
              >
                <option value="">None (Main Brand)</option>
                {brands.filter(b => !b.parent_id).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="primary"><Plus size={16} /> Add Brand</button>
          </form>

          <div style={{ background: 'white', padding: 'var(--spacing-lg)', borderRadius: 'var(--border-radius-lg)', marginTop: 'var(--spacing-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.9rem', color: 'var(--color-forest)', fontWeight: 'bold' }}>
              Bulk Add Brands (CSV Format)
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-charcoal)', marginBottom: '12px' }}>
              Format: <code>Brand Name, Parent Brand Name</code> (Parent is optional, one per line)
            </p>
            <textarea 
              value={bulkBrandsText}
              onChange={e => setBulkBrandsText(e.target.value)}
              placeholder="e.g.&#10;Nestle&#10;Milo, Nestle&#10;Nescafe, Nestle"
              rows={4}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: 'var(--border-radius-sm)', 
                border: '1px solid var(--color-jade)', 
                fontSize: '0.9rem', 
                fontFamily: 'inherit',
                marginBottom: '12px',
                resize: 'vertical'
              }}
            />
            <button 
              type="button" 
              className="secondary" 
              onClick={handleBulkAddBrands} 
              disabled={isBulkAdding}
              style={{ width: '100%' }}
            >
              {isBulkAdding ? 'Processing...' : 'Bulk Add Brands'}
            </button>
          </div>

          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Current Brands</h3>
            <div style={{ background: 'white', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)', maxHeight: '600px', overflowY: 'auto' }}>
              
              <div 
                style={{ 
                  padding: '12px', 
                  marginBottom: '12px', 
                  border: dragOverParent === 'root' ? '2px dashed var(--color-forest)' : '2px dashed var(--color-surface)',
                  textAlign: 'center',
                  color: 'var(--color-charcoal)',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
                onDragOver={(e) => handleDragOver(e, 'root')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
              >
                Drop here to make a top-level Main Brand
              </div>

              {brands.filter(b => !b.parent_id).map(mainBrand => (
                <div 
                  key={mainBrand.id} 
                  style={{ 
                    marginBottom: 'var(--spacing-md)',
                    border: dragOverParent === mainBrand.id ? '2px dashed var(--color-forest)' : '2px dashed transparent',
                    borderRadius: '8px',
                    padding: '4px',
                    transition: 'border-color 0.2s ease'
                  }}
                  onDragOver={(e) => handleDragOver(e, mainBrand.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, mainBrand.id)}
                >
                  <div 
                    className="flex-between" 
                    style={{ padding: '8px 0', borderBottom: '2px solid var(--color-surface)', fontWeight: 'bold', cursor: 'grab' }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, mainBrand)}
                  >
                    {editingBrand === mainBrand.id ? (
                      <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                        <input 
                          type="text" 
                          value={editBrandName}
                          onChange={e => setEditBrandName(e.target.value)}
                          style={{ padding: '4px 8px', flex: 1, borderRadius: '4px', border: '1px solid var(--color-surface)' }}
                          autoFocus
                        />
                        <select 
                          value={editParentId} 
                          onChange={e => setEditParentId(e.target.value)}
                          style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--color-surface)' }}
                        >
                          <option value="">None (Main Brand)</option>
                          {brands.filter(b => !b.parent_id && b.id !== mainBrand.id).map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <button type="button" style={{ background: 'transparent', color: 'var(--color-forest)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => handleEditBrand(mainBrand.id)} title="Save"><Check size={18} /></button>
                        <button type="button" style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => setEditingBrand(null)} title="Cancel"><X size={18} /></button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{mainBrand.name}</span>
                          {mainBrand.is_custom && <span style={{ fontSize: '0.75rem', background: 'var(--color-sour-apple)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-forest)' }}>Custom</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button type="button" style={{ background: 'transparent', color: 'var(--color-charcoal)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => { setEditingBrand(mainBrand.id); setEditBrandName(mainBrand.name); setEditParentId(''); }} title="Edit Brand">
                            <Pencil size={16} />
                          </button>
                          <button type="button" style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => handleDeleteBrand(mainBrand.id)} title="Delete Brand">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Sub-brands */}
                  <div style={{ paddingLeft: 'var(--spacing-lg)' }}>
                    {brands.filter(b => b.parent_id === mainBrand.id).map(subBrand => (
                      <div 
                        key={subBrand.id} 
                        className="flex-between" 
                        style={{ padding: '6px 0', borderBottom: '1px solid var(--color-surface)', cursor: 'grab' }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, subBrand)}
                      >
                        {editingBrand === subBrand.id ? (
                          <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                            <input 
                              type="text" 
                              value={editBrandName}
                              onChange={e => setEditBrandName(e.target.value)}
                              style={{ padding: '4px 8px', flex: 1, borderRadius: '4px', border: '1px solid var(--color-surface)' }}
                              autoFocus
                            />
                            <select 
                              value={editParentId} 
                              onChange={e => setEditParentId(e.target.value)}
                              style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--color-surface)', maxWidth: '120px' }}
                            >
                              <option value="">None (Main Brand)</option>
                              {brands.filter(b => !b.parent_id).map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                            <button type="button" style={{ background: 'transparent', color: 'var(--color-forest)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => handleEditBrand(subBrand.id)} title="Save"><Check size={18} /></button>
                            <button type="button" style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => setEditingBrand(null)} title="Cancel"><X size={18} /></button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-charcoal)' }}>
                              <span>└ {subBrand.name}</span>
                              {subBrand.is_custom && <span style={{ fontSize: '0.7rem', background: 'var(--color-sour-apple)', padding: '2px 4px', borderRadius: '4px', color: 'var(--color-forest)' }}>Custom</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button type="button" style={{ background: 'transparent', color: 'var(--color-charcoal)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => { setEditingBrand(subBrand.id); setEditBrandName(subBrand.name); setEditParentId(subBrand.parent_id || ''); }} title="Edit Brand">
                                <Pencil size={14} />
                              </button>
                              <button type="button" style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} onClick={() => handleDeleteBrand(subBrand.id)} title="Delete Brand">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
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
              <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Event Name *</label>
              <input 
                type="text" 
                value={newEventName}
                onChange={e => setNewEventName(e.target.value)}
                placeholder="Event name (e.g. Beach Clean-up)..."
                required
              />
            </div>
            
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Organization</label>
              <input type="text" value={newOrganization} onChange={e => setNewOrganization(e.target.value)} placeholder="Organization..." />
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>District</label>
                <select 
                  value={newDistrict} 
                  onChange={e => setNewDistrict(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-surface)', background: 'white' }}
                >
                  <option value="">Select District...</option>
                  {SRI_LANKA_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Date</label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', justifyContent: 'flex-start' }}>
                <input 
                  type="checkbox" 
                  checked={isMultiLocation} 
                  onChange={e => setIsMultiLocation(e.target.checked)} 
                  style={{ width: 'auto', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontWeight: 'bold', color: 'var(--color-forest)' }}>Is Multi-Location Event?</span>
              </label>
            </div>

            {isMultiLocation ? (
              <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--border-radius-sm)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 'bold' }}>Locations List</label>
                {multiLocations.map((loc, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input 
                      type="text" 
                      value={loc} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val.includes(',') || val.includes('\n')) {
                          const parsed = val.split(/[,\n]+/).map(item => item.trim()).filter(Boolean);
                          const newLocs = [...multiLocations];
                          newLocs.splice(idx, 1, ...parsed);
                          setMultiLocations(newLocs);
                        } else {
                          const newLocs = [...multiLocations];
                          newLocs[idx] = val;
                          setMultiLocations(newLocs);
                        }
                      }} 
                      placeholder={`Location ${idx + 1}`} 
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setMultiLocations(multiLocations.filter((_, i) => i !== idx))}
                      style={{ background: 'white', color: 'var(--color-vibrant-rose)', border: '1px solid var(--color-surface)', padding: '0 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <X size={16}/>
                    </button>
                  </div>
                ))}
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                  <button type="button" onClick={() => setMultiLocations([...multiLocations, ''])} style={{ background: 'transparent', border: '1px dashed var(--color-jade)', color: 'var(--color-forest)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    + Add Another Location
                  </button>
                </div>

                <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px dashed var(--color-jade)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.85rem', color: 'var(--color-forest)', fontWeight: 'bold' }}>
                    Or Paste/Type List (comma or newline separated)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <textarea 
                      id="bulk-locations-input"
                      placeholder="e.g. Location A, Location B, Location C"
                      rows={2}
                      style={{ 
                        flex: 1, 
                        padding: '8px', 
                        borderRadius: 'var(--border-radius-sm)', 
                        border: '1px solid var(--color-jade)', 
                        fontSize: '0.9rem', 
                        fontFamily: 'inherit', 
                        resize: 'none' 
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const textarea = document.getElementById('bulk-locations-input');
                        if (textarea) {
                          const val = textarea.value;
                          const parsed = val.split(/[,\n]+/).map(item => item.trim()).filter(Boolean);
                          if (parsed.length > 0) {
                            const existing = multiLocations.filter(l => l.trim() !== '');
                            setMultiLocations([...existing, ...parsed]);
                            textarea.value = '';
                          }
                        }
                      }}
                      style={{ 
                        background: 'var(--color-forest)', 
                        color: 'white', 
                        fontSize: '0.85rem', 
                        padding: '8px 12px', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Bulk Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Base Location</label>
                <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Event location..." />
              </div>
            )}

            <button type="submit" className="primary" style={{ width: '100%' }}><Plus size={16} /> Add Event</button>
          </form>

          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Events</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
              {events.map(event => (
                <div key={event.id} style={{ background: 'white', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)', border: '1px solid var(--color-surface)', position: 'relative' }}>
                  {editingEventId === event.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={editEventData.name} 
                        onChange={e => setEditEventData({...editEventData, name: e.target.value})} 
                        placeholder="Event Name"
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-surface)' }}
                      />
                      <input 
                        type="text" 
                        value={editEventData.organization} 
                        onChange={e => setEditEventData({...editEventData, organization: e.target.value})} 
                        placeholder="Organization"
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-surface)' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select 
                          value={editEventData.district} 
                          onChange={e => setEditEventData({...editEventData, district: e.target.value})}
                          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-surface)', flex: 1, background: 'white' }}
                        >
                          <option value="">Select District...</option>
                          {SRI_LANKA_DISTRICTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <input 
                          type="date" 
                          value={editEventData.event_date} 
                          onChange={e => setEditEventData({...editEventData, event_date: e.target.value})} 
                          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-surface)', flex: 1 }}
                        />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={editEventData.is_multi_location} 
                          onChange={e => setEditEventData({...editEventData, is_multi_location: e.target.checked})} 
                          style={{ width: 'auto' }}
                        />
                        Is Multi-Location?
                      </label>
                      {editEventData.is_multi_location ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {editEventData.locations.map((loc, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                              <input 
                                type="text" 
                                value={loc} 
                                onChange={e => {
                                  const newLocs = [...editEventData.locations];
                                  newLocs[idx] = e.target.value;
                                  setEditEventData({...editEventData, locations: newLocs});
                                }} 
                                placeholder={`Location ${idx + 1}`}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-surface)', flex: 1 }}
                              />
                              <button type="button" onClick={() => {
                                const newLocs = editEventData.locations.filter((_, i) => i !== idx);
                                setEditEventData({...editEventData, locations: newLocs});
                              }} style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', border: 'none', cursor: 'pointer' }}><X size={16}/></button>
                            </div>
                          ))}
                          <button type="button" onClick={() => setEditEventData({...editEventData, locations: [...editEventData.locations, '']})} style={{ background: 'transparent', border: '1px dashed var(--color-jade)', color: 'var(--color-forest)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', alignSelf: 'flex-start' }}>+ Add Location</button>
                        </div>
                      ) : (
                        <input 
                          type="text" 
                          value={editEventData.location} 
                          onChange={e => setEditEventData({...editEventData, location: e.target.value})} 
                          placeholder="Location"
                          style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-surface)' }}
                        />
                      )}
                      
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button type="button" onClick={() => handleEditEventSave(event.id)} className="primary" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>Save</button>
                        <button type="button" onClick={() => setEditingEventId(null)} className="secondary" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ margin: 0, color: 'var(--color-deep-forest)', fontSize: '1.1rem' }}>{event.name}</h4>
                          {event.organization && <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>{event.organization}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            type="button" 
                            onClick={() => handleEditEventClick(event)}
                            style={{ 
                              padding: '4px', 
                              borderRadius: '4px', 
                              background: 'var(--color-surface)',
                              color: 'var(--color-charcoal)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Edit Event"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteEvent(event.id)}
                            style={{ 
                              padding: '4px', 
                              borderRadius: '4px', 
                              background: 'var(--color-surface)',
                              color: 'var(--color-vibrant-rose)',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            title="Delete Event"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleToggleEventActive(event.id, event.is_active)}
                            style={{ 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '0.7rem', 
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
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.85rem', color: 'var(--color-charcoal)' }}>
                        {event.event_date && (
                          <div><strong>Date:</strong> {new Date(event.event_date).toLocaleDateString()}</div>
                        )}
                        {event.district && (
                          <div><strong>District:</strong> {event.district}</div>
                        )}
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)', marginTop: '4px' }}>
                        <strong>Location: </strong> 
                        {event.is_multi_location 
                          ? (event.locations && event.locations.length > 0 ? event.locations.join(', ') : 'No locations defined') 
                          : (event.location || 'Not specified')}
                        {event.is_multi_location && <span style={{ marginLeft: '4px', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>Multi-Location</span>}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {events.length === 0 && <div style={{ background: 'white', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center', color: 'var(--color-forest)' }}>No events added yet.</div>}
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
                    <div key={audit.id} style={{ borderBottom: '1px solid var(--color-surface)', paddingBottom: 'var(--spacing-sm)' }}>
                      <div className="flex-between" style={{ padding: '8px 0', cursor: 'pointer' }} onClick={() => handleToggleExpand(audit.id)}>
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
                          {(audit.before_photo_url || audit.after_photo_url) && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                              {audit.before_photo_url && (
                                <a 
                                  href={audit.before_photo_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ fontSize: '0.75rem', color: 'var(--color-teal)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: '600' }}
                                >
                                  📸 Before
                                </a>
                              )}
                              {audit.before_photo_url && audit.after_photo_url && (
                                <span style={{ fontSize: '0.75rem', color: '#ccc' }}>|</span>
                              )}
                              {audit.after_photo_url && (
                                <a 
                                  href={audit.after_photo_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ fontSize: '0.75rem', color: 'var(--color-teal)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: '600' }}
                                >
                                  📸 After
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }} onClick={(e) => e.stopPropagation()}>
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

                      {/* Expanded Section for Items & Proof Photos */}
                      {expandedAuditId === audit.id && (
                        <div style={{
                          background: 'var(--color-surface)',
                          padding: 'var(--spacing-md)',
                          borderRadius: 'var(--border-radius-md)',
                          marginTop: 'var(--spacing-xs)',
                          marginBottom: 'var(--spacing-sm)',
                          borderLeft: '4px solid var(--color-teal)'
                        }}>
                          <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--spacing-sm)', color: 'var(--color-deep-forest)' }}>
                            Items Logged with Evidence:
                          </h4>
                          {loadingItems ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-forest)' }}>Loading items...</p>
                          ) : auditItems.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-forest)' }}>No items logged yet.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {auditItems.map(item => (
                                <div key={item.id} className="flex-between" style={{ fontSize: '0.85rem', borderBottom: '1px dashed #e2edd5', paddingBottom: '4px' }}>
                                  <div>
                                    <strong style={{ color: 'var(--color-charcoal)' }}>{item.brands?.name}</strong>
                                    {item.brands?.is_custom && (
                                      <span style={{ fontSize: '0.75rem', background: 'var(--color-sour-apple)', color: 'var(--color-forest)', padding: '1px 4px', borderRadius: '3px', marginLeft: '6px' }}>
                                        Custom
                                      </span>
                                    )}
                                    <span style={{ marginLeft: '8px', color: 'var(--color-forest)' }}>x{item.count}</span>
                                  </div>
                                  <div>
                                    {item.proof_photo_url ? (
                                      <a 
                                        href={item.proof_photo_url} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        style={{ fontSize: '0.8rem', color: 'var(--color-teal)', textDecoration: 'none', fontWeight: 'bold' }}
                                      >
                                        View Proof 📸
                                      </a>
                                    ) : (
                                      <span style={{ fontSize: '0.8rem', color: '#bbb' }}>No Proof Photo</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
          background: 'rgba(47, 62, 52, 0.8)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)'
        }}>
          <div style={{ background: 'white', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
              {confirmDialog.type === 'team' ? 'Delete Team?' : confirmDialog.type === 'brand' ? 'Delete Brand?' : 'Delete Event?'}
            </h3>
            <p>
              {confirmDialog.type === 'team' 
                ? 'Are you sure you want to delete this team? This will delete all their audits and data.'
                : confirmDialog.type === 'brand'
                ? 'Are you sure you want to delete this brand?'
                : 'Are you sure you want to delete this event? This will also remove all associated teams and audits. This action cannot be undone.'}
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
