export type UserRole = "super_admin" | "agency_admin" | "agency_user";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  agency_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface Agency {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  max_users: number;
  max_documents: number;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus = "uploading" | "processing" | "ready" | "error";

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  page_count: number | null;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
}

export interface SourceChunk {
  content: string;
  page_number: number | null;
  section_title: string | null;
  relevance_score: number;
}

export interface QAResponse {
  answer: string;
  referenced_sections: string[];
  quoted_passages: string[];
  exclusions_and_limits: string[];
  sources: SourceChunk[];
  confidence: string;
  conversation_id?: string;
}

export type ConversationType = "document_qa" | "comparison" | "calculator";

export interface Conversation {
  id: string;
  conversation_type: ConversationType;
  title: string | null;
  document_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface ComparisonCategory {
  category: string;
  document_1: string;
  document_2: string;
  notes: string;
}

export interface ComparisonResponse {
  executive_summary: string;
  comparison_table: ComparisonCategory[];
  technical_analysis: string;
  conclusion: string;
  incomplete_areas: string[];
}

export interface PensionGapResult {
  projected_annual_pension: number;
  desired_annual_income: number;
  annual_gap: number;
  total_capital_needed_minimum: number;
  total_capital_needed_recommended: number;
  total_capital_needed_prudential: number;
  years_to_retirement: number;
  monthly_savings_needed: number;
  formulas_used: string[];
  assumptions: string[];
}

export interface TCMResult {
  income_replacement_needed: number;
  debt_coverage: number;
  education_fund: number;
  total_capital_minimum: number;
  total_capital_recommended: number;
  total_capital_prudential: number;
  existing_coverage_gap: number;
  formulas_used: string[];
  assumptions: string[];
}

export interface LifeCapitalResult {
  income_replacement_capital: number;
  debt_clearance: number;
  emergency_fund: number;
  total_capital_minimum: number;
  total_capital_recommended: number;
  total_capital_prudential: number;
  coverage_gap: number;
  formulas_used: string[];
  assumptions: string[];
}

export interface ReportResponse {
  technical_report: string;
  client_report: string;
  email_text: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  agency_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_documents: number;
  total_queries: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
