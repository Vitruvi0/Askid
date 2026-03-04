"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import type { ReportResponse, Conversation, ConversationDetail } from "@/types";
import { FileOutput, Loader2, Copy, FileText, Mail, Download, ChevronDown } from "lucide-react";
import HelpIcon from "@/components/ui/HelpIcon";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

type ConversationGroup = {
  label: string;
  type: string;
  items: Conversation[];
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [activeView, setActiveView] = useState<"technical" | "client" | "email">("technical");
  const [sourceType, setSourceType] = useState("qa");
  const [clientName, setClientName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [sourceData, setSourceData] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Conversation source state
  const [conversationGroups, setConversationGroups] = useState<ConversationGroup[]>([]);
  const [selectedConvId, setSelectedConvId] = useState("");
  const [loadingSource, setLoadingSource] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const [qa, comparison, calculator] = await Promise.all([
        api.getConversations("document_qa", 0, 10) as Promise<{ conversations: Conversation[] }>,
        api.getConversations("comparison", 0, 10) as Promise<{ conversations: Conversation[] }>,
        api.getConversations("calculator", 0, 10) as Promise<{ conversations: Conversation[] }>,
      ]);

      const groups: ConversationGroup[] = [];
      if (qa.conversations.length > 0) {
        groups.push({ label: "Q&A Documenti", type: "qa", items: qa.conversations });
      }
      if (comparison.conversations.length > 0) {
        groups.push({ label: "Confronti", type: "comparison", items: comparison.conversations });
      }
      if (calculator.conversations.length > 0) {
        groups.push({ label: "Calcolatore", type: "calculator", items: calculator.conversations });
      }
      setConversationGroups(groups);
    } catch {
      // Ignore — conversations API may not be populated yet
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = async (convId: string) => {
    setSelectedConvId(convId);
    if (!convId) {
      setSourceData("");
      return;
    }

    setLoadingSource(true);
    try {
      const detail = await api.getConversation(convId) as ConversationDetail;

      // Determine source type from conversation type
      const typeMap: Record<string, string> = {
        document_qa: "qa",
        comparison: "comparison",
        calculator: "calculator",
      };
      setSourceType(typeMap[detail.conversation_type] || "qa");

      // Extract metadata from last assistant message
      const lastAssistant = [...detail.messages].reverse().find((m) => m.role === "assistant");
      if (lastAssistant?.metadata_json) {
        // For calculator, extract the result from metadata
        const metadata = lastAssistant.metadata_json;
        if (detail.conversation_type === "calculator" && (metadata as { result?: unknown }).result) {
          setSourceData(JSON.stringify((metadata as { result: unknown }).result, null, 2));
        } else {
          setSourceData(JSON.stringify(metadata, null, 2));
        }
      }
    } catch {
      toast.error("Impossibile caricare i dati della conversazione");
    } finally {
      setLoadingSource(false);
    }
  };

  const handleGenerate = async () => {
    if (!sourceData.trim()) {
      toast.error("Seleziona una fonte dati o incolla il JSON manualmente");
      return;
    }

    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(sourceData);
    } catch {
      toast.error("Dati JSON non validi");
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
      toast.error(err instanceof Error ? err.message : "Generazione report fallita");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiato negli appunti");
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generazione Report</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Genera report pronti per il cliente dai risultati dell&apos;analisi
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Configurazione Report</h2>

          <div className="space-y-4">
            {/* Conversation Source Selector */}
            {conversationGroups.length > 0 && (
              <div>
                <label htmlFor="report-source-conv" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Seleziona Fonte Dati
                </label>
                <select
                  id="report-source-conv"
                  value={selectedConvId}
                  onChange={(e) => handleSelectConversation(e.target.value)}
                  className="input-field"
                  disabled={loadingSource}
                >
                  <option value="">Seleziona un&apos;analisi recente...</option>
                  {conversationGroups.map((group) => (
                    <optgroup key={group.type} label={group.label}>
                      {group.items.map((conv) => (
                        <option key={conv.id} value={conv.id}>
                          {conv.title || "Senza titolo"} — {new Date(conv.created_at).toLocaleDateString("it-IT")}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {loadingSource && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Caricamento dati...
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="report-source-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo di Origine
              </label>
              <select
                id="report-source-type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="input-field"
              >
                <option value="qa">Domande sul Documento</option>
                <option value="comparison">Confronto Polizze</option>
                <option value="calculator">Analisi Calcolatore</option>
              </select>
            </div>

            <div>
              <label htmlFor="report-client-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome Cliente
              </label>
              <input
                id="report-client-name"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="input-field"
                placeholder="Inserisci nome cliente"
              />
            </div>

            <div>
              <label htmlFor="report-agency-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome Agenzia
              </label>
              <input
                id="report-agency-name"
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="input-field"
                placeholder="Inserisci nome agenzia"
              />
            </div>

            {/* Collapsible Manual JSON Input */}
            <div>
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showManualInput ? "rotate-180" : ""}`} />
                Inserimento manuale JSON
                <HelpIcon text="Incolla il risultato JSON di un'analisi precedente (Q&A, confronto o calcolatore)." position="right" />
              </button>
              {showManualInput && (
                <textarea
                  id="report-source-data"
                  value={sourceData}
                  onChange={(e) => setSourceData(e.target.value)}
                  className="input-field h-40 font-mono text-xs mt-2"
                  placeholder='Incolla qui il JSON del risultato...'
                />
              )}
            </div>

            {sourceData && !showManualInput && (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs p-2 rounded-lg">
                Dati fonte caricati ({sourceData.length} caratteri)
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !sourceData.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileOutput className="h-4 w-4" />
              )}
              {loading ? "Generazione in corso..." : "Genera Report"}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="card flex flex-col">
          {report ? (
            <>
              <div className="flex border-b border-gray-200 dark:border-gray-700" role="tablist">
                {([
                  ["technical", "Tecnico", FileText],
                  ["client", "Cliente", FileOutput],
                  ["email", "Email", Mail],
                ] as [typeof activeView, string, typeof FileText][]).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={activeView === key}
                    onClick={() => setActiveView(key)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeView === key
                        ? "border-primary-500 text-primary-600 dark:text-primary-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  onClick={async () => {
                    try {
                      await api.exportReportPdf(activeView, currentContent);
                      toast.success("PDF scaricato");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Download fallito");
                    }
                  }}
                  className="px-4 py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Scarica PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => copyToClipboard(currentContent)}
                  className="px-4 py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Copia negli appunti"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 prose prose-sm max-w-none dark:prose-invert" role="tabpanel">
                <ReactMarkdown>{currentContent}</ReactMarkdown>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 p-8">
              <div className="text-center">
                <FileOutput className="h-12 w-12 mx-auto mb-3" />
                <p className="text-sm">Configura e genera un report</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
