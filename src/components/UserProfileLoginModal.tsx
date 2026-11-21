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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#222629]/28 backdrop-blur-md select-none overflow-y-auto">
      <div
        className="border border-white/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] backdrop-blur-xl"
        style={{
          background:
            "linear-gradient(155deg, rgba(252, 249, 244, 0.94) 0%, rgba(238, 232, 219, 0.92) 65%, rgba(232, 226, 246, 0.90) 100%)",
        }}
      >
        {/* Header Superior */}
        <div className="bg-white/45 p-5 sm:p-6 border-b border-white/75 text-center relative shrink-0">
          <div className="flex justify-center mb-3">
            <div className="w-13 h-13 rounded-2xl bg-[#7B61C9]/15 border border-[#7B61C9]/35 flex items-center justify-center text-[#7B61C9] shadow-inner">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#222629] tracking-tight">
            {negocioNombre}
          </h2>
          <p className="text-xs font-medium text-[#5C646D] mt-1">
            Seleccione su perfil de usuario e ingrese su PIN de acceso
          </p>
        </div>

        {/* Cuerpo Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0 bg-transparent">
          {/* FASE 1: SELECCIÓN DE PERFIL DE USUARIO */}
          {!selectedUser ? (
            <div className="space-y-3.5">
              <label className="text-[11px] font-bold text-[#5C646D] uppercase font-mono tracking-wider block text-center sm:text-left">
                Perfiles de Usuario Registrados ({users.length}):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => handleSelectProfile(user)}
                    className="faraday-glass-card rounded-xl p-3.5 flex items-center gap-3.5 text-left transition-all cursor-pointer group"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl border ${
                        user.rol === "ADMIN"
                          ? "bg-[#7B61C9] text-white faraday-keep-white border-white/60"
                          : user.rol === "SUPERVISOR"
                          ? "bg-[#248F78] text-white faraday-keep-white border-white/60"
                          : "bg-[#B85A3A] text-white faraday-keep-white border-white/70"
                      } flex items-center justify-center font-extrabold text-base shrink-0 shadow-sm`}
                    >
                      {user.nombre_completo.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-[#222629] group-hover:text-[#7B61C9] truncate transition-colors">
                        {user.nombre_completo}
                      </h4>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            user.rol === "ADMIN"
                              ? "bg-[#7B61C9]/15 text-[#7B61C9] border-[#7B61C9]/35"
                              : user.rol === "SUPERVISOR"
                              ? "bg-[#248F78]/15 text-[#248F78] border-[#248F78]/35"
                              : "bg-[#C66B49]/18 text-[#9B4628] border-[#C66B49]/45"
                          }`}
                        >
                          {user.rol === "ADMIN"
                            ? "PROPIETARIO"
                            : user.rol === "SUPERVISOR"
                            ? "SUPERVISOR"
                            : "CAJERO DE TURNO"}
                        </span>
                        <span className="text-[11px] text-[#5C646D] font-mono">
                          @{user.username}
                        </span>
                      </div>
                    </div>
                  </button>
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
              className="space-y-4"
            >
              {/* Card del perfil seleccionado + Botón Cambiar */}
              <div className="bg-white/65 border border-white/80 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl border shrink-0 ${
                      selectedUser.rol === "ADMIN"
                        ? "bg-[#7B61C9] text-white faraday-keep-white border-white/60"
                        : selectedUser.rol === "SUPERVISOR"
                        ? "bg-[#248F78] text-white faraday-keep-white border-white/60"
                        : "bg-[#B85A3A] text-white faraday-keep-white border-white/70"
                    } flex items-center justify-center font-extrabold text-base`}
                  >
                    {selectedUser.nombre_completo.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#222629] truncate">
                      {selectedUser.nombre_completo}
                    </div>
                    <div className="text-[10.5px] text-[#5C646D] font-mono truncate">
                      Rol: <strong className="text-[#9B4628]">{selectedUser.rol}</strong> (@{selectedUser.username})
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="bg-white/80 hover:bg-white border border-white/85 text-[#222629] rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar Perfil</span>
                </button>
              </div>

              {/* Mensaje de Error si el PIN es incorrecto */}
              {errorMsg && (
                <div className="bg-rose-950/60 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Display de PIN */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block text-center">
                  Ingrese PIN de Seguridad para{" "}
                  <span className="text-amber-300 font-bold">{selectedUser.nombre_completo}</span>:
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
                    className="w-full bg-white/70 border border-white/80 focus:border-[#C66B49] rounded-xl py-3 px-4 text-center text-2xl font-mono font-extrabold text-[#222629] tracking-[0.4em] focus:outline-none transition-colors shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-3.5 text-[#5C646D] hover:text-[#222629] cursor-pointer transition-colors"
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
                      className="bg-white/60 hover:bg-[#7B61C9] border border-white/75 hover:border-[#7B61C9] rounded-xl py-3 text-[#222629] hover:text-white font-mono font-extrabold text-lg transition-all cursor-pointer active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClearPin}
                    className="bg-white/45 hover:bg-white/80 border border-white/65 rounded-xl py-3 text-xs font-bold text-[#5C646D] hover:text-[#222629] transition-colors cursor-pointer"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadClick("0")}
                    className="bg-white/60 hover:bg-[#7B61C9] border border-white/75 hover:border-[#7B61C9] rounded-xl py-3 text-[#222629] hover:text-white font-mono font-extrabold text-lg transition-all cursor-pointer active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="bg-white/45 hover:bg-white/80 border border-white/65 rounded-xl py-3 text-xs text-[#5C646D] hover:text-[#222629] flex items-center justify-center transition-colors cursor-pointer"
                    title="Retroceder"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>

                {/* Botón Ingresar */}
                <button
                  type="submit"
                  disabled={!pin}
                  className="w-full py-3 rounded-xl bg-[#B85A3A] hover:bg-[#A14B2E] text-white faraday-keep-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#B85A3A]/30 border border-white/60 transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer mt-2"
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
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1.5 underline cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>¿Olvidó el PIN? Entrar con Código Maestro</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Formulario Emergente de Código Maestro */}
              {showMasterCodeModal && selectedUser.rol === "ADMIN" && (
                <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 text-xs space-y-3">
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
                      className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer"
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
                      placeholder="Código maestro..."
                      autoFocus
                      autoComplete="off"
                      className="w-full bg-[#0e1017] border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-sm text-white text-center font-mono font-bold tracking-widest focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={handleAttemptMasterCodeLogin}
                      disabled={!masterCodeInput.trim()}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Validar Código Maestro e Iniciar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-white/45 px-6 py-3 border-t border-white/75 text-center text-[11px] font-medium text-[#5C646D] font-mono shrink-0">
          FaradayPOS • Inventario &amp; Facturación Venezuela • Sesión Protegida por PIN
        </div>
      </div>
    </div>
  );
};
