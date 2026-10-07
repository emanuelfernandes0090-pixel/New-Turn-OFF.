import { useState, useEffect, useCallback } from "react";
import { syncToCloud, hasPendingSync, markPendingSync } from "./sync/firebaseSync";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  isSyncing: boolean;
  hasPending: boolean;
  showReconnectedNotice: boolean;
  dismissReconnectedNotice: () => void;
  triggerManualSync: () => Promise<void>;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      return navigator.onLine;
    }
    return true;
  });

  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasPending, setHasPending] = useState<boolean>(() => hasPendingSync());
  const [showReconnectedNotice, setShowReconnectedNotice] = useState<boolean>(false);

  const dismissReconnectedNotice = useCallback(() => {
    setShowReconnectedNotice(false);
  }, []);

  const triggerManualSync = useCallback(async () => {
    if (!navigator.onLine) {
      markPendingSync();
      return;
    }
    setIsSyncing(true);
    try {
      await syncToCloud();
      setHasPending(hasPendingSync());
    } catch (err) {
      console.warn("[NetworkStatus] Erro na sincronização manual:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setWasOffline(true);
      setShowReconnectedNotice(true);
      setIsSyncing(true);

      try {
        await syncToCloud();
      } catch (e) {
        console.warn("[NetworkStatus] Falha ao sincronizar após reconectar:", e);
      } finally {
        setIsSyncing(false);
        setHasPending(hasPendingSync());
      }

      // Auto dismiss reconnected notice after 4 seconds
      const timer = setTimeout(() => {
        setShowReconnectedNotice(false);
      }, 4000);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedNotice(false);
    };

    const handleSyncStatusChanged = () => {
      setHasPending(hasPendingSync());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("turnoff:sync-status-changed", handleSyncStatusChanged);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("turnoff:sync-status-changed", handleSyncStatusChanged);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    isSyncing,
    hasPending,
    showReconnectedNotice,
    dismissReconnectedNotice,
    triggerManualSync,
  };
}
