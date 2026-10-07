import React, { useEffect, useRef } from "react";

interface AdBannerProps {
  /**
   * Identificador do bloco do Google AdSense (ex: '1234567890').
   * Opcional: enquanto estiver em branco, o componente permanece seguro e invisível
   * ou exibe um container reservado discreto se simulate=true.
   */
  slotId?: string;
  /**
   * Identificador de cliente AdSense (ex: 'ca-pub-XXXXXXXXXXXXXXXX').
   */
  clientId?: string;
  /**
   * Formato do banner: 'auto' | 'horizontal' | 'rectangle'
   */
  format?: "auto" | "horizontal" | "rectangle";
  /**
   * Modo simulação: exibe visualmente onde e como o anúncio se posiciona sem códigos reais de ads.
   */
  simulate?: boolean;
  className?: string;
}

/**
 * Componente Base Seguro para Anúncios (AdBanner)
 *
 * Princípios de Design & Proteção do Usuário:
 * 1. Não bloqueia botões nem navegação fixa.
 * 2. Posicionado no rodapé da página (após todo o conteúdo útil).
 * 3. Renderiza apenas quando um `slotId` for ativamente configurado ou em modo simulação.
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  slotId = "",
  clientId = "",
  format = "auto",
  simulate = false,
  className = "",
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const isSlotConfigured = Boolean(slotId && clientId);

  useEffect(() => {
    if (!isSlotConfigured || simulate) return;

    try {
      const w = window as unknown as {
        adsbygoogle?: Array<Record<string, unknown>>;
      };
      if (typeof window !== "undefined") {
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.push({});
      }
    } catch {
      // Ignora silenciosamente
    }
  }, [isSlotConfigured, simulate]);

  // Se não estiver configurado nem em simulação, não renderiza nada
  if (!isSlotConfigured && !simulate) {
    return null;
  }

  return (
    <aside
      aria-label="Publicidade parceira"
      className={`w-full max-w-4xl mx-auto my-6 px-4 flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-full flex items-center justify-between mb-1.5 px-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
          <span>Publicidade</span>
          {simulate && (
            <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
              Simulação Visual
            </span>
          )}
        </span>
        {simulate && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
            Posição segura (acima do rodapé, sem sobrepor botões)
          </span>
        )}
      </div>

      <div
        ref={adRef}
        className="w-full min-h-[100px] sm:min-h-[120px] rounded-2xl overflow-hidden bg-slate-100/90 dark:bg-slate-900/90 border-2 border-dashed border-emerald-500/40 dark:border-emerald-500/30 flex flex-col items-center justify-center p-4 text-center relative group"
      >
        {simulate ? (
          <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none select-none">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
              [Exemplo de Anúncio Publicitário]
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
              Banner horizontal padrão (responsivo: 728x90 desktop / 320x100
              mobile). Localizado no fim do conteúdo para não prejudicar cliques
              ou rolagem.
            </p>
          </div>
        ) : (
          <ins
            className="adsbygoogle"
            style={{ display: "block", textAlign: "center" }}
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format={format}
            data-full-width-responsive="true"
          />
        )}
      </div>
    </aside>
  );
};
