"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Document, QAResponse } from "@/types";
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
} from "lucide-react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<QAResponse | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await api.getDocuments() as { documents: Document[] };
      setDocuments(data.documents);
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted");
      return;
    }

    setUploading(true);
    try {
      await api.uploadDocument(file);
      toast.success("Document uploaded successfully. Processing...");
      fetchDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.original_filename}" permanently?`)) return;
    try {
      await api.deleteDocument(doc.id);
      toast.success("Document deleted");
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        setAnswer(null);
      }
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !question.trim()) return;

    setAsking(true);
    setAnswer(null);
    try {
      const result = await api.askQuestion(selectedDoc.id, question) as QAResponse;
      setAnswer(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setAsking(false);
    }
  };

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload and query insurance policy documents
          </p>
        </div>
        <label className="btn-primary cursor-pointer flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload PDF"}
          <input
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document List */}
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Your Documents</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No documents yet. Upload a PDF to get started.</p>
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                    selectedDoc?.id === doc.id
                      ? "bg-primary-50"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setAnswer(null);
                  }}
                >
                  <FileText className="h-8 w-8 text-primary-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.original_filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(doc.file_size)} &middot;{" "}
                      {doc.page_count ? `${doc.page_count} pages` : "Processing"}{" "}
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
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Q&A Panel */}
        <div className="card flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Document Q&A
            </h2>
          </div>

          {selectedDoc ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 bg-gray-50 text-sm">
                Querying: <strong>{selectedDoc.original_filename}</strong>
              </div>

              <form onSubmit={handleAsk} className="p-4 border-b border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about this document..."
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
                    Ask
                  </button>
                </div>
              </form>

              <div className="flex-1 overflow-y-auto p-4">
                {answer ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">
                        Answer
                      </h3>
                      <p className="text-sm text-gray-900">{answer.answer}</p>
                    </div>

                    {answer.referenced_sections.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">
                          Referenced Sections
                        </h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {answer.referenced_sections.map((s, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary-500 mt-0.5">&#8226;</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {answer.quoted_passages.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">
                          Quoted Passages
                        </h3>
                        {answer.quoted_passages.map((q, i) => (
                          <blockquote
                            key={i}
                            className="text-sm text-gray-600 border-l-2 border-primary-300 pl-3 my-2 italic"
                          >
                            {q}
                          </blockquote>
                        ))}
                      </div>
                    )}

                    {answer.exclusions_and_limits.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-1">
                          Exclusions & Limits
                        </h3>
                        <ul className="text-sm text-red-600 space-y-1">
                          {answer.exclusions_and_limits.map((e, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Confidence:</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          answer.confidence === "high"
                            ? "bg-green-100 text-green-700"
                            : answer.confidence === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {answer.confidence}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-12">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3" />
                    <p className="text-sm">Ask a question about the selected document</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-8">
              <div className="text-center">
                <FileText className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm">Select a document to start asking questions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
