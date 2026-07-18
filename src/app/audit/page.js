'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuditStore } from '@/store/auditStore';
import { Plus, Minus, CheckCircle, Search } from 'lucide-react';
import { syncCurrentState } from '@/hooks/useSync';
import AddBrandModal from '@/components/AddBrandModal';

export default function AuditPage() {
  const store = useAuditStore();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (store.status === 'not_started') {
      router.replace('/');
    }
  }, [store.status, router]);

  if (store.status === 'not_started') return null;

  const handleCompleteAudit = async () => {
    store.completeAudit();
    // Sync immediately on complete so final counts and status are saved right away
    await syncCurrentState({ syncTally: true });
    router.push('/audit/scorecard');
  };

  // Sort brands: custom ones or those with count > 0 at top? 
  // Let's just sort alphabetically, but pin those with count > 0 at top.
  const activeBrands = store.brands.filter(b => b.count > 0).sort((a, b) => b.count - a.count);
  
  const displayBrands = activeBrands;

  return (
    <main className="mobile-container" style={{ paddingBottom: '100px', paddingTop: 'var(--spacing-md)' }}>
      <div className="flex-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ marginBottom: 0, color: 'var(--color-teal)' }}>{store.teamName}</h2>
        <div style={{ background: 'var(--color-jade)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
          {activeBrands.reduce((acc, b) => acc + b.count, 0)} Items
        </div>
      </div>

      <button 
        className="secondary" 
        style={{ width: '100%', marginBottom: 'var(--spacing-lg)', background: 'white' }}
        onClick={() => setIsModalOpen(true)}
      >
        <Search size={20} /> Find or Add Brand
      </button>

      <div>
        {displayBrands.map(brand => (
          <div key={brand.id} className="tally-card">
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-deep-forest)' }}>{brand.name}</h3>
              {brand.is_custom && <span style={{ fontSize: '0.75rem', color: 'var(--color-forest)', background: 'var(--color-sour-apple)', padding: '2px 6px', borderRadius: '4px' }}>Custom</span>}
            </div>
            
            <div className="flex-center" style={{ gap: 'var(--spacing-md)' }}>
              <button 
                className="icon-only" 
                style={{ background: 'var(--color-surface)', color: 'var(--color-deep-forest)' }}
                onClick={() => store.decrementBrand(brand.id)}
                disabled={brand.count === 0}
              >
                <Minus size={20} />
              </button>
              
              <span className="tally-count">{brand.count}</span>
              
              <button 
                className="icon-only" 
                style={{ background: 'var(--color-sunflower)', color: 'var(--color-deep-forest)' }}
                onClick={() => store.incrementBrand(brand.id)}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bottom-action-bar">
        <button 
          className="primary" 
          style={{ width: '100%', maxWidth: '400px', fontSize: '1.2rem', padding: '1rem' }}
          onClick={() => setShowConfirmDialog(true)}
        >
          <CheckCircle size={24} /> Complete Audit
        </button>
      </div>

      {showConfirmDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(47, 62, 52, 0.8)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)'
        }}>
          <div style={{ background: 'white', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Complete Audit?</h3>
            <p>Are you sure you want to complete this audit? You won't be able to log more items once completed.</p>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
              <button className="secondary" style={{ flex: 1 }} onClick={() => setShowConfirmDialog(false)}>Cancel</button>
              <button className="primary" style={{ flex: 1 }} onClick={handleCompleteAudit}>Complete</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && <AddBrandModal onClose={() => setIsModalOpen(false)} />}
    </main>
  );
}
