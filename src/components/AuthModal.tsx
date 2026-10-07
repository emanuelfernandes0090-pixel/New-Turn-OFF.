import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Lock,
  AlertCircle,
  LogIn,
  UserPlus,
  Cloud,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Download,
  ShieldCheck,
  Smartphone,
  KeyRound,
  ArrowLeft,
  User,
} from "lucide-react";
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logout,
  auth,
} from "../lib/firebase";
import { syncToCloud } from "../lib/sync/firebaseSync";
import { loadDiagnoses, loadBillScans, exportAppData } from "../lib/storage";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Local storage counts
  const [localStats, setLocalStats] = useState({ diagnoses: 0, bills: 0 });

  useEffect(() => {
    if (isOpen) {
      setLocalStats({
        diagnoses: loadDiagnoses().length,
        bills: loadBillScans().length,
      });
      setError(null);
      setSyncSuccessMsg(null);
      setShowLogoutConfirm(false);
      setResetSent(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        setLocalStats({
          diagnoses: loadDiagnoses().length,
          bills: loadBillScans().length,
        });
      }
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);

    if (mode === "forgot") {
      if (!email || !email.includes("@")) {
        setError("Informe um e-mail válido para redefinir sua senha.");
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email.trim());
        setResetSent(true);
      } catch (err: any) {
        console.warn("[AuthModal] Redefinição de senha:", err);
        if (err.code === "auth/user-not-found") {
          setError("Nenhuma conta encontrada com este e-mail.");
        } else {
          setError("Não foi possível enviar o e-mail de redefinição. Verifique o endereço digitado.");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password);
      }
      // Trigger cloud sync right after login
      await syncToCloud();
      setSyncSuccessMsg("Conta conectada e dados sincronizados com sucesso!");
    } catch (err: any) {
      console.warn("[AuthModal] Falha na autenticação por email:", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("E-mail ou senha incorretos.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está cadastrado. Tente fazer login.");
      } else if (err.code === "auth/weak-password") {
        setError("A senha deve ter pelo menos 6 caracteres.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Autenticação por E-mail/Senha temporariamente restrita. Use o login com Google.");
      } else {
        setError("Erro ao autenticar. Verifique sua conexão e tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await loginWithGoogle();
      if (!userCredential) {
        // O usuário fechou a janela ou cancelou sem prosseguir — encerra sem erro
        return;
      }
      await syncToCloud();
      setSyncSuccessMsg("Conectado com Google e sincronizado!");
    } catch (err: any) {
      const code = err?.code || "";
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        (typeof err?.message === "string" && err.message.includes("popup-closed-by-user"))
      ) {
        // Usuário fechou ou cancelou o popup do Google
        console.info("[AuthModal] Autenticação Google cancelada pelo usuário.");
      } else if (code === "auth/popup-blocked") {
        console.warn("[AuthModal] Popup bloqueado:", err);
        setError("O navegador bloqueou a janela pop-up do Google. Por favor, permita pop-ups para fazer login.");
      } else if (code === "auth/network-request-failed") {
        console.warn("[AuthModal] Falha de rede:", err);
        setError("Falha de conexão com a rede. Verifique sua internet e tente novamente.");
      } else {
        console.warn("[AuthModal] Aviso durante login Google:", err);
        setError("Erro ao autenticar com o Google. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncSuccessMsg(null);
    try {
      await syncToCloud();
      setLocalStats({
        diagnoses: loadDiagnoses().length,
        bills: loadBillScans().length,
      });
      setSyncSuccessMsg("Sincronização concluída com a nuvem!");
    } catch (err: any) {
      console.warn("[AuthModal] Erro na sincronização manual:", err);
      setError("Não foi possível sincronizar no momento. Seus dados continuam salvos localmente.");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      setShowLogoutConfirm(false);
      setMode("login");
    } catch (err) {
      console.warn("[AuthModal] Erro ao sair da conta:", err);
      setError("Erro ao sair da conta.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportAppData();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `turn-off-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="auth-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug"
              >
                {currentUser ? "Minha Conta & Nuvem" : "Conta & Sincronização"}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {currentUser
                  ? "Gerencie sua conta e sincronização contínua"
                  : "Preserve seus diagnósticos e faturas com segurança"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* Success Notification */}
          {syncSuccessMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="font-medium">{syncSuccessMsg}</p>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3.5 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 border border-red-200 dark:border-red-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="leading-snug">{error}</p>
            </div>
          )}

          {/* LOGGED IN USER PROFILE VIEW */}
          {currentUser ? (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || "Avatar"}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/30 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                      {currentUser.displayName
                        ? currentUser.displayName[0].toUpperCase()
                        : currentUser.email
                        ? currentUser.email[0].toUpperCase()
                        : "U"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.displayName || "Usuário Turn OFF"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                        Ativo
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {currentUser.email}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Sincronização com Firestore Ativa
                    </p>
                  </div>
                </div>

                {/* Cloud & Local Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {localStats.diagnoses}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Diagnósticos Salvos
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {localStats.bills}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Faturas na Nuvem
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  id="btn-sync-now-modal"
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Sincronizando..." : "Sincronizar Nuvem Agora"}
                </button>

                <button
                  type="button"
                  id="btn-download-backup-modal"
                  onClick={handleDownloadBackup}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Baixar Cópia Local (.json)
                </button>
              </div>

              {/* Logout Area */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                {showLogoutConfirm ? (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2.5 animate-in fade-in">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Deseja realmente desconectar? Seus dados continuam preservados na nuvem.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loading}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Sim, Desconectar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLogoutConfirm(false)}
                        className="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full py-2 px-3 text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair desta conta
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* NON-LOGGED IN USER FLOW */
            <div className="space-y-4">
              {/* Local Data Ready Banner */}
              {(localStats.diagnoses > 0 || localStats.bills > 0) && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 p-3.5 rounded-2xl text-xs border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Dados prontos para sincronizar:</strong>
                    <span>
                      Você possui {localStats.diagnoses} diagnóstico(s) e {localStats.bills} fatura(s) neste aparelho que serão vinculados à sua conta automaticamente ao entrar.
                    </span>
                  </div>
                </div>
              )}

              {/* 1-Click Google Login */}
              <button
                type="button"
                id="btn-login-google"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border-2 border-slate-300/80 dark:border-slate-700 rounded-2xl text-sm font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.7 1 4 3.5 2.2 7.1l3.7 2.8C6.7 6.9 9.1 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9c-.3 1.4-1 2.5-2.2 3.3l3.6 2.8c2.1-1.9 3.2-4.8 3.2-8.1z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.9 14.1c-.2-.7-.3-1.4-.3-2.1s.1-1.4.3-2.1L2.2 7.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.2 4.9l3.7-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.6-2.8c-1.1.7-2.5 1.2-4.4 1.2-2.9 0-5.3-1.9-6.1-4.5L2.2 16.9C4 20.5 7.7 23 12 23z"
                  />
                </svg>
                Continuar com Google (1 Clique)
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  ou com e-mail
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Reset Password Notification */}
              {resetSent && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Link enviado!</strong> Verifique a caixa de entrada de <em>{email}</em> para redefinir sua senha com segurança.
                  </div>
                </div>
              )}

              {/* Form: Login / Register / Forgot */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2.5">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Seu e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-white disabled:opacity-50 transition"
                    />
                  </div>

                  {mode !== "forgot" && (
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Sua senha (mínimo 6 dígitos)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-white disabled:opacity-50 transition"
                      />
                    </div>
                  )}

                  {mode === "register" && (
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Confirme sua senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:text-white disabled:opacity-50 transition"
                      />
                    </div>
                  )}
                </div>

                {mode === "login" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : mode === "login" ? (
                    <>
                      <LogIn className="w-4 h-4" /> Entrar na Conta
                    </>
                  ) : mode === "register" ? (
                    <>
                      <UserPlus className="w-4 h-4" /> Cadastrar Gratuitamente
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Enviar Link de Recuperação
                    </>
                  )}
                </button>
              </form>

              {/* Mode Switcher */}
              <div className="pt-2 text-center text-xs space-y-1">
                {mode === "forgot" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" /> Voltar ao Login
                  </button>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">
                    {mode === "login" ? "Ainda não tem conta?" : "Já possui cadastro?"}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === "login" ? "register" : "login");
                        setError(null);
                        setResetSent(false);
                      }}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      {mode === "login" ? "Criar conta grátis" : "Fazer login"}
                    </button>
                  </p>
                )}
              </div>

              {/* Free and Local Guarantee */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                <strong>Uso Livre:</strong> Criar conta é 100% gratuito e opcional. Se preferir não se cadastrar, todas as ferramentas continuam funcionando normalmente de forma local.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
