'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuditStore } from '@/store/auditStore';
import { supabase } from '@/lib/supabase';
import { syncCurrentState } from '@/hooks/useSync';
import { PlayCircle } from 'lucide-react';

export default function LandingPage() {
  const [registerName, setRegisterName] = useState('');
  const [auditName, setAuditName] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [auditError, setAuditError] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const store = useAuditStore();
  const router = useRouter();

  useEffect(() => {
    const fetchActiveEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          setEvents(data);
          if (data.length > 0) {
            setSelectedEventId(data[0].id);
          }
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
    if (!registerName.trim() || !selectedEventId) return;

    setRegisterError('');
    setRegisterSuccess('');
    setIsRegistering(true);

    try {
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
          event_id: selectedEventId
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
    if (!auditName.trim() || !selectedEventId) return;

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
        .select('id, status')
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
          supabase.from('audit_items').select('brand_id, count').eq('audit_id', auditData.id)
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
            count: item ? item.count : 0
          };
        });

        store.resumeAudit(
          teamData.name,
          teamData.id,
          auditData.id,
          selectedEventId,
          eventName,
          auditData.status,
          mergedBrands
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
        <h1 style={{ color: 'var(--color-teal)', marginBottom: 'var(--spacing-xs)', fontSize: '2.5rem' }}>
          Track The Trash
        </h1>
        <p style={{ fontSize: '1.1rem', marginBottom: 'var(--spacing-lg)', color: 'var(--color-forest)' }}>
          Beach Clean-up Brand Audit
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
            Select Beach Clean-up Event
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
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          )}
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
