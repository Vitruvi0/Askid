"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import type { PensionGapResult, TCMResult, LifeCapitalResult } from "@/types";
import { Calculator, Loader2, Info, TrendingUp } from "lucide-react";

type Tab = "pension" | "tcm" | "life";

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pension");
  const [loading, setLoading] = useState(false);
  const [pensionResult, setPensionResult] = useState<PensionGapResult | null>(null);
  const [tcmResult, setTcmResult] = useState<TCMResult | null>(null);
  const [lifeResult, setLifeResult] = useState<LifeCapitalResult | null>(null);

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
      toast.error(err instanceof Error ? err.message : "Calculation failed");
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
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {opts?.suffix && <span className="text-gray-400">({opts.suffix})</span>}
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
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="card p-4 border-gray-300">
        <p className="text-xs text-gray-500 uppercase font-semibold">Minimum</p>
        <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(min)}</p>
      </div>
      <div className="card p-4 border-primary-300 bg-primary-50">
        <p className="text-xs text-primary-600 uppercase font-semibold">Recommended</p>
        <p className="text-lg font-bold text-primary-700 mt-1">{formatCurrency(rec)}</p>
      </div>
      <div className="card p-4 border-amber-300 bg-amber-50">
        <p className="text-xs text-amber-600 uppercase font-semibold">Prudential</p>
        <p className="text-lg font-bold text-amber-700 mt-1">{formatCurrency(pru)}</p>
      </div>
    </div>
  );

  const renderDetails = (formulas: string[], assumptions: string[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
          <Calculator className="h-4 w-4" /> Formulas Used
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          {formulas.map((f, i) => (
            <li key={i} className="font-mono bg-gray-50 p-1.5 rounded">{f}</li>
          ))}
        </ul>
      </div>
      <div className="card p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
          <Info className="h-4 w-4" /> Assumptions
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
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
        <h1 className="text-2xl font-bold text-gray-900">Insurance Needs Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Capital needs analysis — no premium quotation
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          ["pension", "Pension Gap"],
          ["tcm", "TCM Capital"],
          ["life", "Life Capital"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-primary-500 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Input Parameters</h2>

          {activeTab === "pension" && (
            <div className="space-y-3">
              {renderInput("Current Age", pensionForm.current_age, (v) => setPensionForm({ ...pensionForm, current_age: v }))}
              {renderInput("Retirement Age", pensionForm.retirement_age, (v) => setPensionForm({ ...pensionForm, retirement_age: v }))}
              {renderInput("Current Annual Income", pensionForm.current_annual_income, (v) => setPensionForm({ ...pensionForm, current_annual_income: v }), { suffix: "EUR" })}
              {renderInput("Expected Pension Rate", pensionForm.expected_pension_rate, (v) => setPensionForm({ ...pensionForm, expected_pension_rate: v }), { step: 0.01, suffix: "0-1" })}
              {renderInput("Desired Replacement Rate", pensionForm.desired_replacement_rate, (v) => setPensionForm({ ...pensionForm, desired_replacement_rate: v }), { step: 0.01, suffix: "0-1" })}
              {renderInput("Inflation Rate", pensionForm.inflation_rate, (v) => setPensionForm({ ...pensionForm, inflation_rate: v }), { step: 0.01, suffix: "0-1" })}
              {renderInput("Investment Return Rate", pensionForm.investment_return_rate, (v) => setPensionForm({ ...pensionForm, investment_return_rate: v }), { step: 0.01, suffix: "0-1" })}
              {renderInput("Life Expectancy", pensionForm.life_expectancy, (v) => setPensionForm({ ...pensionForm, life_expectancy: v }))}
              {renderInput("Existing Pension Savings", pensionForm.existing_pension_savings, (v) => setPensionForm({ ...pensionForm, existing_pension_savings: v }), { suffix: "EUR" })}
              {renderInput("Other Retirement Income (annual)", pensionForm.other_retirement_income, (v) => setPensionForm({ ...pensionForm, other_retirement_income: v }), { suffix: "EUR" })}
            </div>
          )}

          {activeTab === "tcm" && (
            <div className="space-y-3">
              {renderInput("Annual Income", tcmForm.annual_income, (v) => setTcmForm({ ...tcmForm, annual_income: v }), { suffix: "EUR" })}
              {renderInput("Years of Coverage", tcmForm.years_of_coverage, (v) => setTcmForm({ ...tcmForm, years_of_coverage: v }))}
              {renderInput("Dependents", tcmForm.dependents, (v) => setTcmForm({ ...tcmForm, dependents: v }))}
              {renderInput("Monthly Expenses", tcmForm.monthly_expenses, (v) => setTcmForm({ ...tcmForm, monthly_expenses: v }), { suffix: "EUR" })}
              {renderInput("Outstanding Debts", tcmForm.outstanding_debts, (v) => setTcmForm({ ...tcmForm, outstanding_debts: v }), { suffix: "EUR" })}
              {renderInput("Existing Coverage", tcmForm.existing_coverage, (v) => setTcmForm({ ...tcmForm, existing_coverage: v }), { suffix: "EUR" })}
              {renderInput("Education Cost per Child", tcmForm.education_cost_per_child, (v) => setTcmForm({ ...tcmForm, education_cost_per_child: v }), { suffix: "EUR" })}
            </div>
          )}

          {activeTab === "life" && (
            <div className="space-y-3">
              {renderInput("Annual Income", lifeForm.annual_income, (v) => setLifeForm({ ...lifeForm, annual_income: v }), { suffix: "EUR" })}
              {renderInput("Current Age", lifeForm.age, (v) => setLifeForm({ ...lifeForm, age: v }))}
              {renderInput("Retirement Age", lifeForm.retirement_age, (v) => setLifeForm({ ...lifeForm, retirement_age: v }))}
              {renderInput("Dependents", lifeForm.dependents, (v) => setLifeForm({ ...lifeForm, dependents: v }))}
              {renderInput("Monthly Fixed Expenses", lifeForm.monthly_fixed_expenses, (v) => setLifeForm({ ...lifeForm, monthly_fixed_expenses: v }), { suffix: "EUR" })}
              {renderInput("Outstanding Mortgage", lifeForm.outstanding_mortgage, (v) => setLifeForm({ ...lifeForm, outstanding_mortgage: v }), { suffix: "EUR" })}
              {renderInput("Other Debts", lifeForm.other_debts, (v) => setLifeForm({ ...lifeForm, other_debts: v }), { suffix: "EUR" })}
              {renderInput("Existing Life Insurance", lifeForm.existing_life_insurance, (v) => setLifeForm({ ...lifeForm, existing_life_insurance: v }), { suffix: "EUR" })}
              {renderInput("Emergency Fund Months", lifeForm.emergency_fund_months, (v) => setLifeForm({ ...lifeForm, emergency_fund_months: v }))}
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
            {loading ? "Calculating..." : "Calculate"}
          </button>
        </div>

        {/* Results */}
        <div>
          {activeTab === "pension" && pensionResult && (
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Pension Gap Analysis</h3>
                {renderCapitalCards(
                  pensionResult.total_capital_needed_minimum,
                  pensionResult.total_capital_needed_recommended,
                  pensionResult.total_capital_needed_prudential
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Projected Pension</p>
                    <p className="font-semibold">{formatCurrency(pensionResult.projected_annual_pension)}/yr</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Desired Income</p>
                    <p className="font-semibold">{formatCurrency(pensionResult.desired_annual_income)}/yr</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Annual Gap</p>
                    <p className="font-semibold text-red-600">{formatCurrency(pensionResult.annual_gap)}/yr</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Monthly Savings Needed</p>
                    <p className="font-semibold text-primary-600">{formatCurrency(pensionResult.monthly_savings_needed)}/mo</p>
                  </div>
                </div>
              </div>
              {renderDetails(pensionResult.formulas_used, pensionResult.assumptions)}
            </div>
          )}

          {activeTab === "tcm" && tcmResult && (
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">TCM Capital Analysis</h3>
                {renderCapitalCards(
                  tcmResult.total_capital_minimum,
                  tcmResult.total_capital_recommended,
                  tcmResult.total_capital_prudential
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Income Replacement</p>
                    <p className="font-semibold">{formatCurrency(tcmResult.income_replacement_needed)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Debt Coverage</p>
                    <p className="font-semibold">{formatCurrency(tcmResult.debt_coverage)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Education Fund</p>
                    <p className="font-semibold">{formatCurrency(tcmResult.education_fund)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Coverage Gap</p>
                    <p className="font-semibold text-red-600">{formatCurrency(tcmResult.existing_coverage_gap)}</p>
                  </div>
                </div>
              </div>
              {renderDetails(tcmResult.formulas_used, tcmResult.assumptions)}
            </div>
          )}

          {activeTab === "life" && lifeResult && (
            <div className="space-y-4">
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Life Capital Adequacy</h3>
                {renderCapitalCards(
                  lifeResult.total_capital_minimum,
                  lifeResult.total_capital_recommended,
                  lifeResult.total_capital_prudential
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Income Replacement Capital</p>
                    <p className="font-semibold">{formatCurrency(lifeResult.income_replacement_capital)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Debt Clearance</p>
                    <p className="font-semibold">{formatCurrency(lifeResult.debt_clearance)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Emergency Fund</p>
                    <p className="font-semibold">{formatCurrency(lifeResult.emergency_fund)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Coverage Gap</p>
                    <p className="font-semibold text-red-600">{formatCurrency(lifeResult.coverage_gap)}</p>
                  </div>
                </div>
              </div>
              {renderDetails(lifeResult.formulas_used, lifeResult.assumptions)}
            </div>
          )}

          {!pensionResult && !tcmResult && !lifeResult && (
            <div className="card p-12 text-center text-gray-400">
              <Calculator className="h-12 w-12 mx-auto mb-3" />
              <p>Fill in the parameters and click Calculate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
