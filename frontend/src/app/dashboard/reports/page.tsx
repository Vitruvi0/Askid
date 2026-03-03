"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import type { ReportResponse } from "@/types";
import { FileOutput, Loader2, Copy, FileText, Mail } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [activeView, setActiveView] = useState<"technical" | "client" | "email">("technical");
  const [sourceType, setSourceType] = useState("qa");
  const [clientName, setClientName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [sourceData, setSourceData] = useState("");

  const handleGenerate = async () => {
    if (!sourceData.trim()) {
      toast.error("Please paste analysis data");
      return;
    }

    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(sourceData);
    } catch {
      toast.error("Invalid JSON data. Paste the analysis result JSON.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.generateReport({
        source_type: sourceType,
        source_data: parsedData,
        client_name: clientName || undefined,
        agency_name: agencyName || undefined,
      }) as ReportResponse;
      setReport(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const currentContent = report
    ? activeView === "technical"
      ? report.technical_report
      : activeView === "client"
      ? report.client_report
      : report.email_text
    : "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Generation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate client-ready reports from analysis results
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Report Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="input-field"
              >
                <option value="qa">Document Q&A</option>
                <option value="comparison">Policy Comparison</option>
                <option value="calculator">Calculator Analysis</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="input-field"
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agency Name
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="input-field"
                placeholder="Enter agency name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Analysis Data (JSON)
              </label>
              <textarea
                value={sourceData}
                onChange={(e) => setSourceData(e.target.value)}
                className="input-field h-48 font-mono text-xs"
                placeholder='Paste the analysis result JSON here...&#10;e.g., {"answer": "...", "referenced_sections": [...]}'
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileOutput className="h-4 w-4" />
              )}
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="card flex flex-col">
          {report ? (
            <>
              <div className="flex border-b border-gray-200">
                {([
                  ["technical", "Technical", FileText],
                  ["client", "Client", FileOutput],
                  ["email", "Email", Mail],
                ] as [typeof activeView, string, typeof FileText][]).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setActiveView(key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeView === key
                        ? "border-primary-500 text-primary-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={() => copyToClipboard(currentContent)}
                  className="px-4 py-3 text-gray-400 hover:text-gray-600"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none">
                <ReactMarkdown>{currentContent}</ReactMarkdown>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-8">
              <div className="text-center">
                <FileOutput className="h-12 w-12 mx-auto mb-3" />
                <p className="text-sm">Configure and generate a report</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
