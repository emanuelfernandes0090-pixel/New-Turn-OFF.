import { syncToCloud } from './firebaseSync';

export const triggerCloudSync = () => {
  // Fire and forget
  syncToCloud().catch(err => console.warn('Sync error:', err));
};
