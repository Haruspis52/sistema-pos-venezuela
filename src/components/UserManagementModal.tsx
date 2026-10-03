import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  UserCheck,
  ShieldAlert,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Check,
  X,
  ShieldCheck,
  Smartphone,
  LogOut,
  User,
  Eye,
  EyeOff,
  Delete,
  LogIn,
} from "lucide-react";
import { SystemUser, UserRole, RolePermissions } from "../types";
import { getStoredUsers, saveStoredUsers, saveStoredCurrentUser, ROLE_PERMISSIONS } from "../mockDb";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser;
  onSelectUser: (user: SystemUser) => void;
  showToast: (msg: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  showToast,
}) => {
  const [users, setUsers] = useState<SystemUser[]>(() => getStoredUsers());
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [formNombre, setFormNombre] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formRol, setFormRol] = useState<UserRole>("CAJERO");
  const [formPin, setFormPin] = useState("");

  // PIN Verification State when switching user
  const [userToVerifyPin, setUserToVerifyPin] = useState<SystemUser | null>(null);
  const [verifyPin, setVerifyPin] = useState("");
  const [showVerifyPin, setShowVerifyPin] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userToVerifyPin && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [userToVerifyPin]);

  const MASTER_ADMIN_CODE = "MASTER-CODE-BGP2004";
  const [showMasterInputInSwitch, setShowMasterInputInSwitch] = useState(false);
  const [masterCodeSwitch, setMasterCodeSwitch] = useState("");

  const handleConfirmUserSwitch = () => {
    if (!userToVerifyPin) return;

    const trimmed = verifyPin.trim();
    const isMasterValid = userToVerifyPin.rol === "ADMIN" && (trimmed === MASTER_ADMIN_CODE || masterCodeSwitch.trim() === MASTER_ADMIN_CODE);

    if (userToVerifyPin.pin === trimmed || isMasterValid) {
      const updatedUser: SystemUser = {
        ...userToVerifyPin,
        ultimo_acceso: new Date().toISOString(),
      };
      saveStoredCurrentUser(updatedUser);
      onSelectUser(updatedUser);
      showToast(`✅ Sesión iniciada como: ${userToVerifyPin.nombre_completo}`);
      setUserToVerifyPin(null);
      setVerifyPin("");
      setShowMasterInputInSwitch(false);
      setMasterCodeSwitch("");
    } else {
      showToast(`❌ PIN o Código Maestro incorrecto para @${userToVerifyPin.username}.`);
      setVerifyPin("");
      setMasterCodeSwitch("");
      if (pinInputRef.current) {
        pinInputRef.current.focus();
      }
    }
  };

  const isAdmin = currentUser.rol === "ADMIN";

  if (!isOpen) return null;

  const handleOpenNew = () => {
    if (!isAdmin) {
      showToast("🔒 Solo los usuarios Administradores tienen permiso para registrar nuevos usuarios.");
      return;
    }
    setEditingUserId(null);
    setFormNombre("");
    setFormUsername("");
    setFormRol("CAJERO");
    setFormPin("");
    setIsEditing(true);
  };

  const handleOpenEdit = (user: SystemUser) => {
    if (!isAdmin) {
      showToast("🔒 Solo los usuarios Administradores tienen permiso para modificar cuentas de usuario.");
      return;
    }
    setEditingUserId(user.id);
    setFormNombre(user.nombre_completo);
    setFormUsername(user.username);
    setFormRol(user.rol);
    setFormPin(user.pin);
    setIsEditing(true);
  };

  const handleSaveUser = () => {
    if (!isAdmin) {
      showToast("🔒 Solo los usuarios Administradores tienen permiso para crear o modificar cuentas.");
      return;
    }

    if (!formNombre.trim() || !formUsername.trim() || !formPin.trim()) {
      showToast("⚠️ Completa todos los campos obligatorios.");
      return;
    }

    if (formPin.length < 4) {
      showToast("⚠️ El PIN debe tener al menos 4 dígitos numéricos.");
      return;
    }

    let updated: SystemUser[];
    if (editingUserId) {
      updated = users.map((u) =>
        u.id === editingUserId
          ? {
              ...u,
              nombre_completo: formNombre.trim(),
              username: formUsername.trim().toLowerCase(),
              rol: formRol,
              pin: formPin.trim(),
            }
          : u
      );
      showToast(`✅ Usuario '${formNombre}' actualizado.`);
    } else {
      const newUser: SystemUser = {
        id: `usr-${Date.now()}`,
        nombre_completo: formNombre.trim(),
        username: formUsername.trim().toLowerCase(),
        rol: formRol,
        pin: formPin.trim(),
        activo: true,
        avatar_color:
          formRol === "ADMIN"
            ? "from-blue-600 to-indigo-600"
            : formRol === "SUPERVISOR"
            ? "from-emerald-600 to-teal-700"
            : "from-amber-500 to-orange-600",
      };
      updated = [...users, newUser];
      showToast(`✅ Nuevo usuario '${formNombre}' creado con rol ${formRol}.`);
    }

    setUsers(updated);
    saveStoredUsers(updated);
    setIsEditing(false);
  };

  const handleDeleteUser = (id: string) => {
    if (!isAdmin) {
      showToast("🔒 Solo los usuarios Administradores tienen permiso para eliminar usuarios.");
      return;
    }
    if (id === currentUser.id) {
      showToast("❌ No puedes eliminar la cuenta con la que has iniciado sesión.");
      return;
    }
    const target = users.find((u) => u.id === id);
    if (target?.rol === "ADMIN" && users.filter((u) => u.rol === "ADMIN").length <= 1) {
      showToast("❌ Debe existir al menos un usuario Administrador en el sistema.");
      return;
    }

    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    saveStoredUsers(updated);
    showToast(`Usuario eliminado del sistema.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#12141c] border border-slate-700/80 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950/60 via-[#181a24] to-[#12141c] p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/30 shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Control de Seguridad, Roles & Cajeros
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono">
                  RBAC Seguro
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Administra los permisos de venta, blindaje de costos, arqueo y cambio rápido de turno.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {/* Active User Card & Quick Switcher */}
          <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${
                  currentUser.avatar_color || "from-blue-600 to-indigo-600"
                } flex items-center justify-center text-white font-bold text-lg shadow-md`}
              >
                {currentUser.nombre_completo.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{currentUser.nombre_completo}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      currentUser.rol === "ADMIN"
                        ? "bg-blue-950/60 text-blue-300 border-blue-700/60"
                        : currentUser.rol === "SUPERVISOR"
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60"
                        : "bg-amber-950/60 text-amber-300 border-amber-700/60"
                    }`}
                  >
                    {currentUser.rol}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Usuario en sesión: <strong className="font-mono text-slate-300">@{currentUser.username}</strong> • PIN Activo: ****
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={handleOpenNew}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Usuario</span>
                </button>
              ) : (
                <div className="text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-700/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Gestión Restringida: Solo Administrador</span>
                </div>
              )}
            </div>
          </div>

          {/* New / Edit Form Modal Inline */}
          {isEditing && (
            <div className="bg-[#181a24] border border-blue-500/40 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  {editingUserId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {editingUserId ? "Editar Cuenta de Usuario" : "Crear Nueva Cuenta"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Nombre Completo:</label>
                  <input
                    type="text"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej: Pedro Pérez"
                    className="w-full bg-[#10121a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Nombre de Usuario (Login):</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Ej: pedro_caja1"
                    className="w-full bg-[#10121a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Rol / Nivel de Acceso:</label>
                  {!isAdmin ? (
                    <div className="w-full bg-[#10121a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300/90 font-mono font-semibold flex items-center gap-2 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{formRol} (Modificación restringida a Administrador)</span>
                    </div>
                  ) : (
                    <select
                      value={formRol}
                      onChange={(e) => setFormRol(e.target.value as UserRole)}
                      className="w-full bg-[#10121a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="CAJERO">CAJERO (Solo mostrador y cobro)</option>
                      <option value="SUPERVISOR">SUPERVISOR (Ajustes de stock y arqueos)</option>
                      <option value="ADMIN">ADMINISTRADOR (Acceso total y configuración)</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    PIN Rápido (4-6 dígitos):
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ej: 1234"
                    className="w-full bg-[#10121a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono tracking-widest focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Usuario</span>
                </button>
              </div>
            </div>
          )}

          {/* User List Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Usuarios y Cajeros Registrados ({users.length})
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {users.map((user) => {
                const perms = ROLE_PERMISSIONS[user.rol];
                const isCurrent = user.id === currentUser.id;

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-blue-950/20 border-blue-500/60 shadow-md ring-1 ring-blue-500/20"
                        : "bg-[#161822] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${
                          user.avatar_color || "from-slate-600 to-slate-700"
                        } flex items-center justify-center text-white font-bold text-sm shrink-0`}
                      >
                        {user.nombre_completo.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{user.nombre_completo}</span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              user.rol === "ADMIN"
                                ? "bg-blue-950/60 text-blue-300 border-blue-700/60"
                                : user.rol === "SUPERVISOR"
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60"
                                : "bg-amber-950/60 text-amber-300 border-amber-700/60"
                            }`}
                          >
                            {user.rol}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.2 rounded-full">
                              Sesión Activa
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>@{user.username}</span>
                          <span>•</span>
                          <span>PIN: ••••</span>
                          <span>•</span>
                          <span className="text-slate-500">
                            {user.rol === "ADMIN"
                              ? "Control Total"
                              : user.rol === "SUPERVISOR"
                              ? "Ajustes & Cierres"
                              : "Venta Protegida"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserToVerifyPin(user);
                            setVerifyPin("");
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Cambiar a este usuario</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                          title="Editar usuario"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isAdmin && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security Summary Box */}
          <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Matriz de Privilegios para Comercios:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Únicamente los usuarios con el rol <strong>ADMINISTRADOR</strong> poseen permisos para agregar nuevos perfiles, editar las cuentas registradas o eliminar usuarios del sistema. Los perfiles <strong>CAJERO</strong> y <strong>SUPERVISOR</strong> únicamente pueden seleccionar su usuario e iniciar sesión con su PIN.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#161822] px-6 py-3.5 border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Listo, Cerrar
          </button>
        </div>
      </div>

      {/* Modal Overlay para verificación de PIN al cambiar de usuario */}
      {userToVerifyPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-[#12141c] border-2 border-indigo-500/50 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-center">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${
                  userToVerifyPin.avatar_color || "from-blue-600 to-indigo-600"
                } flex items-center justify-center text-white text-xl font-black shadow-lg`}
              >
                {userToVerifyPin.nombre_completo.charAt(0)}
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Ingresar PIN de Seguridad
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Para ingresar a la cuenta de <strong className="text-slate-200">{userToVerifyPin.nombre_completo}</strong> (@{userToVerifyPin.username}), introduzca su PIN de acceso:
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmUserSwitch();
              }}
              className="space-y-4"
            >
              <div className="relative max-w-xs mx-auto">
                <input
                  ref={pinInputRef}
                  type={showVerifyPin ? "text" : "password"}
                  maxLength={6}
                  value={verifyPin}
                  onChange={(e) => setVerifyPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ingrese PIN..."
                  className="w-full bg-[#0d0f17] border-2 border-indigo-500/60 rounded-2xl px-4 py-3 text-center text-lg font-mono tracking-[0.4em] text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => setShowVerifyPin(!showVerifyPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
                >
                  {showVerifyPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Numpad táctil */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (verifyPin.length < 6) {
                        setVerifyPin((prev) => prev + num);
                      }
                      pinInputRef.current?.focus();
                    }}
                    className="py-2.5 bg-[#181a24] hover:bg-[#222636] border border-slate-800 hover:border-indigo-500 text-white font-mono font-bold text-base rounded-xl transition-all cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setVerifyPin("")}
                  className="py-2.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (verifyPin.length < 6) {
                      setVerifyPin((prev) => prev + "0");
                    }
                    pinInputRef.current?.focus();
                  }}
                  className="py-2.5 bg-[#181a24] hover:bg-[#222636] border border-slate-800 hover:border-indigo-500 text-white font-mono font-bold text-base rounded-xl transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyPin((prev) => prev.slice(0, -1))}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center rounded-xl transition-all cursor-pointer"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 max-w-xs mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserToVerifyPin(null);
                    setVerifyPin("");
                    setShowMasterInputInSwitch(false);
                    setMasterCodeSwitch("");
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!verifyPin.trim() && !masterCodeSwitch.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Ingresar</span>
                </button>
              </div>

              {/* Botón de Código Maestro para Administrador */}
              {userToVerifyPin.rol === "ADMIN" && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowMasterInputInSwitch((prev) => !prev)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>¿Olvidó el PIN? Entrar con Código Maestro</span>
                  </button>
                </div>
              )}

              {/* Input de Código Maestro si se activa */}
              {showMasterInputInSwitch && userToVerifyPin.rol === "ADMIN" && (
                <div className="bg-[#181c28] border border-amber-500/50 rounded-xl p-3 text-xs space-y-2 max-w-xs mx-auto animate-in fade-in">
                  <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Código Maestro de Administrador:</span>
                  </div>
                  <input
                    type="password"
                    value={masterCodeSwitch}
                    onChange={(e) => setMasterCodeSwitch(e.target.value)}
                    placeholder=""
                    autoComplete="off"
                    className="w-full bg-[#0d0f17] border border-amber-500/60 rounded-lg px-2.5 py-2 text-sm text-center font-mono font-bold tracking-widest text-amber-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmUserSwitch}
                    disabled={!masterCodeSwitch.trim()}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Validar Código Maestro</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
