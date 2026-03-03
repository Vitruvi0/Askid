"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import type { Document, ComparisonResponse } from "@/types";
import {
  GitCompare,
  Loader2,
  FileText,
  Upload,
  AlertTriangle,
} from "lucide-react";

export default function ComparePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [doc1Id, setDoc1Id] = useState("");
  const [doc2Id, setDoc2Id] = useState("");
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [mode, setMode] = useState<"existing" | "upload">("existing");
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await api.getDocuments() as { documents: Document[] };
      setDocuments(data.documents.filter((d) => d.status === "ready"));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCompare = async () => {
    setComparing(true);
    setResult(null);
    try {
      let data: ComparisonResponse;
      if (mode === "existing") {
        if (!doc1Id || !doc2Id) {
          toast.error("Select two documents");
          return;
        }
        data = (await api.compareDocuments(doc1Id, doc2Id)) as ComparisonResponse;
      } else {
        if (!file1 || !file2) {
          toast.error("Upload two PDF files");
          return;
        }
        data = (await api.compareUploadedDocuments(file1, file2)) as ComparisonResponse;
      }
      setResult(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setComparing(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Policy Comparison</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compare two insurance policies side by side
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="card p-4 mb-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setMode("existing")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "existing"
                ? "bg-primary-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Compare Existing Documents
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "upload"
                ? "bg-primary-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Upload & Compare
          </button>
        </div>

        {mode === "existing" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document 1
              </label>
              <select
                value={doc1Id}
                onChange={(e) => setDoc1Id(e.target.value)}
                className="input-field"
              >
                <option value="">Select document...</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_filename}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document 2
              </label>
              <select
                value={doc2Id}
                onChange={(e) => setDoc2Id(e.target.value)}
                className="input-field"
              >
                <option value="">Select document...</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document 1
              </label>
              <label className="flex items-center gap-2 input-field cursor-pointer">
                <Upload className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 text-sm truncate">
                  {file1 ? file1.name : "Choose PDF..."}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document 2
              </label>
              <label className="flex items-center gap-2 input-field cursor-pointer">
                <Upload className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 text-sm truncate">
                  {file2 ? file2.name : "Choose PDF..."}
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
          {comparing ? "Comparing..." : "Compare Policies"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Executive Summary
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {result.executive_summary}
            </p>
          </div>

          {/* Comparison Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Comparison Table
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-700">Category</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Document 1</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Document 2</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.comparison_table.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{row.category}</td>
                      <td className="p-3 text-gray-600">{row.document_1}</td>
                      <td className="p-3 text-gray-600">{row.document_2}</td>
                      <td className="p-3 text-gray-500 italic">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Technical Analysis */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Technical Analysis
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {result.technical_analysis}
            </p>
          </div>

          {/* Conclusion */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Conclusion
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {result.conclusion}
            </p>
          </div>

          {/* Incomplete Areas */}
          {result.incomplete_areas.length > 0 && (
            <div className="card p-6 border-yellow-200 bg-yellow-50">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Incomplete Areas
              </h2>
              <ul className="text-sm text-yellow-700 space-y-1">
                {result.incomplete_areas.map((area, i) => (
                  <li key={i}>&#8226; {area}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
