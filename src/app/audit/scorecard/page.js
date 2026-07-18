'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuditStore } from '@/store/auditStore';
import * as htmlToImage from 'html-to-image';
import { Share2, Download, Home } from 'lucide-react';

export default function ScoreCardPage() {
  const store = useAuditStore();
  const router = useRouter();
  const cardRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (store.status === 'not_started') {
      router.replace('/');
    }
  }, [store.status, router]);

  if (store.status === 'not_started') return null;

  const activeBrands = store.brands.filter(b => b.count > 0).sort((a, b) => b.count - a.count);
  const topBrands = activeBrands.slice(0, 3);
  const totalItems = activeBrands.reduce((acc, b) => acc + b.count, 0);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { quality: 0.95 });
      
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'scorecard.png', { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Track The Trash Scorecard',
          text: `Our team ${store.teamName} found ${totalItems} items!`,
          files: [file],
        });
      } else {
        // Fallback to download
        const link = document.createElement('a');
        link.download = 'ttt-scorecard.png';
        link.href = dataUrl;
        link.click();
        alert('Image downloaded! You can now share it to your Instagram stories.');
      }
    } catch (err) {
      console.error('Error generating image', err);
      alert('Failed to generate image for sharing.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGoHome = () => {
    store.resetAudit();
    router.push('/');
  };

  return (
    <main className="mobile-container flex-center" style={{ padding: 'var(--spacing-xl) var(--spacing-md)' }}>
      
      {/* The Shareable Card */}
      <div 
        ref={cardRef} 
        style={{
          background: 'linear-gradient(135deg, var(--color-deep-forest) 0%, var(--color-forest) 100%)',
          color: 'white',
          padding: 'var(--spacing-2xl) var(--spacing-xl)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(63, 102, 79, 0.2)',
          textAlign: 'center',
          marginBottom: 'var(--spacing-xl)'
        }}
      >
        <h3 style={{ color: 'var(--color-teal)', marginBottom: 'var(--spacing-sm)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem' }}>
          Audit Complete
        </h3>
        <h2 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-lg)', color: 'white' }}>
          {store.teamName}
        </h2>
        
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-sunflower)', lineHeight: 1 }}>
            {totalItems}
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--color-surface)' }}>Total Items Found</div>
        </div>

        {topBrands.length > 0 && (
          <div style={{ textAlign: 'left', background: 'white', color: 'var(--color-charcoal)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-md)' }}>
            <h4 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-forest)' }}>Top Brands Found:</h4>
            {topBrands.map((brand, i) => (
              <div key={brand.id} className="flex-between" style={{ padding: '8px 0', borderBottom: i < topBrands.length - 1 ? '1px solid var(--color-surface)' : 'none' }}>
                <span style={{ fontWeight: 600 }}>{brand.name}</span>
                <span style={{ color: 'var(--color-teal)', fontWeight: 800 }}>{brand.count}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'var(--spacing-xl)', fontSize: '0.8rem', color: 'var(--color-jade)' }}>
          Track The Trash • The Climate Intelligence Network
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', width: '100%', maxWidth: '400px' }}>
        <button className="primary" onClick={handleShare} disabled={isGenerating} style={{ width: '100%', padding: '1rem' }}>
          {isGenerating ? 'Generating...' : <><Share2 size={20} /> Share to Instagram</>}
        </button>
        <button className="secondary" onClick={handleGoHome} style={{ width: '100%', padding: '1rem' }}>
          <Home size={20} /> Back to Home
        </button>
      </div>

    </main>
  );
}
