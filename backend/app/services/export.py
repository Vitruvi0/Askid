import csv
import io
from typing import Optional
from jinja2 import Template
from weasyprint import HTML
import markdown


class ExportService:
    """Servizio di esportazione PDF/CSV per calcolatore, confronto e report."""

    BASE_CSS = """
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; margin: 40px; font-size: 12px; line-height: 1.6; }
        h1 { color: #1e40af; font-size: 22px; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-bottom: 16px; }
        h2 { color: #1e40af; font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
        h3 { color: #374151; font-size: 14px; margin-top: 16px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { background-color: #1e40af; color: white; padding: 8px 12px; text-align: left; font-size: 11px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background-color: #f9fafb; }
        .capital-card { display: inline-block; width: 30%; padding: 12px; margin: 4px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; }
        .capital-min { border-color: #9ca3af; }
        .capital-rec { border-color: #1e40af; background-color: #eff6ff; }
        .capital-pru { border-color: #d97706; background-color: #fffbeb; }
        .label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
        .section { margin: 20px 0; }
        .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px; margin: 12px 0; }
        .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
        .prose { max-width: none; }
        .prose h1, .prose h2, .prose h3 { color: #1e40af; }
        .prose ul, .prose ol { padding-left: 20px; }
        .prose blockquote { border-left: 3px solid #1e40af; padding-left: 12px; color: #4b5563; }
    """

    CALCULATOR_TEMPLATE = Template("""
    <html>
    <head><style>{{ css }}</style></head>
    <body>
        <h1>{{ title }}</h1>
        <div style="text-align: center; margin: 24px 0;">
            <div class="capital-card capital-min">
                <div class="label">Minimo</div>
                <div class="value">€ {{ "{:,.2f}".format(min_capital) }}</div>
            </div>
            <div class="capital-card capital-rec">
                <div class="label">Raccomandato</div>
                <div class="value" style="color: #1e40af;">€ {{ "{:,.2f}".format(rec_capital) }}</div>
            </div>
            <div class="capital-card capital-pru">
                <div class="label">Prudenziale</div>
                <div class="value" style="color: #d97706;">€ {{ "{:,.2f}".format(pru_capital) }}</div>
            </div>
        </div>

        <h2>Dettagli</h2>
        <table>
            <thead><tr><th>Parametro</th><th>Valore</th></tr></thead>
            <tbody>
            {% for key, value in details.items() %}
                <tr><td>{{ key }}</td><td>{{ value }}</td></tr>
            {% endfor %}
            </tbody>
        </table>

        {% if formulas %}
        <h2>Formule Utilizzate</h2>
        <ul>
        {% for f in formulas %}
            <li><code>{{ f }}</code></li>
        {% endfor %}
        </ul>
        {% endif %}

        {% if assumptions %}
        <h2>Ipotesi</h2>
        <ul>
        {% for a in assumptions %}
            <li>{{ a }}</li>
        {% endfor %}
        </ul>
        {% endif %}

        <div class="footer">Generato da ASKID — Assistente Assicurativo AI</div>
    </body>
    </html>
    """)

    COMPARISON_TEMPLATE = Template("""
    <html>
    <head><style>{{ css }}</style></head>
    <body>
        <h1>Confronto Polizze</h1>

        <div class="section">
            <h2>Sommario Esecutivo</h2>
            <p>{{ executive_summary }}</p>
        </div>

        <div class="section">
            <h2>Tabella Comparativa</h2>
            <table>
                <thead>
                    <tr><th>Categoria</th><th>Documento 1</th><th>Documento 2</th><th>Note</th></tr>
                </thead>
                <tbody>
                {% for row in comparison_table %}
                    <tr>
                        <td><strong>{{ row.category }}</strong></td>
                        <td>{{ row.document_1 }}</td>
                        <td>{{ row.document_2 }}</td>
                        <td><em>{{ row.notes }}</em></td>
                    </tr>
                {% endfor %}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Analisi Tecnica</h2>
            <p style="white-space: pre-line;">{{ technical_analysis }}</p>
        </div>

        <div class="section">
            <h2>Conclusione</h2>
            <p>{{ conclusion }}</p>
        </div>

        {% if incomplete_areas %}
        <div class="warning">
            <h3>Aree Incomplete</h3>
            <ul>
            {% for area in incomplete_areas %}
                <li>{{ area }}</li>
            {% endfor %}
            </ul>
        </div>
        {% endif %}

        <div class="footer">Generato da ASKID — Assistente Assicurativo AI</div>
    </body>
    </html>
    """)

    def _format_currency(self, value) -> str:
        try:
            return f"€ {float(value):,.2f}"
        except (ValueError, TypeError):
            return str(value)

    def calculator_to_pdf(self, calc_type: str, data: dict) -> bytes:
        titles = {
            "pension": "Analisi Gap Pensionistico",
            "tcm": "Analisi Capitale TCM",
            "life": "Adeguatezza Capitale Vita",
        }

        # Extract capital tiers based on calc_type
        if calc_type == "pension":
            min_c = data.get("total_capital_needed_minimum", 0)
            rec_c = data.get("total_capital_needed_recommended", 0)
            pru_c = data.get("total_capital_needed_prudential", 0)
            details = {
                "Pensione Annua Prevista": self._format_currency(data.get("projected_annual_pension", 0)),
                "Reddito Annuo Desiderato": self._format_currency(data.get("desired_annual_income", 0)),
                "Gap Annuale": self._format_currency(data.get("annual_gap", 0)),
                "Anni al Pensionamento": data.get("years_to_retirement", "N/D"),
                "Risparmio Mensile Necessario": self._format_currency(data.get("monthly_savings_needed", 0)),
            }
        elif calc_type == "tcm":
            min_c = data.get("total_capital_minimum", 0)
            rec_c = data.get("total_capital_recommended", 0)
            pru_c = data.get("total_capital_prudential", 0)
            details = {
                "Sostituzione Reddito": self._format_currency(data.get("income_replacement_needed", 0)),
                "Copertura Debiti": self._format_currency(data.get("debt_coverage", 0)),
                "Fondo Istruzione": self._format_currency(data.get("education_fund", 0)),
                "Gap di Copertura": self._format_currency(data.get("existing_coverage_gap", 0)),
            }
        else:  # life
            min_c = data.get("total_capital_minimum", 0)
            rec_c = data.get("total_capital_recommended", 0)
            pru_c = data.get("total_capital_prudential", 0)
            details = {
                "Capitale Sostituzione Reddito": self._format_currency(data.get("income_replacement_capital", 0)),
                "Estinzione Debiti": self._format_currency(data.get("debt_clearance", 0)),
                "Fondo Emergenza": self._format_currency(data.get("emergency_fund", 0)),
                "Gap di Copertura": self._format_currency(data.get("coverage_gap", 0)),
            }

        html_content = self.CALCULATOR_TEMPLATE.render(
            css=self.BASE_CSS,
            title=titles.get(calc_type, "Analisi Calcolatore"),
            min_capital=float(min_c),
            rec_capital=float(rec_c),
            pru_capital=float(pru_c),
            details=details,
            formulas=data.get("formulas_used", []),
            assumptions=data.get("assumptions", []),
        )

        return HTML(string=html_content).write_pdf()

    def calculator_to_csv(self, calc_type: str, data: dict) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Parametro", "Valore"])

        for key, value in data.items():
            if isinstance(value, list):
                writer.writerow([key, "; ".join(str(v) for v in value)])
            else:
                writer.writerow([key, value])

        return output.getvalue()

    def comparison_to_pdf(self, data: dict) -> bytes:
        html_content = self.COMPARISON_TEMPLATE.render(
            css=self.BASE_CSS,
            executive_summary=data.get("executive_summary", ""),
            comparison_table=data.get("comparison_table", []),
            technical_analysis=data.get("technical_analysis", ""),
            conclusion=data.get("conclusion", ""),
            incomplete_areas=data.get("incomplete_areas", []),
        )

        return HTML(string=html_content).write_pdf()

    def report_to_pdf(self, report_type: str, content: str) -> bytes:
        titles = {
            "technical": "Report Tecnico",
            "client": "Report Cliente",
            "email": "Testo Email",
        }

        html_body = markdown.markdown(content, extensions=["tables", "fenced_code"])
        html_content = f"""
        <html>
        <head><style>{self.BASE_CSS}</style></head>
        <body>
            <h1>{titles.get(report_type, "Report")}</h1>
            <div class="prose">{html_body}</div>
            <div class="footer">Generato da ASKID — Assistente Assicurativo AI</div>
        </body>
        </html>
        """

        return HTML(string=html_content).write_pdf()


export_service = ExportService()
