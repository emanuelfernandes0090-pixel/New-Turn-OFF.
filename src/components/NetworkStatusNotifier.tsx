import React from "react";
import { WifiOff, Wifi, RefreshCw, CheckCircle2, HardDrive, X } from "lucide-react";
import { NetworkStatus } from "../lib/useNetworkStatus";

interface NetworkStatusNotifierProps {
  status: NetworkStatus;
}

export const NetworkStatusNotifier: React.FC<NetworkStatusNotifierProps> = ({
  status,
}) => {
  const {
    isOnline,
    isSyncing,
    hasPending,
    showReconnectedNotice,
    dismissReconnectedNotice,
    triggerManualSync,
  } = status;

  // If online and no reconnected notice to show, render nothing
  if (isOnline && !showReconnectedNotice) {
    return null;
  }

  // 1. Reconnected Notice (Online transition)
  if (isOnline && showReconnectedNotice) {
    return (
      <div
        id="network-status-online-banner"
        role="status"
        aria-live="polite"
        className="w-full bg-emerald-950/95 text-emerald-100 border-b border-emerald-600/40 px-3 sm:px-6 py-2 backdrop-blur-md sticky top-0 z-50 transition-all animate-in slide-in-from-top duration-300 shadow-sm"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-lg bg-emerald-900/80 text-emerald-400 shrink-0">
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </div>
            <p className="font-medium text-emerald-200 tracking-tight leading-normal truncate sm:text-clip">
              {isSyncing ? (
                <span>
                  <strong className="font-bold text-white">Conexão restabelecida:</strong> sincronizando leituras e dados com a nuvem...
                </span>
              ) : (
                <span>
                  <strong className="font-bold text-white">Online novamente:</strong> dados sincronizados com a nuvem com sucesso.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-center">
            {isSyncing ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Sincronizando
              </span>
            ) : (
              <button
                type="button"
                onClick={dismissReconnectedNotice}
                className="p-1 text-emerald-400 hover:text-emerald-100 transition rounded-md hover:bg-emerald-900/60 cursor-pointer"
                title="Fechar notificação"
                aria-label="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Offline Notice
  return (
    <div
      id="network-status-offline-banner"
      role="alert"
      aria-live="assertive"
      className="w-full bg-slate-900/95 dark:bg-slate-950/95 text-slate-200 border-b border-amber-500/40 px-3 sm:px-6 py-2.5 backdrop-blur-md sticky top-0 z-50 transition-all animate-in slide-in-from-top duration-300 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="leading-snug">
            <p className="font-medium text-slate-300">
              <span className="inline-block font-bold text-amber-400 mr-1.5">
                Modo Offline ativo:
              </span>
              leituras de conta e diagnósticos funcionam localmente no seu aparelho e serão sincronizados ao reconectar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-center ml-auto sm:ml-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-amber-300/90 border border-slate-700">
            <HardDrive className="w-3 h-3 text-amber-400" />
            {hasPending ? "Salvo localmente (Pendente sincronizar)" : "Armazenamento local seguro"}
          </span>
        </div>
      </div>
    </div>
  );
};
