import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default brands provided by user as a fallback if offline
const DEFAULT_BRANDS = [
  'Coca-Cola', 'Pepsi', 'Nestlé', 'Maliban', 'Milo', 
  'Unilever', 'Munchee', 'Cargills', 'Keells', 
  'Elephant House', 'Kotmale', 'Lion Brewery', 'Marlborough'
].map(name => ({
  id: `default-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name,
  is_custom: false,
  count: 0,
  proof_photo_url: ''
}));

export const useAuditStore = create(
  persist(
    (set, get) => ({
      teamName: '',
      teamId: null,
      auditId: null,
      eventId: null,
      eventName: '',
      status: 'not_started', // 'not_started', 'in_progress', 'completed'
      brands: [], // Array of { id, name, is_custom, count }
      lastSyncedAt: null,
      hasUnsyncedChanges: false,
      beforePhotoUrl: '',
      afterPhotoUrl: '',

      setBeforePhotoUrl: (url) => set({ beforePhotoUrl: url, hasUnsyncedChanges: true }),
      setAfterPhotoUrl: (url) => set({ afterPhotoUrl: url, hasUnsyncedChanges: true }),

      // Initialize the audit with a team name and event details
      startAudit: (teamName, eventId, eventName, teamId = null, auditId = null) => set({
        teamName,
        teamId: teamId || crypto.randomUUID(),
        auditId: auditId || crypto.randomUUID(),
        eventId,
        eventName,
        status: 'in_progress',
        brands: DEFAULT_BRANDS.map(b => ({ ...b })), // Deep copy default brands
        hasUnsyncedChanges: true,
        beforePhotoUrl: '',
        afterPhotoUrl: '',
      }),

      // Resume an existing audit
      resumeAudit: (teamName, teamId, auditId, eventId, eventName, status, brands, beforePhotoUrl = '', afterPhotoUrl = '') => set({
        teamName,
        teamId,
        auditId,
        eventId,
        eventName,
        status,
        brands,
        hasUnsyncedChanges: false,
        beforePhotoUrl,
        afterPhotoUrl,
      }),

      // Rehydrate brands with actual DB IDs if fetched successfully, preserving counts
      setDbBrands: (dbBrands) => set((state) => {
        // We need to merge dbBrands with our current counts
        const newBrands = dbBrands.map(dbb => {
          // Find if we already have this brand and it has a count
          const existing = state.brands.find(b => b.name.toLowerCase() === dbb.name.toLowerCase());
          return {
            id: dbb.id, // Use DB id
            name: dbb.name,
            is_custom: dbb.is_custom,
            count: existing ? existing.count : 0,
            proof_photo_url: existing ? (existing.proof_photo_url || '') : ''
          };
        });
        
        // Also keep any custom brands the user added locally that aren't in DB yet
        const customLocalBrands = state.brands.filter(b => 
          b.is_custom && !dbBrands.some(dbb => dbb.id === b.id || dbb.name.toLowerCase() === b.name.toLowerCase())
        );
        
        return { brands: [...newBrands, ...customLocalBrands] };
      }),

      incrementBrand: (brandId, proofPhotoUrl = '') => set((state) => ({
        brands: state.brands.map(b => 
          b.id === brandId ? { ...b, count: b.count + 1, proof_photo_url: proofPhotoUrl || b.proof_photo_url } : b
        ),
        hasUnsyncedChanges: true
      })),

      decrementBrand: (brandId) => set((state) => ({
        brands: state.brands.map(b => 
          (b.id === brandId && b.count > 0) ? { 
            ...b, 
            count: b.count - 1,
            proof_photo_url: b.count - 1 === 0 ? '' : b.proof_photo_url 
          } : b
        ),
        hasUnsyncedChanges: true
      })),

      addCustomBrand: (name, proofPhotoUrl = '') => set((state) => {
        // Check if already exists
        if (state.brands.some(b => b.name.toLowerCase() === name.toLowerCase())) {
          return state;
        }
        
        const newBrand = {
          id: crypto.randomUUID(),
          name,
          is_custom: true,
          count: 1,
          proof_photo_url: proofPhotoUrl
        };
        return {
          brands: [...state.brands, newBrand],
          hasUnsyncedChanges: true
        };
      }),

      completeAudit: () => set({
        status: 'completed',
        hasUnsyncedChanges: true
      }),

      markSynced: () => set({
        lastSyncedAt: Date.now(),
        hasUnsyncedChanges: false
      }),
      
      resetAudit: () => set({
        teamName: '',
        teamId: null,
        auditId: null,
        eventId: null,
        eventName: '',
        status: 'not_started',
        brands: [],
        lastSyncedAt: null,
        hasUnsyncedChanges: false,
        beforePhotoUrl: '',
        afterPhotoUrl: ''
      })
    }),
    {
      name: 'ttt-audit-storage', // key in localStorage
    }
  )
);
