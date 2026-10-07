import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  withBadge?: boolean;
}

/**
 * Logo Oficial Turn OFF:
 * Imagem original fornecida com corte exato da borda branca externa,
 * preservando 100% da arte gráfica, sombreados e detalhes autênticos.
 */
export const TurnOffLogo: React.FC<LogoProps> = ({
  className = "",
  size = 40,
  withBadge = false,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="Logo Oficial Turn OFF"
    >
      <img
        src="/logo.png"
        alt="Logo Turn OFF"
        width={size}
        height={size}
        className="w-full h-full object-cover rounded-[22%] drop-shadow-md"
        referrerPolicy="no-referrer"
      />

      {/* Indicador Ativo no canto inferior (quando solicitado) */}
      {withBadge && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
        </span>
      )}
    </div>
  );
};
