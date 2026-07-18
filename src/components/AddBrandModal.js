import { useState } from 'react';
import { useAuditStore } from '@/store/auditStore';
import { X, Search, Camera } from 'lucide-react';

export default function AddBrandModal({ onClose }) {
  const store = useAuditStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null); // null, string (name) or object (existing brand)
  const [isCustom, setIsCustom] = useState(false);

  const filteredBrands = store.brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exactMatch = store.brands.some(b => b.name.toLowerCase() === searchQuery.toLowerCase());

  const handleSelectBrand = (brand) => {
    setSelectedBrand(brand);
    setIsCustom(false);
  };

  const handleSelectCustom = () => {
    if (!searchQuery.trim()) return;
    setSelectedBrand({ name: searchQuery.trim() });
    setIsCustom(true);
  };

  const confirmAdd = () => {
    if (isCustom) {
      store.addCustomBrand(selectedBrand.name);
      // We need to find the newly added brand ID to increment it
      // but addCustomBrand doesn't return the ID. 
      // It's fine, they can just press + on the main screen, 
      // or we can just let it appear with count 0 and they press +.
      // Actually, it's better if adding it also increments it.
      // For simplicity, let's just close modal, and they can see it in the list.
    } else {
      // It's an existing brand
      if (selectedBrand.count === 0) {
        store.incrementBrand(selectedBrand.id);
      }
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(47, 62, 52, 0.95)', zIndex: 1000,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="icon-only" onClick={onClose} style={{ color: 'white', background: 'transparent' }}>
          <X size={32} />
        </button>
      </div>
      
      {!selectedBrand ? (
        <div style={{ padding: 'var(--spacing-md)', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: 'white', marginBottom: 'var(--spacing-lg)' }}>Add Brand</h2>
          
          <div style={{ position: 'relative', marginBottom: 'var(--spacing-lg)' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--color-forest)' }} />
            <input 
              type="text" 
              placeholder="Search brands..." 
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '40px', fontSize: '1.2rem' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', background: 'white', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)' }}>
            {searchQuery && !exactMatch && (
              <div 
                onClick={handleSelectCustom}
                style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-surface)', cursor: 'pointer', color: 'var(--color-teal)', fontWeight: 'bold' }}
              >
                + Add "{searchQuery}" as a new custom brand
              </div>
            )}
            
            {filteredBrands.map(b => (
              <div 
                key={b.id} 
                onClick={() => handleSelectBrand(b)}
                style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-surface)', cursor: 'pointer', fontSize: '1.1rem' }}
              >
                {b.name}
              </div>
            ))}
            
            {filteredBrands.length === 0 && exactMatch === false && (
              <div style={{ padding: 'var(--spacing-md)', color: 'var(--color-forest)' }}>
                No brands found. Type to add a custom brand.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: 'var(--spacing-xl)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'inline-flex', background: 'var(--color-surface)', padding: '1rem', borderRadius: '50%', marginBottom: 'var(--spacing-md)', color: 'var(--color-teal)' }}>
              <Camera size={48} />
            </div>
            <h3 style={{ color: 'var(--color-deep-forest)', marginBottom: 'var(--spacing-sm)' }}>Photo Proof Required</h3>
            <p style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.1rem' }}>
              You are adding <strong>{selectedBrand.name}</strong>. Please remember to take a photo of one item of the brand as proof and keep it on your phone.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <button className="primary" style={{ width: '100%' }} onClick={confirmAdd}>
                Understood, Add Brand
              </button>
              <button className="secondary" style={{ width: '100%' }} onClick={() => setSelectedBrand(null)}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
