"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import type { PensionGapResult, TCMResult, LifeCapitalResult } from "@/types";
import { Calculator, Loader2, Info, TrendingUp, Download, FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";
import HelpIcon from "@/components/ui/HelpIcon";

type Tab = "pension" | "tcm" | "life";

export default function CalculatorPage() {
  const t = useTranslations("calculator");
  const [activeTab, setActiveTab] = useState<Tab>("pension");
  const [loading, setLoading] = useState(false);
  const [pensionResult, setPensionResult] = useState<PensionGapResult | null>(null);
  const [tcmResult, setTcmResult] = useState<TCMResult | null>(null);
  const [lifeResult, setLifeResult] = useState<LifeCapitalResult | null>(null);
  const [exporting, setExporting] = useState(false);

  // Pension Gap form
  const [pensionForm, setPensionForm] = useState({
    current_age: 40,
    retirement_age: 67,
    current_annual_income: 50000,
    expected_pension_rate: 0.6,
    desired_replacement_rate: 0.8,
    inflation_rate: 0.02,
    investment_return_rate: 0.04,
    life_expectancy: 85,
    existing_pension_savings: 0,
    other_retirement_income: 0,
  });

  // TCM form
  const [tcmForm, setTcmForm] = useState({
    annual_income: 50000,
    years_of_coverage: 10,
    dependents: 2,
    monthly_expenses: 3000,
    outstanding_debts: 100000,
    existing_coverage: 0,
    inflation_rate: 0.02,
    education_cost_per_child: 50000,
  });

  // Life Capital form
  const [lifeForm, setLifeForm] = useState({
    annual_income: 50000,
    age: 40,
    retirement_age: 67,
    dependents: 2,
    monthly_fixed_expenses: 2500,
    outstanding_mortgage: 150000,
    other_debts: 10000,
    existing_life_insurance: 0,
    emergency_fund_months: 6,
    inflation_rate: 0.02,
    discount_rate: 0.03,
  });

  const handleCalculate = async () => {
    setLoading(true);
    try {
      if (activeTab === "pension") {
        const result = await api.calculatePensionGap(pensionForm) as PensionGapResult;
        setPensionResult(result);
      } else if (activeTab === "tcm") {
        const result = await api.calculateTCM(tcmForm) as TCMResult;
        setTcmResult(result);
      } else {
        const result = await api.calculateLifeCapital(lifeForm) as LifeCapitalResult;
        setLifeResult(result);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Calcolo fallito");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    opts?: { step?: number; min?: number; suffix?: string }
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {opts?.suffix && <span className="text-gray-400 dark:text-gray-500">({opts.suffix})</span>}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={opts?.step || 1}
        min={opts?.min ?? 0}
        className="input-field"
      />
    </div>
  );

  const renderCapitalCards = (min: number, rec: number, pru: number) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Livelli di Capitale</p>
        <HelpIcon text="Minimo: copertura base. Raccomandato: copertura adeguata. Prudenziale: massima protezione." position="right" />
      </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="card p-4 border-gray-300 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Minimo</p>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(min)}</p>
      </div>
      <div className="card p-4 border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/30">
        <p className="text-xs text-primary-600 dark:text-primary-400 uppercase font-semibold">Raccomandato</p>
        <p className="text-lg font-bold text-primary-700 dark:text-primary-300 mt-1">{formatCurrency(rec)}</p>
      </div>
      <div className="card p-4 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30">
        <p className="text-xs text-amber-600 dark:text-amber-400 uppercase font-semibold">Prudenziale</p>
        <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-1">{formatCurrency(pru)}</p>
      </div>
    </div>
    </div>
  );

  const handleExport = async (format: "pdf" | "csv") => {
    const currentResult = activeTab === "pension" ? pensionResult : activeTab === "tcm" ? tcmResult : lifeResult;
    if (!currentResult) return;

    setExporting(true);
    try {
      if (format === "pdf") {
        await api.exportCalculatorPdf(activeTab, currentResult as unknown as Record<string, unknown>);
      } else {
        await api.exportCalculatorCsv(activeTab, currentResult as unknown as Record<string, unknown>);
      }
      toast.success(`${format.toUpperCase()} scaricato`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download fallito");
    } finally {
      setExporting(false);
    }
  };

  const renderExportButtons = () => (
    <div className="flex gap-2 mt-4">
      <button
        onClick={() => handleExport("pdf")}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <Download className="h-4 w-4" />
        Scarica PDF
      </button>
      <button
        onClick={() => handleExport("csv")}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Scarica CSV
      </button>
    </div>
  );

  const renderDetails = (formulas: string[], assumptions: string[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
          <Calculator className="h-4 w-4" /> Formule Utilizzate
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          {formulas.map((f, i) => (
            <li key={i} className="font-mono bg-gray-50 dark:bg-gray-900 p-1.5 rounded">{f}</li>
          ))}
        </ul>
      </div>
      <div className="card p-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
          <Info className="h-4 w-4" /> Ipotesi
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          {assumptions.map((a, i) => (
            <li key={i}>&#8226; {a}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calcolatore Fabbisogno Assicurativo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Analisi del fabbisogno di capitale — nessun preventivo premio
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6" role="tablist">
        {([
          ["pension", "Gap Pensionistico"],
          ["tcm", "Capitale TCM"],
          ["life", "Capitale Vita"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-primary-500 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card p-6" role="tabpanel">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            Parametri di Input
            <HelpIcon text="Inserisci i tassi come decimali (es. 0.02 per il 2%). I risultati mostrano tre scenari di capitale." position="right" />
          </h2>

          {activeTab === "pension" && (
            <div className="space-y-3">
              {renderInput("Età Attuale", pensionForm.current_age, (v) => setPensionForm({ ...pensionForm, current_age: v }))}
              {renderInput("Età Pensionamento", pensionForm.retirement_age, (v) => setPensionForm({ ...pensionForm, retirement_age: v }))}
              {renderInput("Reddito Annuo Attuale", pensionForm.current_annual_income, (v) => setPensionForm({ ...pensionForm, current_annual_income: v }), { suffix: "EUR" })}
              {renderInput("Tasso Pensionistico Previsto", pensionForm.expected_pension_rate, (v) => setPensionForm({ ...pensionForm, expected_pension_rate: v }), { step: 0.01, suffix: "0-1" })}
              {renderInput("Tasso di Sostituzione Desiderato", pensionForm.desired_replacement_rate, (v) => setPensionForm({ ...pensionForm, desired_replacement_rate: v }), { step: 0.01, suffix: "0-1" })}
              {renderInput("Tasso di Inflazione", pensionForm.inflation_rate, (v) => setPensionForm({ ...pensionForm, inflation_rate: v }), { step: 0.01, suffix: "0-1" })}
              {renderInput("Tasso di Rendimento Investimenti", pensionForm.investment_return_rate, (v) => setPensionForm({ ...pensionForm, investment_return_rate: v }), { step: 0.01, suffix: "0-1" })}
              {renderInput("Aspettativa di Vita", pensionForm.life_expectancy, (v) => setPensionForm({ ...pensionForm, life_expectancy: v }))}
              {renderInput("Risparmi Pensionistici Esistenti", pensionForm.existing_pension_savings, (v) => setPensionForm({ ...pensionForm, existing_pension_savings: v }), { suffix: "EUR" })}
              {renderInput("Altre Entrate Pensionistiche (annuali)", pensionForm.other_retirement_income, (v) => setPensionForm({ ...pensionForm, other_retirement_income: v }), { suffix: "EUR" })}
            </div>
          )}

          {activeTab === "tcm" && (
            <div className="space-y-3">
              {renderInput("Reddito Annuo", tcmForm.annual_income, (v) => setTcmForm({ ...tcmForm, annual_income: v }), { suffix: "EUR" })}
              {renderInput("Anni di Copertura", tcmForm.years_of_coverage, (v) => setTcmForm({ ...tcmForm, years_of_coverage: v }))}
              {renderInput("Persone a Carico", tcmForm.dependents, (v) => setTcmForm({ ...tcmForm, dependents: v }))}
              {renderInput("Spese Mensili", tcmForm.monthly_expenses, (v) => setTcmForm({ ...tcmForm, monthly_expenses: v }), { suffix: "EUR" })}
              {renderInput("Debiti in Essere", tcmForm.outstanding_debts, (v) => setTcmForm({ ...tcmForm, outstanding_debts: v }), { suffix: "EUR" })}
              {renderInput("Copertura Esistente", tcmForm.existing_coverage, (v) => setTcmForm({ ...tcmForm, existing_coverage: v }), { suffix: "EUR" })}
              {renderInput("Costo Istruzione per Figlio", tcmForm.education_cost_per_child, (v) => setTcmForm({ ...tcmForm, education_cost_per_child: v }), { suffix: "EUR" })}
            </div>
          )}

          {activeTab === "life" && (
            <div className="space-y-3">
              {renderInput("Reddito Annuo", lifeForm.annual_income, (v) => setLifeForm({ ...lifeForm, annual_income: v }), { suffix: "EUR" })}
              {renderInput("Età Attuale", lifeForm.age, (v) => setLifeForm({ ...lifeForm, age: v }))}
              {renderInput("Età Pensionamento", lifeForm.retirement_age, (v) => setLifeForm({ ...lifeForm, retirement_age: v }))}
              {renderInput("Persone a Carico", lifeForm.dependents, (v) => setLifeForm({ ...lifeForm, dependents: v }))}
              {renderInput("Spese Fisse Mensili", lifeForm.monthly_fixed_expenses, (v) => setLifeForm({ ...lifeForm, monthly_fixed_expenses: v }), { suffix: "EUR" })}
              {renderInput("Mutuo Residuo", lifeForm.outstanding_mortgage, (v) => setLifeForm({ ...lifeForm, outstanding_mortgage: v }), { suffix: "EUR" })}
              {renderInput("Altri Debiti", lifeForm.other_debts, (v) => setLifeForm({ ...lifeForm, other_debts: v }), { suffix: "EUR" })}
              {renderInput("Assicurazione Vita Esistente", lifeForm.existing_life_insurance, (v) => setLifeForm({ ...lifeForm, existing_life_insurance: v }), { suffix: "EUR" })}
              {renderInput("Mesi Fondo Emergenza", lifeForm.emergency_fund_months, (v) => setLifeForm({ ...lifeForm, emergency_fund_months: v }))}
            </div>
          )}

          <button
            onClick={handleCalculate}
            disabled={loading}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4" />
            )}
            {loading ? "Calcolo in corso..." : "Calcola"}
          </button>
        </div>

        {/* Results */}
        <div>
          {activeTab === "pension" && pensionResult && (
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Analisi Gap Pensionistico</h3>
                {renderCapitalCards(
                  pensionResult.total_capital_needed_minimum,
                  pensionResult.total_capital_needed_recommended,
                  pensionResult.total_capital_needed_prudential
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Pensione Prevista</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(pensionResult.projected_annual_pension)}/anno</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Reddito Desiderato</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(pensionResult.desired_annual_income)}/anno</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Gap Annuale</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(pensionResult.annual_gap)}/anno</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Risparmio Mensile Necessario</p>
                    <p className="font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(pensionResult.monthly_savings_needed)}/mese</p>
                  </div>
                </div>
              </div>
              {renderDetails(pensionResult.formulas_used, pensionResult.assumptions)}
              {renderExportButtons()}
            </div>
          )}

          {activeTab === "tcm" && tcmResult && (
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Analisi Capitale TCM</h3>
                {renderCapitalCards(
                  tcmResult.total_capital_minimum,
                  tcmResult.total_capital_recommended,
                  tcmResult.total_capital_prudential
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Sostituzione Reddito</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(tcmResult.income_replacement_needed)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Copertura Debiti</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(tcmResult.debt_coverage)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Fondo Istruzione</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(tcmResult.education_fund)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Gap di Copertura</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(tcmResult.existing_coverage_gap)}</p>
                  </div>
                </div>
              </div>
              {renderDetails(tcmResult.formulas_used, tcmResult.assumptions)}
              {renderExportButtons()}
            </div>
          )}

          {activeTab === "life" && lifeResult && (
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Adeguatezza Capitale Vita</h3>
                {renderCapitalCards(
                  lifeResult.total_capital_minimum,
                  lifeResult.total_capital_recommended,
                  lifeResult.total_capital_prudential
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Capitale Sostituzione Reddito</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(lifeResult.income_replacement_capital)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Estinzione Debiti</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(lifeResult.debt_clearance)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Fondo Emergenza</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(lifeResult.emergency_fund)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Gap di Copertura</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(lifeResult.coverage_gap)}</p>
                  </div>
                </div>
              </div>
              {renderDetails(lifeResult.formulas_used, lifeResult.assumptions)}
              {renderExportButtons()}
            </div>
          )}

          {!pensionResult && !tcmResult && !lifeResult && (
            <div className="card p-12 text-center text-gray-400 dark:text-gray-500">
              <Calculator className="h-12 w-12 mx-auto mb-3" />
              <p>Compila i parametri e clicca Calcola</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
