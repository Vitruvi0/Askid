from app.schemas.calculator import (
    PensionGapInput, PensionGapResult,
    TCMInput, TCMResult,
    LifeCapitalInput, LifeCapitalResult,
)


class CalculatorService:
    """Insurance needs calculator - capital analysis only, no premium quotation."""

    def calculate_pension_gap(self, data: PensionGapInput) -> PensionGapResult:
        years_to_retirement = data.retirement_age - data.current_age
        years_in_retirement = data.life_expectancy - data.retirement_age

        # Future income at retirement (adjusted for inflation)
        future_income = data.current_annual_income * (
            (1 + data.inflation_rate) ** years_to_retirement
        )

        # Projected pension
        projected_pension = future_income * data.expected_pension_rate

        # Desired income in retirement
        desired_income = future_income * data.desired_replacement_rate

        # Annual gap
        annual_gap = max(0, desired_income - projected_pension - data.other_retirement_income)

        # Present value of annuity factor
        if data.investment_return_rate > 0:
            real_rate = (1 + data.investment_return_rate) / (1 + data.inflation_rate) - 1
            annuity_factor = (1 - (1 + real_rate) ** (-years_in_retirement)) / real_rate
        else:
            annuity_factor = years_in_retirement

        # Capital needed (minimum = exact gap, recommended = +20%, prudential = +40%)
        minimum_capital = annual_gap * annuity_factor - data.existing_pension_savings
        minimum_capital = max(0, minimum_capital)
        recommended_capital = minimum_capital * 1.20
        prudential_capital = minimum_capital * 1.40

        # Monthly savings needed
        if years_to_retirement > 0 and data.investment_return_rate > 0:
            monthly_rate = data.investment_return_rate / 12
            months = years_to_retirement * 12
            fv_factor = ((1 + monthly_rate) ** months - 1) / monthly_rate
            monthly_savings = recommended_capital / fv_factor if fv_factor > 0 else 0
        else:
            monthly_savings = recommended_capital / max(1, years_to_retirement * 12)

        return PensionGapResult(
            projected_annual_pension=round(projected_pension, 2),
            desired_annual_income=round(desired_income, 2),
            annual_gap=round(annual_gap, 2),
            total_capital_needed_minimum=round(minimum_capital, 2),
            total_capital_needed_recommended=round(recommended_capital, 2),
            total_capital_needed_prudential=round(prudential_capital, 2),
            years_to_retirement=years_to_retirement,
            monthly_savings_needed=round(monthly_savings, 2),
            formulas_used=[
                "Future Income = Current Income × (1 + inflation)^years_to_retirement",
                "Projected Pension = Future Income × pension_rate",
                "Annual Gap = Desired Income - Projected Pension - Other Income",
                "Capital Needed = Annual Gap × Annuity Factor - Existing Savings",
                "Annuity Factor = (1 - (1+r)^(-n)) / r (present value of annuity)",
                "Monthly Savings = Capital / FV Annuity Factor",
            ],
            assumptions=[
                f"Inflation rate: {data.inflation_rate*100:.1f}%",
                f"Investment return: {data.investment_return_rate*100:.1f}%",
                f"Life expectancy: {data.life_expectancy} years",
                f"Pension replacement rate: {data.expected_pension_rate*100:.0f}%",
                "Recommended capital includes 20% safety margin",
                "Prudential capital includes 40% safety margin",
            ],
        )

    def calculate_tcm(self, data: TCMInput) -> TCMResult:
        # Income replacement needed
        annual_expenses = data.monthly_expenses * 12
        income_replacement = 0.0
        for year in range(data.years_of_coverage):
            income_replacement += annual_expenses * ((1 + data.inflation_rate) ** year)

        # Education fund
        education_fund = data.dependents * data.education_cost_per_child * (
            (1 + data.inflation_rate) ** 5  # average 5 years to education
        )

        # Totals
        minimum = income_replacement + data.outstanding_debts + education_fund
        existing_gap = minimum - data.existing_coverage
        existing_gap = max(0, existing_gap)

        recommended = existing_gap * 1.20
        prudential = existing_gap * 1.40

        return TCMResult(
            income_replacement_needed=round(income_replacement, 2),
            debt_coverage=round(data.outstanding_debts, 2),
            education_fund=round(education_fund, 2),
            total_capital_minimum=round(minimum, 2),
            total_capital_recommended=round(recommended, 2),
            total_capital_prudential=round(prudential, 2),
            existing_coverage_gap=round(existing_gap, 2),
            formulas_used=[
                "Income Replacement = Σ (Annual Expenses × (1 + inflation)^year) for each year",
                "Education Fund = Dependents × Cost per Child × (1 + inflation)^5",
                "Total Minimum = Income Replacement + Debts + Education",
                "Coverage Gap = Total Minimum - Existing Coverage",
            ],
            assumptions=[
                f"Inflation rate: {data.inflation_rate*100:.1f}%",
                f"Coverage period: {data.years_of_coverage} years",
                f"Education cost per child: €{data.education_cost_per_child:,.0f}",
                "Education costs projected 5 years forward",
                "Recommended capital includes 20% safety margin",
                "Prudential capital includes 40% safety margin",
            ],
        )

    def calculate_life_capital(self, data: LifeCapitalInput) -> LifeCapitalResult:
        years_to_retirement = data.retirement_age - data.age

        # Income replacement: present value of future income stream
        if data.discount_rate > data.inflation_rate:
            net_rate = data.discount_rate - data.inflation_rate
            income_pv = data.annual_income * (
                (1 - (1 + net_rate) ** (-years_to_retirement)) / net_rate
            )
        else:
            income_pv = data.annual_income * years_to_retirement

        # Debt clearance
        total_debts = data.outstanding_mortgage + data.other_debts

        # Emergency fund
        emergency = data.monthly_fixed_expenses * data.emergency_fund_months

        # Totals
        minimum = income_pv + total_debts + emergency
        gap = max(0, minimum - data.existing_life_insurance)
        recommended = gap * 1.20
        prudential = gap * 1.40

        return LifeCapitalResult(
            income_replacement_capital=round(income_pv, 2),
            debt_clearance=round(total_debts, 2),
            emergency_fund=round(emergency, 2),
            total_capital_minimum=round(minimum, 2),
            total_capital_recommended=round(recommended, 2),
            total_capital_prudential=round(prudential, 2),
            coverage_gap=round(gap, 2),
            formulas_used=[
                "Income PV = Annual Income × ((1-(1+r)^(-n))/r) where r = discount - inflation",
                "Total Debts = Mortgage + Other Debts",
                "Emergency Fund = Monthly Expenses × Emergency Months",
                "Minimum Capital = Income PV + Debts + Emergency",
                "Gap = Minimum - Existing Insurance",
            ],
            assumptions=[
                f"Inflation rate: {data.inflation_rate*100:.1f}%",
                f"Discount rate: {data.discount_rate*100:.1f}%",
                f"Years to retirement: {years_to_retirement}",
                f"Emergency fund: {data.emergency_fund_months} months",
                "Recommended capital includes 20% safety margin",
                "Prudential capital includes 40% safety margin",
            ],
        )


calculator_service = CalculatorService()
