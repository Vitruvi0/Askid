"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import type { Document, ComparisonResponse, Conversation, ConversationDetail } from "@/types";
import {
  GitCompare,
  Loader2,
  FileText,
  Upload,
  AlertTriangle,
  Download,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import HelpIcon from "@/components/ui/HelpIcon";

export default function ComparePage() {
  const t = useTranslations("compare");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [doc1Id, setDoc1Id] = useState("");
  const [doc2Id, setDoc2Id] = useState("");
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [mode, setMode] = useState<"existing" | "upload">("existing");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [recentComparisons, setRecentComparisons] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await api.getDocuments() as { documents: Document[] };
      setDocuments(data.documents.filter((d) => d.status === "ready"));
    } catch {
      /* ignore */
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.getConversations("comparison") as { conversations: Conversation[] };
      setRecentComparisons(data.conversations);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchHistory();
  }, [fetchDocuments, fetchHistory]);

  const loadFromHistory = async (convId: string) => {
    try {
      const detail = await api.getConversation(convId) as ConversationDetail;
      if (detail.messages.length > 0) {
        const lastMsg = detail.messages[detail.messages.length - 1];
        if (lastMsg.metadata_json) {
          setResult(lastMsg.metadata_json as unknown as ComparisonResponse);
          setShowHistory(false);
        }
      }
    } catch {
      toast.error("Impossibile caricare il confronto");
    }
  };

  const handleCompare = async () => {
    setComparing(true);
    setResult(null);
    try {
      let data: ComparisonResponse;
      if (mode === "existing") {
        if (!doc1Id || !doc2Id) {
          toast.error("Seleziona due documenti");
          return;
        }
        data = (await api.compareDocuments(doc1Id, doc2Id)) as ComparisonResponse;
      } else {
        if (!file1 || !file2) {
          toast.error("Carica due file PDF");
          return;
        }
        data = (await api.compareUploadedDocuments(file1, file2)) as ComparisonResponse;
      }
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Confronto fallito");
    } finally {
      setComparing(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("title")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Confronti Recenti */}
      {recentComparisons.length > 0 && (
        <div className="card mb-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Confronti Recenti ({recentComparisons.length})
            </span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showHistory && (
            <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 max-h-60 overflow-y-auto">
              {recentComparisons.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadFromHistory(conv.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{conv.title || "Confronto"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(conv.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selezione Modalità */}
      <div className="card p-4 mb-6">
        <div className="flex gap-4 mb-4 items-center">
          <HelpIcon text="Documenti esistenti: confronta polizze già caricate. Carica e confronta: carica due nuovi PDF." position="right" />
          <button
            onClick={() => setMode("existing")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "existing"
                ? "bg-primary-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {t("existingMode")}
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "upload"
                ? "bg-primary-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {t("uploadMode")}
          </button>
        </div>

        {mode === "existing" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="compare-doc1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Documento 1
              </label>
              <select
                id="compare-doc1"
                value={doc1Id}
                onChange={(e) => setDoc1Id(e.target.value)}
                className="input-field"
              >
                <option value="">Seleziona documento...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_filename}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="compare-doc2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Documento 2
              </label>
              <select
                id="compare-doc2"
                value={doc2Id}
                onChange={(e) => setDoc2Id(e.target.value)}
                className="input-field"
              >
                <option value="">Seleziona documento...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_filename}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Documento 1
              </label>
              <label className="flex items-center gap-2 input-field cursor-pointer">
                <Upload className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400 text-sm truncate">
                  {file1 ? file1.name : "Scegli PDF..."}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile1(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Documento 2
              </label>
              <label className="flex items-center gap-2 input-field cursor-pointer">
                <Upload className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400 text-sm truncate">
                  {file2 ? file2.name : "Scegli PDF..."}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setFile2(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
        )}

        <button
          onClick={handleCompare}
          disabled={comparing}
          className="btn-primary mt-4 flex items-center gap-2"
        >
          {comparing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitCompare className="h-4 w-4" />
          )}
          {comparing ? "Confronto in corso..." : "Confronta Polizze"}
        </button>
      </div>

      {/* Risultati */}
      {result && (
        <div className="space-y-6">
          {/* Sommario Esecutivo */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Sommario Esecutivo
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {result.executive_summary}
            </p>
          </div>

          {/* Tabella Comparativa */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Tabella Comparativa
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Categoria</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Documento 1</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Documento 2</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {result.comparison_table.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{row.category}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{row.document_1}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{row.document_2}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400 italic">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analisi Tecnica */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Analisi Tecnica
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {result.technical_analysis}
            </p>
          </div>

          {/* Conclusione */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Conclusione
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {result.conclusion}
            </p>
          </div>

          {/* Aree Incomplete */}
          {result.incomplete_areas.length > 0 && (
            <div className="card p-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
              <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Aree Incomplete
              </h2>
              <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                {result.incomplete_areas.map((area, i) => (
                  <li key={i}>&#8226; {area}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (!result) return;
                setExporting(true);
                try {
                  await api.exportComparisonPdf(result as unknown as Record<string, unknown>);
                  toast.success("PDF scaricato");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Download fallito");
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Scaricamento..." : "Scarica Confronto PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
