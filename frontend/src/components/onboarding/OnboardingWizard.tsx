"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import StepIndicator from "./StepIndicator";
import { Loader2, Building2, User, Settings, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

type OnboardingWizardProps = {
  onClose: () => void;
  onSuccess: () => void;
};

type FormData = {
  agency_name: string;
  agency_email: string;
  agency_phone: string;
  agency_address: string;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
  admin_confirm_password: string;
  max_users: number;
  max_documents: number;
};

export default function OnboardingWizard({ onClose, onSuccess }: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>({
    agency_name: "",
    agency_email: "",
    agency_phone: "",
    agency_address: "",
    admin_full_name: "",
    admin_email: "",
    admin_password: "",
    admin_confirm_password: "",
    max_users: 10,
    max_documents: 500,
  });

  const steps = [t("step1"), t("step2"), t("step3"), t("step4")];

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!form.agency_name.trim() || !form.agency_email.trim()) {
        toast.error("Nome e email dell'agenzia sono obbligatori");
        return false;
      }
    } else if (s === 2) {
      if (!form.admin_full_name.trim() || !form.admin_email.trim() || !form.admin_password) {
        toast.error("Nome, email e password dell'amministratore sono obbligatori");
        return false;
      }
      if (form.admin_password.length < 8) {
        toast.error("La password deve contenere almeno 8 caratteri");
        return false;
      }
      if (form.admin_password !== form.admin_confirm_password) {
        toast.error("Le password non corrispondono");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setCreating(true);
    try {
      await api.onboardAgency({
        agency_name: form.agency_name,
        agency_email: form.agency_email,
        agency_phone: form.agency_phone || undefined,
        agency_address: form.agency_address || undefined,
        admin_full_name: form.admin_full_name,
        admin_email: form.admin_email,
        admin_password: form.admin_password,
        max_users: form.max_users,
        max_documents: form.max_documents,
      });
      toast.success(t("success"));
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failed"));
    } finally {
      setCreating(false);
    }
  };

  const inputClass = "input-field";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">{t("title")}</h2>
          <StepIndicator steps={steps} currentStep={step} />

          {/* Step 1: Agency Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                <Building2 className="h-5 w-5" />
                <h3 className="font-semibold">{t("step1")}</h3>
              </div>
              <div>
                <label htmlFor="ob-agency-name" className={labelClass}>{t("agencyName")} *</label>
                <input
                  id="ob-agency-name"
                  type="text"
                  value={form.agency_name}
                  onChange={(e) => updateField("agency_name", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="ob-agency-email" className={labelClass}>{t("agencyEmail")} *</label>
                <input
                  id="ob-agency-email"
                  type="email"
                  value={form.agency_email}
                  onChange={(e) => updateField("agency_email", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="ob-agency-phone" className={labelClass}>{t("agencyPhone")}</label>
                <input
                  id="ob-agency-phone"
                  type="tel"
                  value={form.agency_phone}
                  onChange={(e) => updateField("agency_phone", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="ob-agency-address" className={labelClass}>{t("agencyAddress")}</label>
                <input
                  id="ob-agency-address"
                  type="text"
                  value={form.agency_address}
                  onChange={(e) => updateField("agency_address", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Step 2: Admin User */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                <User className="h-5 w-5" />
                <h3 className="font-semibold">{t("step2")}</h3>
              </div>
              <div>
                <label htmlFor="ob-admin-name" className={labelClass}>{t("adminName")} *</label>
                <input
                  id="ob-admin-name"
                  type="text"
                  value={form.admin_full_name}
                  onChange={(e) => updateField("admin_full_name", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="ob-admin-email" className={labelClass}>{t("adminEmail")} *</label>
                <input
                  id="ob-admin-email"
                  type="email"
                  value={form.admin_email}
                  onChange={(e) => updateField("admin_email", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="ob-admin-pw" className={labelClass}>{t("adminPassword")} *</label>
                <input
                  id="ob-admin-pw"
                  type="password"
                  value={form.admin_password}
                  onChange={(e) => updateField("admin_password", e.target.value)}
                  className={inputClass}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="ob-admin-pw-confirm" className={labelClass}>{t("adminConfirmPassword")} *</label>
                <input
                  id="ob-admin-pw-confirm"
                  type="password"
                  value={form.admin_confirm_password}
                  onChange={(e) => updateField("admin_confirm_password", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>
          )}

          {/* Step 3: Configuration */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                <Settings className="h-5 w-5" />
                <h3 className="font-semibold">{t("step3")}</h3>
              </div>
              <div>
                <label htmlFor="ob-max-users" className={labelClass}>{t("maxUsers")}</label>
                <input
                  id="ob-max-users"
                  type="number"
                  value={form.max_users}
                  onChange={(e) => updateField("max_users", parseInt(e.target.value) || 10)}
                  className={inputClass}
                  min={1}
                />
              </div>
              <div>
                <label htmlFor="ob-max-docs" className={labelClass}>{t("maxDocuments")}</label>
                <input
                  id="ob-max-docs"
                  type="number"
                  value={form.max_documents}
                  onChange={(e) => updateField("max_documents", parseInt(e.target.value) || 500)}
                  className={inputClass}
                  min={1}
                />
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-semibold">{t("summary")}</h3>
              </div>

              <div className="card p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("agencyDetails")}</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">{t("agencyName")}</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">{form.agency_name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">{t("agencyEmail")}</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{form.agency_email}</dd>
                  </div>
                  {form.agency_phone && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">{t("agencyPhone")}</dt>
                      <dd className="text-gray-900 dark:text-gray-100">{form.agency_phone}</dd>
                    </div>
                  )}
                  {form.agency_address && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">{t("agencyAddress")}</dt>
                      <dd className="text-gray-900 dark:text-gray-100">{form.agency_address}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="card p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("adminDetails")}</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">{t("adminName")}</dt>
                    <dd className="text-gray-900 dark:text-gray-100 font-medium">{form.admin_full_name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">{t("adminEmail")}</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{form.admin_email}</dd>
                  </div>
                </dl>
              </div>

              <div className="card p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("configDetails")}</h4>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">{t("maxUsers")}</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{form.max_users}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">{t("maxDocuments")}</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{form.max_documents}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={step === 1 ? onClose : prevStep}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {step === 1 ? "Annulla" : "Indietro"}
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn-primary"
              >
                Avanti
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={creating}
                className="btn-primary flex items-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? t("creating") : t("confirm")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
