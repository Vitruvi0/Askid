"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Document, QAResponse, Conversation, Message } from "@/types";
import {
  Upload,
  FileText,
  Trash2,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  X,
  Plus,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import HelpIcon from "@/components/ui/HelpIcon";

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Conversation state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchDocuments = useCallback(async (filters?: { search?: string; status?: string; date_from?: string; date_to?: string }) => {
    try {
      const data = await api.getDocuments(0, 50, filters) as { documents: Document[] };
      setDocuments(data.documents);
    } catch (err) {
      toast.error("Impossibile caricare i documenti");
    } finally {
      setLoading(false);
    }
  }, []);

  const currentFilters = useCallback(() => {
    const filters: { search?: string; status?: string; date_from?: string; date_to?: string } = {};
    if (searchTerm) filters.search = searchTerm;
    if (statusFilter) filters.status = statusFilter;
    if (dateFrom) filters.date_from = new Date(dateFrom).toISOString();
    if (dateTo) filters.date_to = new Date(dateTo + "T23:59:59").toISOString();
    return filters;
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchDocuments(currentFilters());
  }, [statusFilter, dateFrom, dateTo, fetchDocuments, currentFilters]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchDocuments(currentFilters());
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm, fetchDocuments, currentFilters]);

  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === "uploading" || d.status === "processing"
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => fetchDocuments(currentFilters()), 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments, currentFilters]);

  // Fetch conversations for selected doc
  useEffect(() => {
    if (!selectedDoc) {
      setConversations([]);
      return;
    }
    (async () => {
      try {
        const data = await api.getConversations("document_qa") as { conversations: Conversation[] };
        // Filter to conversations that include this document
        setConversations(
          data.conversations.filter((c) => c.document_ids?.includes(selectedDoc.id))
        );
      } catch {
        // ignore
      }
    })();
  }, [selectedDoc]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Sono accettati solo file PDF");
      return;
    }

    setUploading(true);
    try {
      await api.uploadDocument(file);
      toast.success("Documento caricato con successo. Elaborazione in corso...");
      fetchDocuments(currentFilters());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Caricamento fallito");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Eliminare "${doc.original_filename}" definitivamente?`)) return;
    try {
      await api.deleteDocument(doc.id);
      toast.success("Documento eliminato");
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        startNewConversation();
      }
    } catch (err) {
      toast.error("Impossibile eliminare il documento");
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  const loadConversation = async (convId: string) => {
    try {
      const detail = await api.getConversation(convId) as { messages: Message[]; id: string };
      setConversationId(detail.id);
      setMessages(detail.messages);
      setShowHistory(false);
    } catch {
      toast.error("Impossibile caricare la conversazione");
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !question.trim()) return;

    const userQuestion = question;
    setAsking(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || "",
      role: "user",
      content: userQuestion,
      metadata_json: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setQuestion("");

    try {
      const result = await api.askQuestion(selectedDoc.id, userQuestion, conversationId || undefined) as QAResponse;

      if (result.conversation_id && !conversationId) {
        setConversationId(result.conversation_id);
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: `resp-${Date.now()}`,
        conversation_id: result.conversation_id || conversationId || "",
        role: "assistant",
        content: result.answer,
        metadata_json: result as unknown as Record<string, unknown>,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossibile ottenere una risposta");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setQuestion(userQuestion);
    } finally {
      setAsking(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchTerm || statusFilter || dateFrom || dateTo;

  const statusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const renderQADetails = (metadata: Record<string, unknown>) => {
    const qa = metadata as unknown as QAResponse;
    return (
      <div className="mt-2 space-y-2">
        {qa.referenced_sections && qa.referenced_sections.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sezioni di Riferimento</p>
            <ul className="text-xs text-gray-600 dark:text-gray-400">
              {qa.referenced_sections.map((s, i) => (
                <li key={i}>&#8226; {s}</li>
              ))}
            </ul>
          </div>
        )}
        {qa.quoted_passages && qa.quoted_passages.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Passaggi Citati</p>
            {qa.quoted_passages.map((q, i) => (
              <blockquote key={i} className="text-xs text-gray-600 dark:text-gray-400 border-l-2 border-primary-300 pl-2 my-1 italic">
                {q}
              </blockquote>
            ))}
          </div>
        )}
        {qa.exclusions_and_limits && qa.exclusions_and_limits.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Esclusioni e Limiti</p>
            <ul className="text-xs text-red-600 dark:text-red-400">
              {qa.exclusions_and_limits.map((e, i) => (
                <li key={i} className="flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}
        {qa.confidence && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Affidabilità:</span>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
              qa.confidence === "high"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : qa.confidence === "medium"
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {qa.confidence === "high" ? "Alta" : qa.confidence === "medium" ? "Media" : "Bassa"}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpIcon text="Carica un file PDF di una polizza assicurativa per analizzarlo con l'IA." position="left" />
          <label className="btn-primary cursor-pointer flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {uploading ? t("uploading") : t("uploadPdf")}
          <input
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          </label>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cerca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca documento..."
                className="input-field pl-9"
              />
            </div>
          </div>
          <div className="w-44">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stato</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">Tutti gli stati</option>
              <option value="ready">Pronto</option>
              <option value="processing">In elaborazione</option>
              <option value="uploading">Caricamento</option>
              <option value="error">Errore</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Da</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">A</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
              Cancella filtri
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista Documenti */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t("yourDocuments")}</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>{hasActiveFilters ? "Nessun documento trovato con i filtri selezionati." : "Nessun documento. Carica un PDF per iniziare."}</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                    selectedDoc?.id === doc.id
                      ? "bg-primary-50 dark:bg-primary-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => {
                    setSelectedDoc(doc);
                    startNewConversation();
                  }}
                >
                  <FileText className="h-8 w-8 text-primary-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.original_filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(doc.file_size)} &middot;{" "}
                      {doc.page_count ? `${doc.page_count} pagine` : "In elaborazione"}{" "}
                      &middot; {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon(doc.status)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                      aria-label={`Elimina ${doc.original_filename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pannello Chat */}
        <div className="card flex flex-col" style={{ maxHeight: "700px" }}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Domande sul Documento
            </h2>
            {selectedDoc && (
              <div className="flex items-center gap-2">
                {conversations.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <History className="h-3.5 w-3.5" />
                    Cronologia
                    {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
                <button
                  onClick={startNewConversation}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nuova conversazione
                </button>
              </div>
            )}
          </div>

          {/* Conversation History Dropdown */}
          {showHistory && conversations.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                    conversationId === conv.id ? "bg-primary-50 dark:bg-primary-900/30" : ""
                  }`}
                >
                  <p className="text-gray-900 dark:text-gray-100 truncate font-medium">{conv.title || "Senza titolo"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(conv.created_at)}</p>
                </button>
              ))}
            </div>
          )}

          {selectedDoc ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 shrink-0">
                Interrogazione: <strong>{selectedDoc.original_filename}</strong>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 dark:text-gray-500 py-12">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3" />
                    <p className="text-sm">Fai una domanda sul documento selezionato</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === "assistant" && msg.metadata_json && renderQADetails(msg.metadata_json)}
                      </div>
                    </div>
                  ))
                )}
                {asking && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleAsk} className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Fai una domanda su questo documento..."
                    className="input-field flex-1"
                    disabled={asking || selectedDoc.status !== "ready"}
                  />
                  <button
                    type="submit"
                    disabled={asking || !question.trim() || selectedDoc.status !== "ready"}
                    className="btn-primary flex items-center gap-2"
                  >
                    {asking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Chiedi
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 p-8">
              <div className="text-center">
                <FileText className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm">Seleziona un documento per iniziare a fare domande</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
