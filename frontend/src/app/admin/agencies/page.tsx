"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Agency } from "@/types";
import { Building2, Plus, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default function AgenciesPage() {
  const t = useTranslations("admin.agencies");
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const fetchAgencies = useCallback(async () => {
    try {
      const data = await api.getAgencies() as Agency[];
      setAgencies(data);
    } catch {
      toast.error("Impossibile caricare le agenzie");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agenzie</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestisci gli account delle agenzie assicurative</p>
        </div>
        <button onClick={() => setShowWizard(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuova Agenzia
        </button>
      </div>

      {showWizard && (
        <OnboardingWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => fetchAgencies()}
        />
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : agencies.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>Nessuna agenzia presente</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="w-full text-sm hidden md:table">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Nome</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Stato</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Limiti</th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Creata il</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {agencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{agency.name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{agency.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          agency.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {agency.is_active ? "Attiva" : "Inattiva"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">
                      {agency.max_users} utenti / {agency.max_documents} doc
                    </td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">{formatDate(agency.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {agencies.map((agency) => (
                <div key={agency.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{agency.name}</p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        agency.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {agency.is_active ? "Attiva" : "Inattiva"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{agency.email}</p>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{agency.max_users} utenti / {agency.max_documents} doc</span>
                    <span>{formatDate(agency.created_at)}</span>
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
