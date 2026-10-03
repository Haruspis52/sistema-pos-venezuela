import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Store,
  ArrowLeft,
  Delete,
  LogIn,
} from "lucide-react";
import { SystemUser } from "../types";
import { getStoredUsers, getStoredNegocioConfig, saveStoredCurrentUser } from "../mockDb";

interface UserProfileLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: SystemUser) => void;
  bcvRate?: number;
}

export const MASTER_ADMIN_CODE = "MASTER-CODE-BGP2004";

export const UserProfileLoginModal: React.FC<UserProfileLoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  bcvRate = 36.5,
}) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [negocioNombre, setNegocioNombre] = useState<string>("Mi Comercio");
  const [showMasterCodeModal, setShowMasterCodeModal] = useState<boolean>(false);
  const [masterCodeInput, setMasterCodeInput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus physical input when profile is selected
  useEffect(() => {
    if (selectedUser) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedUser]);

  // Load stored users and business name on open
  useEffect(() => {
    if (isOpen) {
      const storedUsers = getStoredUsers().filter((u) => u.activo);
      setUsers(storedUsers);
      const config = getStoredNegocioConfig();
      if (config && config.nombreComercial) {
        setNegocioNombre(config.nombreComercial);
      }
      // Reset selection state
      setSelectedUser(null);
      setPin("");
      setErrorMsg(null);
      setShowMasterCodeModal(false);
      setMasterCodeInput("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectProfile = (user: SystemUser) => {
    setSelectedUser(user);
    setPin("");
    setErrorMsg(null);
    setShowMasterCodeModal(false);
    setMasterCodeInput("");
  };

  const handleNumpadClick = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg(null);
    }
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  const handleClearPin = () => {
    setPin("");
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  const handleAttemptLogin = (pinToTest?: string) => {
    const finalPin = (pinToTest !== undefined ? pinToTest : pin).trim();
    if (!selectedUser) {
      setErrorMsg("Seleccione un perfil de usuario primero.");
      return;
    }
    if (!finalPin) {
      setErrorMsg("Ingrese el PIN de seguridad.");
      return;
    }

    if (
      selectedUser.pin === finalPin ||
      (selectedUser.rol === "ADMIN" && finalPin === MASTER_ADMIN_CODE)
    ) {
      // Login successful!
      const updatedUser: SystemUser = {
        ...selectedUser,
        ultimo_acceso: new Date().toISOString(),
      };
      saveStoredCurrentUser(updatedUser);
      onLoginSuccess(updatedUser);
    } else {
      setErrorMsg(`PIN incorrecto para @${selectedUser.username}. Intente nuevamente.`);
      setPin("");
    }
  };

  const handleAttemptMasterCodeLogin = () => {
    if (!selectedUser || selectedUser.rol !== "ADMIN") return;
    const clean = masterCodeInput.trim();
    if (clean === MASTER_ADMIN_CODE) {
      const updatedUser: SystemUser = {
        ...selectedUser,
        ultimo_acceso: new Date().toISOString(),
      };
      saveStoredCurrentUser(updatedUser);
      onLoginSuccess(updatedUser);
    } else {
      setErrorMsg("Código maestro incorrecto. Verifique e intente nuevamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="bg-[#12141c] border-2 border-blue-500/40 rounded-3xl w-full max-w-xl shadow-2xl shadow-blue-950/50 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Header Superior */}
        <div className="bg-gradient-to-r from-blue-950 via-[#161a26] to-[#12141c] p-5 sm:p-6 border-b border-slate-800 text-center relative shrink-0">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-950/50">
              <Users className="w-7 h-7" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {negocioNombre}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Seleccione su perfil de usuario e ingrese su PIN de acceso
          </p>
        </div>

        {/* Cuerpo Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* FASE 1: SELECCIÓN DE PERFIL DE USUARIO */}
          {!selectedUser ? (
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider block text-center sm:text-left">
                Perfiles de Usuario Registrados ({users.length}):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectProfile(user)}
                    className="group bg-[#171a26] hover:bg-[#1f2334] border border-slate-800 hover:border-blue-500/60 p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3.5 shadow-lg active:scale-[0.98]"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${
                        user.avatar_color || "from-blue-600 to-indigo-600"
                      } flex items-center justify-center text-white font-extrabold text-lg shadow-md shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      {user.nombre_completo.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {user.nombre_completo}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-md border ${
                            user.rol === "ADMIN"
                              ? "bg-blue-950/80 text-blue-300 border-blue-700/60"
                              : user.rol === "SUPERVISOR"
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                              : "bg-amber-950/80 text-amber-300 border-amber-700/60"
                          }`}
                        >
                          {user.rol === "ADMIN"
                            ? "PROPIETARIO"
                            : user.rol === "SUPERVISOR"
                            ? "SUPERVISOR"
                            : "CAJERO DE TURNO"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          @{user.username}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* FASE 2: INGRESO DE PIN PARA EL PERFIL SELECCIONADO */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAttemptLogin();
              }}
              className="space-y-4 animate-in fade-in duration-200"
            >
              {/* Card del perfil seleccionado + Botón Cambiar */}
              <div className="bg-[#171a26] border border-blue-500/50 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${
                      selectedUser.avatar_color || "from-blue-600 to-indigo-600"
                    } flex items-center justify-center text-white font-extrabold text-base shadow`}
                  >
                    {selectedUser.nombre_completo.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {selectedUser.nombre_completo}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Rol: <strong>{selectedUser.rol}</strong> (@{selectedUser.username})
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar Perfil</span>
                </button>
              </div>

              {/* Mensaje de Error si el PIN es incorrecto */}
              {errorMsg && (
                <div className="bg-rose-950/80 border border-rose-500 p-3 rounded-xl text-xs text-rose-200 flex items-center gap-2 animate-in shake duration-200 font-mono">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Display de PIN */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block text-center font-mono">
                  Ingrese PIN de Seguridad para {selectedUser.nombre_completo}:
                </label>

                <div className="relative max-w-xs mx-auto">
                  <input
                    ref={inputRef}
                    type={showPin ? "text" : "password"}
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setPin(clean);
                      setErrorMsg(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAttemptLogin();
                      }
                    }}
                    placeholder="• • • •"
                    autoFocus
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full bg-[#0b0d13] border-2 border-blue-500/60 focus:border-blue-400 rounded-2xl py-3 px-4 text-center text-2xl font-mono font-black text-amber-300 tracking-[0.4em] focus:outline-none shadow-inner cursor-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                    title={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Numpad Teclado Táctil */}
              <div className="max-w-xs mx-auto space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumpadClick(num)}
                      className="py-3 bg-[#191c28] hover:bg-blue-600 active:bg-blue-700 text-white font-extrabold text-lg rounded-xl transition-all shadow border border-slate-800 hover:border-blue-400 cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClearPin}
                    className="py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-xl border border-slate-800 transition-all cursor-pointer"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadClick("0")}
                    className="py-3 bg-[#191c28] hover:bg-blue-600 active:bg-blue-700 text-white font-extrabold text-lg rounded-xl transition-all shadow border border-slate-800 hover:border-blue-400 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-all flex items-center justify-center cursor-pointer"
                    title="Retroceder"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>

                {/* Botón Ingresar */}
                <button
                  type="submit"
                  disabled={!pin}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Iniciar Sesión como {selectedUser.nombre_completo.split(" ")[0]}</span>
                </button>

                {/* Botón de Código Maestro para Administrador */}
                {selectedUser.rol === "ADMIN" && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMasterCodeModal((prev) => !prev);
                        setErrorMsg(null);
                        setMasterCodeInput("");
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>¿Olvidó el PIN? Entrar con Código Maestro</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Formulario Emergente de Código Maestro */}
              {showMasterCodeModal && selectedUser.rol === "ADMIN" && (
                <div className="bg-[#181c28] border-2 border-amber-500/50 rounded-2xl p-4 text-xs space-y-3 animate-in fade-in duration-200 shadow-xl shadow-amber-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Acceso de Emergencia con Código Maestro</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMasterCodeModal(false);
                        setMasterCodeInput("");
                        setErrorMsg(null);
                      }}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Si perdió el PIN de la cuenta Administrador, ingrese el código maestro de recuperación para acceder al sistema:
                  </p>

                  <div className="space-y-2">
                    <input
                      type="password"
                      value={masterCodeInput}
                      onChange={(e) => {
                        setMasterCodeInput(e.target.value);
                        setErrorMsg(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAttemptMasterCodeLogin();
                        }
                      }}
                      placeholder=""
                      autoFocus
                      autoComplete="off"
                      className="w-full bg-[#0d0f17] border border-amber-500/60 rounded-xl px-3 py-2.5 text-sm text-center font-mono font-bold tracking-widest text-amber-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                    />

                    <button
                      type="button"
                      onClick={handleAttemptMasterCodeLogin}
                      disabled={!masterCodeInput.trim()}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/50 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <KeyRound className="w-4 h-4 text-slate-950" />
                      <span>Validar Código Maestro e Iniciar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#0c0e14] px-6 py-3 border-t border-slate-800 text-center text-[11px] text-slate-500 font-mono shrink-0">
          Sistema POS &amp; Facturación Venezuela • Sesión Protegida por PIN
        </div>
      </div>
    </div>
  );
};
