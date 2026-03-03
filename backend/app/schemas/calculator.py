from typing import Optional, List
from pydantic import BaseModel


class PensionGapInput(BaseModel):
    current_age: int
    retirement_age: int = 67
    current_annual_income: float
    expected_pension_rate: float = 0.60
    desired_replacement_rate: float = 0.80
    inflation_rate: float = 0.02
    investment_return_rate: float = 0.04
    life_expectancy: int = 85
    existing_pension_savings: float = 0.0
    other_retirement_income: float = 0.0


class PensionGapResult(BaseModel):
    projected_annual_pension: float
    desired_annual_income: float
    annual_gap: float
    total_capital_needed_minimum: float
    total_capital_needed_recommended: float
    total_capital_needed_prudential: float
    years_to_retirement: int
    monthly_savings_needed: float
    formulas_used: List[str]
    assumptions: List[str]


class TCMInput(BaseModel):
    annual_income: float
    years_of_coverage: int = 10
    dependents: int = 0
    monthly_expenses: float
    outstanding_debts: float = 0.0
    existing_coverage: float = 0.0
    inflation_rate: float = 0.02
    education_cost_per_child: float = 50000.0


class TCMResult(BaseModel):
    income_replacement_needed: float
    debt_coverage: float
    education_fund: float
    total_capital_minimum: float
    total_capital_recommended: float
    total_capital_prudential: float
    existing_coverage_gap: float
    formulas_used: List[str]
    assumptions: List[str]


class LifeCapitalInput(BaseModel):
    annual_income: float
    age: int
    retirement_age: int = 67
    dependents: int = 0
    monthly_fixed_expenses: float
    outstanding_mortgage: float = 0.0
    other_debts: float = 0.0
    existing_life_insurance: float = 0.0
    emergency_fund_months: int = 6
    inflation_rate: float = 0.02
    discount_rate: float = 0.03


class LifeCapitalResult(BaseModel):
    income_replacement_capital: float
    debt_clearance: float
    emergency_fund: float
    total_capital_minimum: float
    total_capital_recommended: float
    total_capital_prudential: float
    coverage_gap: float
    formulas_used: List[str]
    assumptions: List[str]
