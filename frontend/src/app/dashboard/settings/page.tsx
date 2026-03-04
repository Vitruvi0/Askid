"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { Lock, User as UserIcon, Camera, Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import HelpIcon from "@/components/ui/HelpIcon";
import type { User } from "@/types";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { user, setUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile edit state
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const data: { full_name?: string; email?: string } = {};
      if (fullName !== user?.full_name) data.full_name = fullName;
      if (email !== user?.email) data.email = email;

      if (Object.keys(data).length === 0) {
        toast.error("Nessuna modifica da salvare");
        setProfileLoading(false);
        return;
      }

      const updated = (await api.updateProfile(data)) as User;
      setUser(updated);
      toast.success("Profilo aggiornato");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossibile aggiornare il profilo"
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo di file non valido. Accettati: JPEG, PNG, GIF, WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Immagine troppo grande (max 5MB)");
      return;
    }

    setAvatarLoading(true);
    try {
      const updated = (await api.uploadAvatar(file)) as User;
      setUser(updated);
      toast.success("Avatar aggiornato");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossibile caricare l'avatar"
      );
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Le password non corrispondono");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("La password deve contenere almeno 8 caratteri");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.request("/api/v1/users/me/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      toast.success("Password aggiornata");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossibile cambiare la password"
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Impostazioni
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestisci il tuo account
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profilo */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profilo
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl font-bold text-primary-600 dark:text-primary-400 border-2 border-gray-200 dark:border-gray-600">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 shadow-md"
              >
                {avatarLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.full_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role.replace("_", " ")}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Membro dal{" "}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("it-IT")
                  : "N/D"}
              </p>
            </div>
          </div>

          {/* Editable fields */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label
                htmlFor="settings-fullname"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Nome Completo
              </label>
              <input
                id="settings-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label
                htmlFor="settings-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary flex items-center gap-2"
            >
              {profileLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {profileLoading ? "Salvataggio..." : "Salva Modifiche"}
            </button>
          </form>
        </div>

        {/* Cambio Password */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Cambia Password
            <HelpIcon text="La password deve contenere almeno 8 caratteri." position="right" />
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label
                htmlFor="settings-current-pw"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password Attuale
              </label>
              <input
                id="settings-current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label
                htmlFor="settings-new-pw"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Nuova Password
              </label>
              <input
                id="settings-new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                required
                minLength={8}
              />
            </div>
            <div>
              <label
                htmlFor="settings-confirm-pw"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Conferma Nuova Password
              </label>
              <input
                id="settings-confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button type="submit" disabled={passwordLoading} className="btn-primary">
              {passwordLoading ? "Aggiornamento..." : "Aggiorna Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
