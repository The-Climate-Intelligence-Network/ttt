'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, RefreshCw, Trophy, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all events on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, is_active')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setEvents(data);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    };
    fetchEvents();
  }, []);

  // Fetch stats based on selected event
  const fetchStats = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch teams for the selected event to ensure we show teams with 0 audits/items
      let teamsQuery = supabase.from('teams').select('id, name, event_id');
      if (selectedEventId !== 'all') {
        teamsQuery = teamsQuery.eq('event_id', selectedEventId);
      }
      const { data: teamsData, error: teamsError } = await teamsQuery;

      if (teamsError) {
        console.error('Error fetching teams:', teamsError.message);
      }

      // 2. Fetch all audit items
      const { data: itemsData, error: itemsError } = await supabase
        .from('audit_items')
        .select(`
          count,
          brand_id,
          brands ( name ),
          audits (
            team_id,
            teams (
              name,
              event_id
            )
          )
        `);
        
      if (itemsError) {
        console.error('Error fetching audit items:', itemsError.message);
      }

      if (itemsData) {
        let total = 0;
        const brandCounts = {};
        
        // Initialize team statistics map with all teams from this event
        const teamMap = {};
        if (teamsData) {
          teamsData.forEach(t => {
            teamMap[t.id] = {
              id: t.id,
              name: t.name,
              totalItems: 0,
              uniqueBrands: new Set()
            };
          });
        }

        itemsData.forEach(item => {
          const teamId = item.audits?.team_id;
          const eventId = item.audits?.teams?.event_id;
          const teamName = item.audits?.teams?.name;
          
          // Apply event filter
          if (selectedEventId !== 'all' && eventId !== selectedEventId) {
            return;
          }
          
          // Accumulate global item count
          total += item.count;
          
          // Accumulate brand tallies
          const brandName = item.brands?.name || 'Unknown';
          brandCounts[brandName] = (brandCounts[brandName] || 0) + item.count;
          
          // Accumulate team leaderboards
          if (teamId) {
            if (!teamMap[teamId]) {
              // Safety fallback for data inconsistency
              teamMap[teamId] = {
                id: teamId,
                name: teamName || 'Unknown Team',
                totalItems: 0,
                uniqueBrands: new Set()
              };
            }
            teamMap[teamId].totalItems += item.count;
            if (item.count > 0) {
              teamMap[teamId].uniqueBrands.add(item.brand_id);
            }
          }
        });
        
        // Format and sort Brand Statistics (descending of count)
        const sortedStats = Object.entries(brandCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
          
        // Format and sort Team Leaderboard (descending of unique brands found, secondary total items)
        const sortedTeamStats = Object.values(teamMap)
          .map(t => ({
            id: t.id,
            name: t.name,
            totalItems: t.totalItems,
            brandsCount: t.uniqueBrands.size
          }))
          .sort((a, b) => {
            if (b.brandsCount !== a.brandsCount) {
              return b.brandsCount - a.brandsCount;
            }
            if (b.totalItems !== a.totalItems) {
              return b.totalItems - a.totalItems;
            }
            return a.name.localeCompare(b.name);
          });
          
        setStats(sortedStats);
        setTeamStats(sortedTeamStats);
        setTotalItems(total);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Re-run query on event selection change and set up 10s auto-refresh
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  const maxBrandCount = stats.length > 0 ? stats[0].count : 1;
  const maxTeamBrands = teamStats.length > 0 ? Math.max(...teamStats.map(t => t.brandsCount)) : 1;

  return (
    <main style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1b2a20 0%, #2f4e3c 100%)', 
      color: 'white', 
      padding: 'var(--spacing-xl)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Dynamic responsive grid layout injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-panels {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-xl);
          width: 100%;
        }
        @media (max-width: 1024px) {
          .dashboard-panels {
            grid-template-columns: 1fr;
            gap: var(--spacing-lg);
          }
        }
        .panel-container {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--border-radius-lg);
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .leaderboard-card {
          background: rgba(255,255,255,0.06); 
          border: 1px solid rgba(255,255,255,0.05);
          padding: var(--spacing-lg); 
          border-radius: var(--border-radius-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          position: relative;
          overflow: hidden;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background 0.25s ease;
          cursor: default;
        }
        .leaderboard-card:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,0.1);
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />

      {/* Top navigation row */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
        <Link href="/admin" style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-xs)', 
          color: 'var(--color-jade)', 
          textDecoration: 'none', 
          fontWeight: '600',
          fontSize: '1rem',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => e.target.style.color = 'white'}
        onMouseLeave={(e) => e.target.style.color = 'var(--color-jade)'}
        >
          <ArrowLeft size={16} /> Back to Console
        </Link>
      </div>

      <header className="flex-between" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h1 style={{ color: 'var(--color-surface)', fontSize: '3rem', margin: 0 }}>Live Audit Dashboard</h1>
          
          {/* Integrated Inline Selector */}
          <div style={{ 
            color: 'var(--color-jade)', 
            fontSize: '1.2rem', 
            marginTop: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <span>Currently viewing:</span>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  padding: '4px 32px 4px 12px',
                  borderRadius: 'var(--border-radius-sm)',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;utf8,<svg fill=\'%2392C3A4\' height=\'16\' viewBox=\'0 0 24 24\' width=\'16\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/><path d=\'M0 0h24v24H0z\' fill=\'none\'/></svg>")',
                  backgroundPosition: 'right 8px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '16px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.target.style.borderColor = 'var(--color-sunflower)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                <option value="all" style={{ background: '#2f4e3c', color: 'white' }}>All Events (Aggregated)</option>
                {events.map(event => (
                  <option key={event.id} value={event.id} style={{ background: '#2f4e3c', color: 'white' }}>
                    {event.name} {event.is_active ? '(Active)' : '(Inactive)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
          <button 
            onClick={fetchStats}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              borderRadius: '50%',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Refresh Live Data"
            className="icon-only"
          >
            <RefreshCw size={20} className={isRefreshing ? 'spin-animation' : ''} style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
            }} />
          </button>
          <div>
            <div style={{ fontSize: '1.25rem', color: 'var(--color-jade)' }}>Total Items Found</div>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--color-sunflower)', lineHeight: 1 }}>{totalItems}</div>
          </div>
        </div>
      </header>

      {/* Dual Panel Layout */}
      <div className="dashboard-panels">
        
        {/* Left Panel: Brands tally in descending order */}
        <section className="panel-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'var(--spacing-sm)' }}>
            <BarChart3 size={24} style={{ color: 'var(--color-teal)' }} />
            <h2 style={{ fontSize: '1.5rem', color: 'white', margin: 0 }}>Brand Tally</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', overflowY: 'auto', maxHeight: '600px', paddingRight: '4px' }}>
            {stats.map((stat, i) => (
              <div key={stat.name} className="leaderboard-card">
                {/* Background percentage progress bar */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '4px',
                  width: `${(stat.count / maxBrandCount) * 100}%`,
                  background: 'linear-gradient(to right, var(--color-teal), var(--color-sour-apple))',
                  borderRadius: '0 2px 2px 0',
                  opacity: 0.8,
                  transition: 'width 0.5s ease-out'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <span style={{ 
                      fontSize: '1.5rem', 
                      color: i === 0 ? 'var(--color-sunflower)' : 'var(--color-jade)', 
                      fontWeight: 800,
                      textShadow: i === 0 ? '0 0 10px rgba(252, 206, 85, 0.3)' : 'none',
                      minWidth: '2.5rem'
                    }}>
                      #{i + 1}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{stat.name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-teal)', lineHeight: 1 }}>{stat.count}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-jade)', marginTop: '4px' }}>
                      {totalItems > 0 ? ((stat.count / totalItems) * 100).toFixed(1) : 0}% of total
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {!loading && stats.length === 0 && (
              <div style={{ 
                padding: 'var(--spacing-xl)',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px dashed rgba(255,255,255,0.08)'
              }}>
                <p style={{ color: 'var(--color-jade)', margin: 0 }}>No brand items audited yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Team leaderboards in descending order of unique brands */}
        <section className="panel-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'var(--spacing-sm)' }}>
            <Trophy size={24} style={{ color: 'var(--color-sunflower)' }} />
            <h2 style={{ fontSize: '1.5rem', color: 'white', margin: 0 }}>Team Leaderboard</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', overflowY: 'auto', maxHeight: '600px', paddingRight: '4px' }}>
            {teamStats.map((team, i) => (
              <div key={team.id} className="leaderboard-card">
                {/* Background percentage progress bar based on brands count */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '4px',
                  width: `${(team.brandsCount / maxTeamBrands) * 100}%`,
                  background: 'linear-gradient(to right, var(--color-sunflower), var(--color-vibrant-rose))',
                  borderRadius: '0 2px 2px 0',
                  opacity: 0.8,
                  transition: 'width 0.5s ease-out'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <span style={{ 
                      fontSize: '1.5rem', 
                      color: i === 0 ? 'var(--color-sunflower)' : 'var(--color-jade)', 
                      fontWeight: 800,
                      textShadow: i === 0 ? '0 0 10px rgba(252, 206, 85, 0.3)' : 'none',
                      minWidth: '2.5rem'
                    }}>
                      #{i + 1}
                    </span>
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 600, display: 'block' }}>{team.name}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-sunflower)', lineHeight: 1 }}>
                        {team.brandsCount}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-jade)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Brands
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 'var(--spacing-md)', minWidth: '80px' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-sour-apple)', lineHeight: 1 }}>
                        {team.totalItems}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-jade)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Items
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!loading && teamStats.length === 0 && (
              <div style={{ 
                padding: 'var(--spacing-xl)',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px dashed rgba(255,255,255,0.08)'
              }}>
                <p style={{ color: 'var(--color-jade)', margin: 0 }}>No teams registered for this event yet.</p>
              </div>
            )}
          </div>
        </section>

      </div>
      
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-2xl)', width: '100%' }}>
          <span style={{ fontSize: '1.25rem', color: 'var(--color-jade)' }}>Loading dashboard statistics...</span>
        </div>
      )}
    </main>
  );
}
