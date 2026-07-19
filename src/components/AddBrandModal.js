import { useState, useRef } from 'react';
import { useAuditStore } from '@/store/auditStore';
import { X, Search, Camera, Upload, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';
import CameraModal from '@/components/CameraModal';
import { supabase } from '@/lib/supabase';
import { syncCurrentState } from '@/hooks/useSync';

export default function AddBrandModal({ onClose }) {
  const store = useAuditStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null); // null, string (name) or object (existing brand)
  const [isCustom, setIsCustom] = useState(false);

  // Photo upload states
  const [isUploading, setIsUploading] = useState(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  const fileInputRef = useRef(null);

  const filteredBrands = store.brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exactMatch = store.brands.some(b => b.name.toLowerCase() === searchQuery.toLowerCase());

  const handleSelectBrand = (brand) => {
    setSelectedBrand(brand);
    setIsCustom(false);
    setProofPhotoUrl('');
  };

  const handleSelectCustom = () => {
    if (!searchQuery.trim()) return;
    setSelectedBrand({ name: searchQuery.trim() });
    setIsCustom(true);
    setProofPhotoUrl('');
  };

  // Process & upload brand proof photo
  const processAndUploadProof = async (file) => {
    setIsUploading(true);
    try {
      // 1. Compress image to < 1MB
      const compressed = await compressImage(file, 1024 * 1024);

      // 2. Upload to Supabase Storage bucket 'ttt'
      // Use clean path: audits/{auditId}/proofs/{brandName_or_id}-{timestamp}.jpg
      const brandIdentifier = isCustom 
        ? selectedBrand.name.toLowerCase().replace(/\s+/g, '-')
        : selectedBrand.id;
      
      const filePath = `audits/${store.auditId}/proofs/${brandIdentifier}-${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from('ttt')
        .upload(filePath, compressed, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ttt')
        .getPublicUrl(filePath);

      setProofPhotoUrl(publicUrl);
    } catch (err) {
      console.error('Error uploading proof photo:', err);
      alert('Failed to upload proof photo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndUploadProof(file);
    }
  };

  const handleCameraCapture = async (file) => {
    await processAndUploadProof(file);
  };

  const handleRemovePhoto = async () => {
    if (window.confirm('Are you sure you want to remove the proof photo?')) {
      if (proofPhotoUrl) {
        try {
          const path = proofPhotoUrl.split('/public/ttt/')[1];
          if (path) {
            await supabase.storage.from('ttt').remove([path]);
          }
        } catch (err) {
          console.error('Failed to delete proof photo from storage:', err);
        }
      }
      setProofPhotoUrl('');
    }
  };

  const confirmAdd = async () => {
    if (isUploading) return;

    if (isCustom) {
      store.addCustomBrand(selectedBrand.name, proofPhotoUrl);
    } else {
      // It's an existing brand
      store.incrementBrand(selectedBrand.id, proofPhotoUrl);
    }

    // Force immediate sync of the new brand and proof photo
    await syncCurrentState({ syncTally: true });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(47, 62, 52, 0.95)', zIndex: 1000,
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }}
        onChange={handleFileChange} 
      />

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
            
            <h3 style={{ color: 'var(--color-deep-forest)', marginBottom: 'var(--spacing-sm)' }}>Photo Evidence (Optional)</h3>
            
            <p style={{ marginBottom: 'var(--spacing-lg)', fontSize: '1.05rem', color: 'var(--color-charcoal)' }}>
              Optionally upload or snap a photo of the <strong>{selectedBrand.name}</strong> item you found to log this tally.
            </p>

            {/* Photo Proof Selection/Preview Card */}
            <div style={{
              border: proofPhotoUrl ? 'none' : '2px dashed var(--color-jade)',
              borderRadius: 'var(--border-radius-md)',
              background: 'var(--color-surface)',
              minHeight: '150px',
              marginBottom: 'var(--spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {isUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--color-forest)' }}>
                  <Loader2 className="spin-animation" size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Compressing & Uploading...</span>
                </div>
              ) : proofPhotoUrl ? (
                <div style={{ width: '100%', height: '150px', position: 'relative' }}>
                  <img 
                    src={proofPhotoUrl} 
                    alt="Brand Evidence" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.6)', color: 'white',
                    padding: '4px 8px', fontSize: '0.75rem', fontWeight: 'bold',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span>Evidence Photo</span>
                    <button 
                      onClick={handleRemovePhoto}
                      style={{ background: 'transparent', color: 'var(--color-vibrant-rose)', padding: '2px', cursor: 'pointer' }}
                      title="Remove Photo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: 'var(--spacing-md)' }}>
                  <ImageIcon size={32} style={{ color: 'var(--color-jade)', marginBottom: '8px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setShowCamera(true)}
                      style={{ padding: '8px 12px', fontSize: '0.85rem', background: 'white', border: '1px solid var(--color-jade)', color: 'var(--color-deep-forest)' }}
                    >
                      <Camera size={14} /> Take Photo
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: '8px 12px', fontSize: '0.85rem', background: 'white', border: '1px solid var(--color-jade)', color: 'var(--color-deep-forest)' }}
                    >
                      <Upload size={14} /> Upload
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <button 
                className="primary" 
                style={{ width: '100%' }} 
                onClick={confirmAdd}
                disabled={isUploading}
              >
                Add Brand to Tally
              </button>
              <button className="secondary" style={{ width: '100%' }} onClick={() => setSelectedBrand(null)} disabled={isUploading}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <CameraModal 
          onClose={() => setShowCamera(false)} 
          onCapture={handleCameraCapture} 
        />
      )}
    </div>
  );
}
