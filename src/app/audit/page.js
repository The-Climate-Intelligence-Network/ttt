'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuditStore } from '@/store/auditStore';
import { Plus, Minus, CheckCircle, Search, Camera, Upload, Trash2, Loader2, AlertCircle, Sparkles, ImageIcon } from 'lucide-react';
import { syncCurrentState } from '@/hooks/useSync';
import AddBrandModal from '@/components/AddBrandModal';
import CameraModal from '@/components/CameraModal';
import { compressImage } from '@/lib/imageCompressor';
import { supabase } from '@/lib/supabase';

export default function AuditPage() {
  const store = useAuditStore();
  const router = useRouter();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Photo uploading states
  const [isUploadingBefore, setIsUploadingBefore] = useState(false);
  const [isUploadingAfter, setIsUploadingAfter] = useState(false);
  
  // Camera Modal state
  const [cameraType, setCameraType] = useState(null); // 'before', 'after', or null

  // Nudge states
  const [showBeforePhotoNudge, setShowBeforePhotoNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  // Deletion confirm modal state
  const [photoToDelete, setPhotoToDelete] = useState(null); // 'before', 'after', or null

  // Hidden file inputs
  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  useEffect(() => {
    if (store.status === 'not_started') {
      router.replace('/');
      return;
    }

    const loadDbBrands = async () => {
      try {
        const { data, error } = await supabase
          .from('brands')
          .select('id, name, is_custom')
          .order('name');
        if (!error && data) {
          store.setDbBrands(data);
        }
      } catch (err) {
        console.error('Error fetching db brands:', err);
      }
    };

    loadDbBrands();
  }, [store.status, router]);

  // Reactive nudge trigger: show nudge if brand count > 0, beforePhoto is missing, and not dismissed
  useEffect(() => {
    const hasActiveBrands = store.brands.some(b => b.count > 0);
    if (hasActiveBrands && !store.beforePhotoUrl && !nudgeDismissed) {
      setShowBeforePhotoNudge(true);
    } else {
      setShowBeforePhotoNudge(false);
    }
  }, [store.brands, store.beforePhotoUrl, nudgeDismissed]);

  if (store.status === 'not_started') return null;

  const handleCompleteAudit = async () => {
    store.completeAudit();
    // Sync immediately on complete so final counts and status are saved right away
    await syncCurrentState({ syncTally: true });
    router.push('/audit/scorecard');
  };

  // Image upload and compression handler
  const processAndUploadPhoto = async (file, type) => {
    if (type === 'before') setIsUploadingBefore(true);
    else setIsUploadingAfter(true);

    try {
      // 1. Compress image client-side to below 1 MB
      const compressedFile = await compressImage(file, 1024 * 1024);

      // 2. Upload to Supabase Storage bucket 'ttt'
      const timestamp = Date.now();
      const filePath = `audits/${store.auditId}/${type}-${timestamp}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('ttt')
        .upload(filePath, compressedFile, {
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

      // 4. Update Zustand Store
      if (type === 'before') {
        store.setBeforePhotoUrl(publicUrl);
      } else {
        store.setAfterPhotoUrl(publicUrl);
      }

      // 5. Instantly Sync current state to Supabase
      await syncCurrentState({ syncTally: false });

    } catch (err) {
      console.error('Error processing/uploading image:', err);
      alert('Failed to upload image: ' + err.message);
    } finally {
      if (type === 'before') setIsUploadingBefore(false);
      else setIsUploadingAfter(false);
    }
  };

  // Handle standard file picker
  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndUploadPhoto(file, type);
    }
  };

  // Handle live camera capture
  const handleCameraCapture = async (file) => {
    if (cameraType) {
      await processAndUploadPhoto(file, cameraType);
    }
  };

  // Remove photo from storage & store
  const executePhotoRemoval = async (type) => {
    const url = type === 'before' ? store.beforePhotoUrl : store.afterPhotoUrl;
    if (url) {
      try {
        // Extract the storage path relative to the bucket from the public URL
        const path = url.split('/public/ttt/')[1];
        if (path) {
          await supabase.storage.from('ttt').remove([path]);
        }
      } catch (err) {
        console.error('Failed to delete photo from storage:', err);
      }
    }

    if (type === 'before') {
      store.setBeforePhotoUrl('');
    } else {
      store.setAfterPhotoUrl('');
    }
    await syncCurrentState({ syncTally: false });
  };

  // Sort brands: pin active ones (count > 0) to top, then alphabetical
  const activeBrands = store.brands.filter(b => b.count > 0).sort((a, b) => b.count - a.count);
  const displayBrands = activeBrands;

  return (
    <main className="mobile-container" style={{ paddingBottom: '100px', paddingTop: 'var(--spacing-md)' }}>
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        accept="image/*" 
        ref={beforeInputRef} 
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'before')} 
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={afterInputRef} 
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'after')} 
      />

      <div className="flex-between" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h2 style={{ marginBottom: 0, color: 'var(--color-teal)' }}>{store.teamName}</h2>
        <div style={{ background: 'var(--color-jade)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
          {activeBrands.reduce((acc, b) => acc + b.count, 0)} Items
        </div>
      </div>

      {/* Side-by-Side Photo Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 'var(--spacing-md)', 
        marginBottom: 'var(--spacing-lg)' 
      }}>
        {/* Before Photo Card */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--border-radius-lg)',
          border: store.beforePhotoUrl ? 'none' : '2px dashed var(--color-jade)',
          padding: 'var(--spacing-md)',
          textAlign: 'center',
          position: 'relative',
          minHeight: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {isUploadingBefore ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--color-forest)' }}>
              <Loader2 className="spin-animation" size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Uploading...</span>
            </div>
          ) : store.beforePhotoUrl ? (
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 5 }}>
              <img 
                src={store.beforePhotoUrl} 
                alt="Before Beach" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.6)', color: 'white',
                padding: '6px 8px', fontSize: '0.75rem', fontWeight: 'bold',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                zIndex: 10
              }}>
                <span>Before Photo</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoToDelete('before');
                  }} 
                  style={{ 
                    background: 'transparent', 
                    color: 'var(--color-vibrant-rose)', 
                    padding: '6px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20
                  }}
                  title="Delete Photo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-deep-forest)', marginBottom: '8px' }}>
                Before Photo
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCameraType('before')}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-deep-forest)', border: '1px solid var(--color-jade)' }}
                  title="Take Photo"
                >
                  <Camera size={14} /> Camera
                </button>
                <button 
                  onClick={() => beforeInputRef.current?.click()}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-deep-forest)', border: '1px solid var(--color-jade)' }}
                  title="Upload Photo"
                >
                  <Upload size={14} /> Upload
                </button>
              </div>
            </>
          )}
        </div>

        {/* After Photo Card */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--border-radius-lg)',
          border: store.afterPhotoUrl ? 'none' : '2px dashed var(--color-jade)',
          padding: 'var(--spacing-md)',
          textAlign: 'center',
          position: 'relative',
          minHeight: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {isUploadingAfter ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--color-forest)' }}>
              <Loader2 className="spin-animation" size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Uploading...</span>
            </div>
          ) : store.afterPhotoUrl ? (
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 5 }}>
              <img 
                src={store.afterPhotoUrl} 
                alt="After Beach" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.6)', color: 'white',
                padding: '6px 8px', fontSize: '0.75rem', fontWeight: 'bold',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                zIndex: 10
              }}>
                <span>After Photo</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoToDelete('after');
                  }} 
                  style={{ 
                    background: 'transparent', 
                    color: 'var(--color-vibrant-rose)', 
                    padding: '6px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20
                  }}
                  title="Delete Photo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-deep-forest)', marginBottom: '8px' }}>
                After Photo
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setCameraType('after')}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-deep-forest)', border: '1px solid var(--color-jade)' }}
                  title="Take Photo"
                >
                  <Camera size={14} /> Camera
                </button>
                <button 
                  onClick={() => afterInputRef.current?.click()}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-deep-forest)', border: '1px solid var(--color-jade)' }}
                  title="Upload Photo"
                >
                  <Upload size={14} /> Upload
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gentle Before Photo Nudge Alert */}
      {showBeforePhotoNudge && (
        <div style={{
          background: 'var(--color-sour-apple)',
          color: 'var(--color-deep-forest)',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--border-radius-md)',
          marginBottom: 'var(--spacing-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--color-jade)',
          boxShadow: '0 4px 12px rgba(219, 245, 142, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--color-forest)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              💡: Consider adding a <strong>Before Photo</strong> of the beach!
            </span>
          </div>
          <button 
            style={{ 
              background: 'transparent', 
              color: 'var(--color-deep-forest)', 
              padding: '2px 6px', 
              fontSize: '0.8rem',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer'
            }} 
            onClick={() => setNudgeDismissed(true)}
          >
            Dismiss
          </button>
        </div>
      )}

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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              {brand.proof_photo_url ? (
                <img 
                  src={brand.proof_photo_url} 
                  alt={brand.name} 
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: 'var(--border-radius-md)', 
                    objectFit: 'cover',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    flexShrink: 0
                  }}
                />
              ) : (
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: 'var(--border-radius-md)', 
                  background: 'rgba(0, 0, 0, 0.03)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px dashed var(--color-jade)',
                  color: 'var(--color-forest)',
                  flexShrink: 0
                }}>
                  <ImageIcon size={20} />
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-deep-forest)' }}>{brand.name}</h3>
                {brand.is_custom && <span style={{ fontSize: '0.75rem', color: 'var(--color-forest)', background: 'var(--color-sour-apple)', padding: '2px 6px', borderRadius: '4px' }}>Custom</span>}
              </div>
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
                onClick={() => {
                  // Intercept increment to show nudge if not uploaded
                  if (!store.beforePhotoUrl && !nudgeDismissed) {
                    setShowBeforePhotoNudge(true);
                  }
                  store.incrementBrand(brand.id);
                }}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        ))}
        {displayBrands.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-forest)' }}>
            No items recorded yet. Click "Find or Add Brand" above to get started!
          </div>
        )}
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

      {/* Confirmation & Reminder Dialog */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(47, 62, 52, 0.8)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)'
        }}>
          <div style={{ background: 'white', padding: 'var(--spacing-xl)', borderRadius: 'var(--border-radius-lg)', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Complete Audit?</h3>
            <p>Are you sure you want to complete this audit? You won't be able to log more items once completed.</p>
            
            {/* Reminder Alert for missing after photo */}
            {!store.afterPhotoUrl && (
              <div style={{
                background: 'rgba(251, 110, 82, 0.08)',
                border: '1px dashed var(--color-vibrant-rose)',
                borderRadius: 'var(--border-radius-sm)',
                padding: 'var(--spacing-md)',
                marginTop: 'var(--spacing-md)',
                display: 'flex',
                gap: '8px',
                color: 'var(--color-charcoal)'
              }}>
                <AlertCircle size={20} style={{ color: 'var(--color-vibrant-rose)', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.85rem' }}>
                  <strong>Reminder:</strong> You haven't added an <strong>After Photo</strong> yet. We highly recommend capturing one to show the cleaned beach!
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
              {!store.afterPhotoUrl ? (
                <>
                  <button 
                    className="secondary" 
                    style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '0.9rem' }} 
                    onClick={() => {
                      setShowConfirmDialog(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Add After Photo
                  </button>
                  <button 
                    className="primary" 
                    style={{ flex: 1, padding: '0.75rem 0.5rem', fontSize: '0.9rem', background: 'var(--color-vibrant-rose)', color: 'white' }} 
                    onClick={handleCompleteAudit}
                  >
                    Complete Anyway
                  </button>
                </>
              ) : (
                <>
                  <button className="secondary" style={{ flex: 1 }} onClick={() => setShowConfirmDialog(false)}>Cancel</button>
                  <button className="primary" style={{ flex: 1 }} onClick={handleCompleteAudit}>Complete</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && <AddBrandModal onClose={() => setIsModalOpen(false)} />}
      
      {/* Live Camera Modal */}
      {cameraType !== null && (
        <CameraModal 
          onClose={() => setCameraType(null)} 
          onCapture={handleCameraCapture} 
        />
      )}

      {/* Custom Photo Delete Confirmation Modal */}
      {photoToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(47, 62, 52, 0.8)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)'
        }}>
          <div style={{ 
            background: 'white', 
            padding: 'var(--spacing-xl)', 
            borderRadius: 'var(--border-radius-lg)', 
            width: '100%', 
            maxWidth: '400px', 
            color: 'var(--color-charcoal)' 
          }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-deep-forest)' }}>Remove Photo?</h3>
            <p>Are you sure you want to remove the {photoToDelete} beach photo? This will delete the photo from our servers.</p>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
              <button className="secondary" style={{ flex: 1 }} onClick={() => setPhotoToDelete(null)}>Cancel</button>
              <button 
                className="primary" 
                style={{ flex: 1, background: 'var(--color-vibrant-rose)', color: 'white' }} 
                onClick={async () => {
                  const type = photoToDelete;
                  setPhotoToDelete(null);
                  await executePhotoRemoval(type);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
