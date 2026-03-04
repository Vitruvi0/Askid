"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { User } from "@/types";
import { Users, Plus, Loader2, UserX, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function UsersPage() {
  const t = useTranslations("admin.users");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "agency_user",
  });
  const [creating, setCreating] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.getUsers() as User[];
      setUsers(data);
    } catch {
      toast.error("Impossibile caricare gli utenti");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createUser(form);
      toast.success("Utente creato");
      setShowCreate(false);
      setForm({ email: "", password: "", full_name: "", role: "agency_user" });
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile creare l'utente");
    } finally {
      setCreating(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? "Utente disattivato" : "Utente attivato");
      fetchUsers();
    } catch (err) {
      toast.error("Impossibile aggiornare l'utente");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Utenti</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestisci gli account utente</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Utente
        </button>
      </div>

      {showCreate && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Crea Nuovo Utente</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="user-fullname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
              <input
                id="user-fullname"
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                required
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruolo</label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input-field"
              >
                <option value="agency_user">Utente Agenzia</option>
                <option value="agency_admin">Admin Agenzia</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? "Creazione in corso..." : "Crea Utente"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>Nessun utente trovato</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Nome</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Ruolo</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Stato</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Ultimo Accesso</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{u.full_name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {u.is_active ? "Attivo" : "Inattivo"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">
                      {u.last_login ? formatDate(u.last_login) : "Mai"}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleUserStatus(u)}
                        className={`p-1.5 rounded-lg ${
                          u.is_active
                            ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                            : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
                        }`}
                        aria-label={u.is_active ? `Disattiva ${u.full_name}` : `Attiva ${u.full_name}`}
                      >
                        {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <div key={u.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{u.full_name}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {u.is_active ? "Attivo" : "Inattivo"}
                      </span>
                      <button
                        onClick={() => toggleUserStatus(u)}
                        className={`p-1.5 rounded-lg ${
                          u.is_active
                            ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                            : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30"
                        }`}
                        aria-label={u.is_active ? `Disattiva ${u.full_name}` : `Attiva ${u.full_name}`}
                      >
                        {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{u.email}</p>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-medium">
                      {u.role.replace("_", " ")}
                    </span>
                    <span>{u.last_login ? formatDate(u.last_login) : "Mai"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
