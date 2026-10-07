import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, collection, writeBatch, getDocs, onSnapshot } from 'firebase/firestore';
import { loadDiagnoses, saveDiagnoses, loadBillScans, saveBillScans } from '../storage';
import { SavedDiagnosis, BillScanRecord } from '../../types';

const PENDING_SYNC_KEY = "turnoff:pending_offline_sync";

export const markPendingSync = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_SYNC_KEY, "true");
    window.dispatchEvent(new Event("turnoff:sync-status-changed"));
  } catch {
    // ignore
  }
};

export const hasPendingSync = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PENDING_SYNC_KEY) === "true";
  } catch {
    return false;
  }
};

export const clearPendingSync = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
    window.dispatchEvent(new Event("turnoff:sync-status-changed"));
  } catch {
    // ignore
  }
};

export const syncToCloud = async () => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    markPendingSync();
    return;
  }

  if (!auth.currentUser) {
    // If not logged in, user data remains safely in local storage
    return;
  }
  const userId = auth.currentUser.uid;
  
  try {
    // 1. Get local data
    const localDiagnoses = loadDiagnoses();
    const localScans = loadBillScans();
    
    // 2. Fetch cloud data
    const cloudDiagnosesRef = collection(db, 'users', userId, 'diagnoses');
    const cloudScansRef = collection(db, 'users', userId, 'scans');
    
    const [cloudDiagSnap, cloudScansSnap] = await Promise.all([
      getDocs(cloudDiagnosesRef),
      getDocs(cloudScansRef)
    ]);
    
    const cloudDiagnoses = cloudDiagSnap.docs.map(d => d.data() as SavedDiagnosis);
    const cloudScans = cloudScansSnap.docs.map(s => s.data() as BillScanRecord);
    
    // 3. Merge (local takes precedence or just merge unique by ID)
    const mergedDiagnoses = new Map();
    cloudDiagnoses.forEach(d => mergedDiagnoses.set(d.id, d));
    localDiagnoses.forEach(d => mergedDiagnoses.set(d.id, d));
    
    const mergedScans = new Map();
    cloudScans.forEach(s => mergedScans.set(s.id, s));
    localScans.forEach(s => mergedScans.set(s.id, s));
    
    // 4. Save merged back to local
    const finalDiagnoses = Array.from(mergedDiagnoses.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const finalScans = Array.from(mergedScans.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    saveDiagnoses(finalDiagnoses);
    saveBillScans(finalScans);
    
    // 5. Upload everything to cloud
    const batch = writeBatch(db);
    
    finalDiagnoses.forEach(diag => {
      const ref = doc(db, 'users', userId, 'diagnoses', diag.id);
      batch.set(ref, {
        ...diag,
        userId,
        createdAt: diag.createdAt || new Date().toISOString()
      }, { merge: true });
    });
    
    finalScans.forEach(scan => {
      const ref = doc(db, 'users', userId, 'scans', scan.id);
      batch.set(ref, {
        ...scan,
        userId,
        createdAt: scan.createdAt || new Date().toISOString()
      }, { merge: true });
    });
    
    // Profile
    const profileRef = doc(db, 'users', userId);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      batch.set(profileRef, {
        email: auth.currentUser.email,
        uid: userId,
        createdAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
    clearPendingSync();
  } catch (err) {
    console.warn("[syncToCloud] Falha na sincronização:", err);
    markPendingSync();
    throw err;
  }
};

export const subscribeToCloudChanges = () => {
  if (!auth.currentUser) return () => {};
  
  const userId = auth.currentUser.uid;
  
  const unsubDiag = onSnapshot(collection(db, 'users', userId, 'diagnoses'), (snap) => {
    const cloud = snap.docs.map(d => d.data() as SavedDiagnosis);
    saveDiagnoses(cloud.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    window.dispatchEvent(new Event('local-storage-changed'));
  });
  
  const unsubScans = onSnapshot(collection(db, 'users', userId, 'scans'), (snap) => {
    const cloud = snap.docs.map(d => d.data() as BillScanRecord);
    saveBillScans(cloud.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    window.dispatchEvent(new Event('local-storage-changed'));
  });
  
  return () => {
    unsubDiag();
    unsubScans();
  };
};
