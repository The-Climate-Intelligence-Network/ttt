import { useEffect } from 'react';
import { useAuditStore } from '@/store/auditStore';
import { supabase } from '@/lib/supabase';

export async function syncCurrentState(options = { syncTally: true }) {
  const currentState = useAuditStore.getState();
  
  if (currentState.status === 'not_started' || !currentState.auditId) {
    return;
  }

  try {
    // 1. Sync Team
    if (currentState.teamId) {
       await supabase
         .from('teams')
         .upsert({ 
           id: currentState.teamId, 
           name: currentState.teamName,
           event_id: currentState.eventId || null
         })
         .select()
         .single();
    }

    // 2. Sync Audit
    if (currentState.auditId) {
       await supabase
         .from('audits')
         .upsert({ 
           id: currentState.auditId, 
           team_id: currentState.teamId, 
           status: currentState.status,
           completed_at: currentState.status === 'completed' ? new Date().toISOString() : null,
           before_photo_url: currentState.beforePhotoUrl || null,
           after_photo_url: currentState.afterPhotoUrl || null
         })
         .select()
         .single();
    }

    if (options.syncTally) {
      // 3. Sync Custom Brands
      const customBrands = currentState.brands.filter(b => b.is_custom);
      for (const cb of customBrands) {
         // Upsert the custom brand. If it already exists, no harm.
         await supabase
           .from('brands')
           .upsert({ id: cb.id, name: cb.name, is_custom: true });
      }

      // 4. Sync Audit Items (only those with counts > 0 to save bandwidth/DB space, or all. Let's do > 0)
      const itemsToSync = currentState.brands
            .filter(b => b.count > 0 && !b.id.startsWith('default-')) // skip defaults if we haven't resolved DB IDs
            .map(b => ({
              audit_id: currentState.auditId,
              brand_id: b.id,
              count: b.count,
              proof_photo_url: b.proof_photo_url || null,
              updated_at: new Date().toISOString()
            }));

      if (itemsToSync.length > 0) {
         // Since we have a UNIQUE(audit_id, brand_id) constraint, upsert works well if we provide the conflict columns
         // Wait, our audit_items has its own primary key 'id'.
         // Supabase upsert on a unique constraint:
         await supabase
           .from('audit_items')
           .upsert(itemsToSync, { onConflict: 'audit_id, brand_id' });
      }
    }

    // Mark as synced
    useAuditStore.getState().markSynced();
    console.log(`Sync successful (${options.syncTally ? 'full' : 'status only'}) at`, new Date().toLocaleTimeString());

  } catch (err) {
    console.error('Sync failed:', err);
  }
}

export function useSync() {
  const store = useAuditStore();

  useEffect(() => {
    const syncData = async () => {
      // We read from the current state inside the interval to get fresh values
      const currentState = useAuditStore.getState();
      
      if (currentState.status !== 'not_started' && currentState.hasUnsyncedChanges) {
        await syncCurrentState({ syncTally: true });
      }
    };

    // Run every 30 seconds
    const interval = setInterval(syncData, 30000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
