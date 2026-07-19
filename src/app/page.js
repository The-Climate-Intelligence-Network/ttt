'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuditStore } from '@/store/auditStore';
import { supabase } from '@/lib/supabase';
import { syncCurrentState } from '@/hooks/useSync';
import { PlayCircle, Search } from 'lucide-react';

export default function LandingPage() {
  const [registerName, setRegisterName] = useState('');
  const [auditName, setAuditName] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [auditError, setAuditError] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationRef = useRef(null);

  const store = useAuditStore();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchActiveEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, is_multi_location, locations')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          setEvents(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEvents(false);
      }
    };
    
    fetchActiveEvents();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!selectedEventId) {
      setRegisterError('Please select a clean-up event first.');
      return;
    }
    if (!registerName.trim()) return;

    setRegisterError('');
    setRegisterSuccess('');
    setIsRegistering(true);

    try {
      const selectedEvent = events.find(ev => ev.id === selectedEventId);
      if (selectedEvent?.is_multi_location && !selectedLocation.trim()) {
        setRegisterError('Please select or enter a location.');
        setIsRegistering(false);
        return;
      }

      // 1. Check if team already exists under this event
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', registerName.trim())
        .eq('event_id', selectedEventId)
        .maybeSingle();

      if (teamError) {
        setRegisterError('Error checking team. Please try again.');
        return;
      }

      if (teamData) {
        setRegisterError(`Team "${registerName.trim()}" is already registered for this event.`);
        return;
      }

      // 2. Insert new team
      const { data: newTeam, error: insertError } = await supabase
        .from('teams')
        .insert({
          name: registerName.trim(),
          event_id: selectedEventId,
          location: selectedLocation.trim() || null
        })
        .select()
        .single();

      if (insertError || !newTeam) {
        setRegisterError('Failed to register team. Please try again.');
        return;
      }

      // Success!
      setRegisterSuccess(`Team "${registerName.trim()}" registered successfully!`);
      setAuditName(registerName.trim()); // Autofill the bottom section
      setRegisterName(''); // Clear register input
    } catch (err) {
      console.error(err);
      setRegisterError('An unexpected error occurred.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleStartAudit = async (e) => {
    e.preventDefault();
    if (!selectedEventId) {
      setAuditError('Please select a clean-up event first.');
      return;
    }
    if (!auditName.trim()) return;

    setAuditError('');
    setIsStarting(true);

    try {
      const selectedEvent = events.find(ev => ev.id === selectedEventId);
      const eventName = selectedEvent ? selectedEvent.name : '';

      // 1. Check if team exists under this event
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', auditName.trim())
        .eq('event_id', selectedEventId)
        .maybeSingle();

      if (teamError) {
        setAuditError('Error verifying team. Please try again.');
        return;
      }

      if (!teamData) {
        setAuditError(`Team "${auditName.trim()}" is not registered. Please register above.`);
        return;
      }

      // 2. Check if an audit already exists for this team
      const { data: auditData, error: auditError } = await supabase
        .from('audits')
        .select('id, status, before_photo_url, after_photo_url')
        .eq('team_id', teamData.id)
        .maybeSingle();

      if (auditError) {
        setAuditError('Error checking active audits.');
        return;
      }

      if (auditData) {
        // Resume existing audit
        const [brandsResponse, itemsResponse] = await Promise.all([
          supabase.from('brands').select('id, name, is_custom'),
          supabase.from('audit_items').select('brand_id, count, proof_photo_url').eq('audit_id', auditData.id)
        ]);

        if (brandsResponse.error) {
          setAuditError('Error loading brand configuration.');
          return;
        }

        const dbBrands = brandsResponse.data || [];
        const auditItems = itemsResponse.data || [];

        const mergedBrands = dbBrands.map(dbb => {
          const item = auditItems.find(ai => ai.brand_id === dbb.id);
          return {
            id: dbb.id,
            name: dbb.name,
            is_custom: dbb.is_custom,
            count: item ? item.count : 0,
            proof_photo_url: item ? (item.proof_photo_url || '') : ''
          };
        });

        store.resumeAudit(
          teamData.name,
          teamData.id,
          auditData.id,
          selectedEventId,
          eventName,
          auditData.status,
          mergedBrands,
          auditData.before_photo_url || '',
          auditData.after_photo_url || ''
        );

        if (auditData.status === 'completed') {
          router.push('/audit/scorecard');
        } else {
          router.push('/audit');
        }
      } else {
        // Start a new audit for this pre-registered team!
        const auditId = crypto.randomUUID();
        
        // Insert audit immediately into supabase
        const { error: auditInsertError } = await supabase
          .from('audits')
          .insert({
            id: auditId,
            team_id: teamData.id,
            status: 'in_progress'
          });
          
        if (auditInsertError) {
          setAuditError('Failed to start audit in database. Please try again.');
          return;
        }

        store.startAudit(teamData.name, selectedEventId, eventName, teamData.id, auditId);
        // Force immediate sync of the audit metadata/status
        await syncCurrentState({ syncTally: false });
        router.push('/audit');
      }
    } catch (err) {
      console.error(err);
      setAuditError('An unexpected error occurred.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <main className="mobile-container flex-center">
      <div style={{ textAlign: 'center', padding: 'var(--spacing-lg) 0', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-md)' }}>
          <a href="https://linktr.ee/climate.intelligence" target="_blank" rel="noopener noreferrer">
            <img src="/CINHorizontal.png" alt="CIN Logo" style={{ height: '50px', cursor: 'pointer' }} />
          </a>
        </div>
        <h1 style={{ color: 'var(--color-teal)', marginBottom: 'var(--spacing-xs)', fontSize: '2.5rem' }}>
          Track The Trash
        </h1>
        <p style={{ fontSize: '1.1rem', marginBottom: 'var(--spacing-lg)', color: 'var(--color-forest)' }}>
          Clean-up Brand Audit
        </p>

        {/* Global Event Selection */}
        <div style={{ 
          background: 'white', 
          padding: 'var(--spacing-md)', 
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          marginBottom: 'var(--spacing-md)',
          textAlign: 'left'
        }}>
          <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '700', color: 'var(--color-deep-forest)' }}>
            Select Clean-up Event
          </label>
          {loadingEvents ? (
            <p style={{ color: 'var(--color-forest)' }}>Loading active events...</p>
          ) : events.length === 0 ? (
            <p style={{ color: 'var(--color-vibrant-rose)', fontWeight: 'bold' }}>
              No active events available. Please contact an admin.
            </p>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setSelectedLocation('');
                setRegisterError('');
                setRegisterSuccess('');
                setAuditError('');
              }}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '1.1rem',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--color-jade)',
                background: 'white',
                color: 'var(--color-charcoal)'
              }}
            >
              <option value="" disabled>-- Select Clean-up Event --</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          )}

          {(() => {
            const ev = events.find(e => e.id === selectedEventId);
            if (ev && ev.is_multi_location) {
              const filteredLocations = (Array.isArray(ev.locations) ? ev.locations : [])
                .filter(loc => loc.toLowerCase().includes(selectedLocation.toLowerCase()));
              const exactMatch = (Array.isArray(ev.locations) ? ev.locations : [])
                .some(loc => loc.toLowerCase() === selectedLocation.trim().toLowerCase());

              return (
                <div ref={locationRef} style={{ marginTop: 'var(--spacing-md)', position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '700', color: 'var(--color-deep-forest)' }}>
                    Select or Enter Location
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-forest)' }} />
                    <input
                      type="text"
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                        setIsLocationDropdownOpen(true);
                      }}
                      onFocus={() => setIsLocationDropdownOpen(true)}
                      placeholder="Type to search or select location..."
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        fontSize: '1.1rem',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--color-jade)',
                        background: 'white',
                        color: 'var(--color-charcoal)'
                      }}
                    />
                  </div>

                  {isLocationDropdownOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'white',
                      border: '1px solid var(--color-jade)',
                      borderRadius: 'var(--border-radius-md)',
                      marginTop: 'var(--spacing-xs)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {selectedLocation.trim() && !exactMatch && (
                        <div 
                          onClick={() => {
                            setIsLocationDropdownOpen(false);
                          }}
                          style={{ 
                            padding: 'var(--spacing-sm) var(--spacing-md)', 
                            borderBottom: '1px solid var(--color-surface)', 
                            cursor: 'pointer', 
                            color: 'var(--color-teal)', 
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}
                        >
                          + Use "{selectedLocation}" as a new location
                        </div>
                      )}
                      
                      {filteredLocations.map((loc, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setSelectedLocation(loc);
                            setIsLocationDropdownOpen(false);
                          }}
                          style={{ 
                            padding: 'var(--spacing-sm) var(--spacing-md)', 
                            borderBottom: '1px solid var(--color-surface)', 
                            cursor: 'pointer', 
                            fontSize: '1.1rem',
                            color: 'var(--color-charcoal)',
                            background: 'white',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'var(--color-surface)'}
                          onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                          {loc}
                        </div>
                      ))}
                      
                      {filteredLocations.length === 0 && !exactMatch && (
                        <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--color-forest)', fontSize: '0.95rem' }}>
                          No locations found. Type to use a custom location.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Main interactive form panel */}
        <div style={{ 
          background: 'white', 
          padding: 'var(--spacing-xl)', 
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          textAlign: 'left'
        }}>
          
          {/* Section 1: Register Team */}
          <form onSubmit={handleRegister} style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--color-deep-forest)', marginBottom: 'var(--spacing-xs)' }}>
              1. Register a Team
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-forest)', marginBottom: 'var(--spacing-md)' }}>
              Create a unique team name for this event.
            </p>

            {registerError && (
              <div style={{ color: 'var(--color-vibrant-rose)', marginBottom: 'var(--spacing-sm)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {registerError}
              </div>
            )}
            {registerSuccess && (
              <div style={{ color: 'var(--color-forest)', marginBottom: 'var(--spacing-sm)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {registerSuccess}
              </div>
            )}

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <input 
                type="text" 
                placeholder="Unique team name..."
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
                disabled={events.length === 0 || loadingEvents || isRegistering}
                style={{ fontSize: '1.1rem' }}
              />
            </div>

            <button 
              type="submit" 
              className="primary" 
              style={{ width: '100%', fontSize: '1.1rem', padding: '0.75rem' }}
              disabled={events.length === 0 || loadingEvents || isRegistering}
            >
              {isRegistering ? 'Registering...' : 'Register Team'}
            </button>
          </form>

          {/* Elegant Section Divider */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: 'var(--spacing-xl) 0', 
            color: 'var(--color-jade)' 
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-surface)' }}></div>
            <span style={{ padding: '0 10px', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Then
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-surface)' }}></div>
          </div>

          {/* Section 2: Start or Continue Audit */}
          <form onSubmit={handleStartAudit}>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--color-deep-forest)', marginBottom: 'var(--spacing-xs)' }}>
              2. Start / Continue Audit
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-forest)', marginBottom: 'var(--spacing-md)' }}>
              Enter your registered team name to begin or resume tallying.
            </p>

            {auditError && (
              <div style={{ color: 'var(--color-vibrant-rose)', marginBottom: 'var(--spacing-sm)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                {auditError}
              </div>
            )}

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <input 
                type="text" 
                placeholder="Registered team name..."
                value={auditName}
                onChange={(e) => setAuditName(e.target.value)}
                required
                disabled={events.length === 0 || loadingEvents || isStarting}
                style={{ fontSize: '1.1rem' }}
              />
            </div>

            <button 
              type="submit" 
              className="primary" 
              style={{ width: '100%', fontSize: '1.1rem', padding: '0.75rem', background: 'var(--color-teal)', color: 'white' }}
              disabled={events.length === 0 || loadingEvents || isStarting}
            >
              <PlayCircle size={20} /> {isStarting ? 'Loading...' : 'Start / Continue Audit'}
            </button>
          </form>

        </div>
      </div>
    </main>
  );
}
