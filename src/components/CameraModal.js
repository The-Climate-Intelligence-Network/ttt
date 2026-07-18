import { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, Check, AlertTriangle } from 'lucide-react';

export default function CameraModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  const [streamError, setStreamError] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null); // Data URL
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize camera stream
  const startCamera = async () => {
    setIsInitializing(true);
    setStreamError('');
    
    // Stop any existing stream tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setStreamError(
        'Could not access camera. Please check your camera permissions, or use standard file upload.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    startCamera();

    // Cleanup on unmount: shut down stream tracks
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw current video frame onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get data URL of frame
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(dataUrl);

    // Stop camera stream to save power while previewing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleUsePhoto = async () => {
    if (!capturedPhoto) return;
    
    try {
      // Convert data URL to Blob
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      
      // Create a File object
      const filename = `camera-capture-${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      
      onCapture(file);
      onClose();
    } catch (err) {
      console.error('Error generating photo file:', err);
      alert('Failed to process image file. Please try again.');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'black', zIndex: 2000,
      display: 'flex', flexDirection: 'column',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 'var(--spacing-md)',
        background: 'rgba(0,0,0,0.8)',
        zIndex: 10
      }}>
        <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>
          {capturedPhoto ? 'Preview Photo' : 'Take Beach Photo'}
        </h3>
        <button 
          className="icon-only" 
          onClick={onClose} 
          style={{ color: 'white', background: 'transparent' }}
          title="Close Camera"
        >
          <X size={28} />
        </button>
      </div>

      {/* Camera Viewport or Preview */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: '#111'
      }}>
        {capturedPhoto ? (
          // Captured Preview
          <img 
            src={capturedPhoto} 
            alt="Capture Preview" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              maxHeight: 'calc(100vh - 180px)' 
            }} 
          />
        ) : streamError ? (
          // Stream Error View
          <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
            <AlertTriangle size={48} style={{ color: 'var(--color-vibrant-rose)', marginBottom: '1rem' }} />
            <p style={{ color: '#aaa', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{streamError}</p>
            <button className="primary" onClick={onClose} style={{ width: '100%' }}>
              Close and Upload File Instead
            </button>
          </div>
        ) : (
          // Live Video Stream
          <>
            {isInitializing && (
              <div style={{ position: 'absolute', zIndex: 5, color: '#aaa' }}>
                Initializing camera...
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: isInitializing ? 0 : 1,
                transition: 'opacity 0.3s ease'
              }}
            />
          </>
        )}
      </div>

      {/* Control Actions bar */}
      <div style={{
        padding: '1.5rem',
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        minHeight: '100px'
      }}>
        {capturedPhoto ? (
          // Preview Options
          <>
            <button 
              className="secondary" 
              onClick={handleRetake} 
              style={{ flex: 1, maxWidth: '150px', borderColor: 'white', color: 'white' }}
            >
              Retake
            </button>
            <button 
              className="primary" 
              onClick={handleUsePhoto} 
              style={{ flex: 1, maxWidth: '150px', background: 'var(--color-sunflower)', color: 'var(--color-deep-forest)' }}
            >
              <Check size={20} /> Use Photo
            </button>
          </>
        ) : !streamError ? (
          // Shutter Mode Controls
          <>
            {/* Switch Camera Trigger */}
            <button 
              className="icon-only" 
              onClick={toggleFacingMode}
              style={{ 
                background: 'rgba(255,255,255,0.15)', 
                color: 'white', 
                padding: '12px',
                borderRadius: '50%'
              }}
              title="Switch Camera"
              disabled={isInitializing}
            >
              <RefreshCw size={24} />
            </button>

            {/* Shutter Trigger Button */}
            <button 
              onClick={handleCapture}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '6px solid white',
                background: 'var(--color-vibrant-rose)',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(0,0,0,0.5)',
                transition: 'transform 0.1s ease',
                cursor: 'pointer'
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              title="Capture Photo"
              disabled={isInitializing}
            >
              <Camera size={28} style={{ color: 'white' }} />
            </button>
            
            {/* Dummy space for alignment */}
            <div style={{ width: '48px' }}></div>
          </>
        ) : null}
      </div>
    </div>
  );
}
