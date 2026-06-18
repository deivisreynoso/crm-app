// User related types
export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
    created_at: string;
  }
  
  // Contact related types
  export interface Contact {
    customer_id?: string | null;
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    company?: string;
    company_id?: string;
    title?: string;
    source?: string;
    status: 'lead' | 'active' | 'inactive' | 'prospect';
    tags?: string[];
    custom_fields?: Record<string, any>;
    review_request_opt_out?: boolean;
    notes?: string;
    preferred_language?: string;
    website?: string;
    date_of_birth?: string;
    preferred_contact_method?: string;
    signals?: string;
    platform?: string;
    friction_area?: string;
    communication_channels?: string;
    ai_summary?: string;
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    timezone?: string;
    review_requested_at?: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface ContactFormInput {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    company?: string;
    company_id?: string;
    title?: string;
    source?: string;
    status: 'lead' | 'active' | 'inactive' | 'prospect';
    notes?: string;
    preferred_language?: string;
    website?: string;
    date_of_birth?: string;
    preferred_contact_method?: string;
    signals?: string;
    platform?: string;
    friction_area?: string;
    communication_channels?: string;
    ai_summary?: string;
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    timezone?: string;
    tags?: string;
    custom_fields?: Record<string, unknown>;
    review_request_opt_out?: boolean;
  }

  export type ActivityType = 'call' | 'email' | 'meeting' | 'note';

  export interface Note {
    id: string;
    user_id: string;
    entity_type: 'contact' | 'opportunity' | 'ticket';
    entity_id: string;
    content: string;
    activity_type: ActivityType;
    attachments?: unknown[];
    created_at: string;
    updated_at: string;
  }

  export interface Task {
    id: string;
    user_id: string;
    contact_id?: string;
    opportunity_id?: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    due_at?: string;
    assigned_to?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
  }

  export interface ActivityFeedItem {
    id: string;
    source: 'note' | 'activity' | 'calendar';
    /** Raw note/activity/calendar row id when applicable */
    source_id?: string;
    type: string;
    content: string;
    created_at: string;
    is_system: boolean;
    author_name?: string;
    email_subject?: string;
    email_body?: string;
    email_direction?: 'outbound' | 'inbound';
  }
  
  // Opportunity related types
  export interface Opportunity {
    id: string;
    user_id: string;
    contact_id: string;
    company_id?: string;
    pipeline_id?: string;
    title: string;
    value?: number;
    currency: string;
    stage: string;
    probability: number;
    expected_close_date?: string;
    owner_id?: string;
    notes?: string;
    tags?: string[];
    custom_fields?: Record<string, any>;
    project_stage?: string | null;
    project_stage_updated_at?: string | null;
    project_completed_at?: string | null;
    project_feedback_token?: string | null;
    feedback_score?: number | null;
    feedback_notes?: Record<string, unknown> | null;
    feedback_received_at?: string | null;
    loss_reason?: string | null;
    loss_reason_notes?: string | null;
    created_at: string;
    updated_at: string;
  }
  
  export interface OpportunityFormInput {
    contact_id: string;
    pipeline_id?: string;
    title: string;
    value?: number;
    currency: string;
    stage: string;
    probability: number;
    expected_close_date?: string;
    notes?: string;
    tags?: string;
    owner_id?: string;
    company_id?: string;
    loss_reason?: string;
    loss_reason_notes?: string;
    custom_fields?: Record<string, unknown>;
  }

  export interface Company {
    id: string;
    user_id: string;
    name: string;
    website?: string;
    phone?: string;
  industry?: string;
  company_size?: string;
  revenue?: string;
  account_summary?: string;
  tags?: string[];
    created_at: string;
    updated_at: string;
  }

  export interface PipelineStage {
    id: string;
    name: string;
    order: number;
  }

  export interface Pipeline {
    id: string;
    user_id: string;
    name: string;
    stages: PipelineStage[];
    created_at: string;
    updated_at: string;
  }

  export interface OpportunityContact {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    company?: string;
    company_id?: string;
  }

  export interface ContactRelatedCounts {
    quotes: number;
    appointments: number;
    tasks: number;
  }

  export interface OpportunityWithContact extends Opportunity {
    contact?: OpportunityContact | null;
    contact_counts?: ContactRelatedCounts;
  }
  
  // Ticket (Case) types
  export interface Ticket {
    id: string;
    user_id: string;
    contact_id?: string | null;
    company_id?: string | null;
    source?: "internal" | "website_widget";
    title: string;
    subject?: string;
    description?: string;
    status: "open" | "in_progress" | "closed" | "on_hold";
    priority: "low" | "medium" | "high" | "urgent";
    assigned_to?: string;
    category?: string;
    tags?: string[];
    custom_fields?: Record<string, unknown>;
    resolution_notes?: string;
    ticket_number?: string;
    created_at: string;
    resolved_at?: string;
    updated_at: string;
    contact?: {
      id: string;
      first_name: string;
      last_name: string;
      email?: string | null;
      review_request_opt_out?: boolean;
      review_requested_at?: string | null;
    } | null;
    company?: { id: string; name: string } | null;
  }

  export interface TicketFormInput {
    contact_id?: string;
    company_id?: string;
    subject: string;
    title?: string;
    description?: string;
    status?: "open" | "in_progress" | "closed" | "on_hold";
    priority?: "low" | "medium" | "high" | "urgent";
    assigned_to?: string;
    category?: string;
    tags?: string;
    custom_fields?: Record<string, unknown>;
  }

  export interface QuoteService {
    id: string;
    user_id: string;
    name: string;
    description?: string | null;
    unit_price: number;
    currency: string;
    active: boolean;
    created_at: string;
    updated_at: string;
  }

  export interface QuoteLineItem {
    id: string;
    document_id: string;
    user_id: string;
    service_id?: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    sort_order: number;
    created_at: string;
  }

  export interface CrmDocument {
    id: string;
    user_id: string;
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    type: "contract" | "estimate" | "proposal" | "attachment";
    title: string;
    quote_reference?: string | null;
    accept_token?: string | null;
    sent_at?: string | null;
    accepted_at?: string | null;
    rejected_at?: string | null;
    response_name?: string | null;
    response_email?: string | null;
    content?: string;
    file_url?: string;
    file_name?: string;
    mime_type?: string;
    file_size_bytes?: number;
    storage_path?: string | null;
    loss_reason?: string | null;
    loss_reason_notes?: string | null;
    status: "draft" | "sent" | "signed" | "accepted" | "rejected";
    valid_until?: string;
    signed_at?: string;
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    total_amount?: number;
    header_html?: string | null;
    footer_html?: string | null;
    line_items?: QuoteLineItem[];
    quote_payment?: QuotePaymentSummary | null;
    payment_status?: "unpaid" | "partially_paid" | "paid";
    amount_paid?: number;
    created_at: string;
    updated_at: string;
  }

  export interface QuotePaymentSummary {
    id: string;
    amount: number;
    currency?: string | null;
    status: string;
    stripe_payment_id?: string | null;
    stripe_invoice_id?: string | null;
    receipt_url?: string | null;
    created_at: string;
  }

  export interface DocumentFormInput {
    contact_id?: string;
    company_id?: string;
    opportunity_id?: string;
    type?: "contract" | "estimate" | "proposal" | "attachment";
    title: string;
    content?: string;
    status?: "draft" | "sent" | "signed" | "accepted" | "rejected";
    valid_until?: string;
  }

  export interface DocumentTemplate {
    id: string;
    user_id: string;
    name: string;
    type?: "contract" | "estimate" | "proposal" | "attachment" | null;
    content?: string | null;
    created_at: string;
    updated_at: string;
  }

  export interface CustomFieldDefinition {
    id: string;
    user_id: string;
    entity_type: "contact" | "opportunity" | "ticket";
    field_name: string;
    field_type:
      | "text"
      | "number"
      | "date"
      | "select"
      | "multiselect"
      | "checkbox"
      | "currency";
    is_required: boolean;
    options?: string[] | null;
    validation?: Record<string, unknown> | null;
    display_order: number;
    folder_name?: string | null;
    placeholder?: string | null;
    description?: string | null;
    created_at: string;
  }

  export interface AppNotification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message?: string | null;
    related_entity_type?: string | null;
    related_entity_id?: string | null;
    is_read: boolean;
    created_at: string;
  }

  export interface PipelineAnalytics {
    totalValue: number;
    opportunityCount: number;
    wonCount: number;
    lostCount: number;
    openCount: number;
    conversionRate: number;
    averageDealSize: number;
    byStage: Array<{ stageId: string; stageName: string; count: number; value: number }>;
    funnel: Array<{ stageName: string; count: number }>;
    revenueByMonth: Array<{ month: string; value: number }>;
  }

  export interface CalendarEvent {
    id: string;
    user_id: string;
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    assigned_to?: string | null;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    location_type?: "physical" | "google_meet" | "other" | null;
    event_kind?: "meeting" | "appointment" | "customer_meeting";
    google_event_id?: string;
    google_sync_user_id?: string | null;
    is_synced?: boolean;
    owner_name?: string | null;
    owner_color?: string | null;
    attendees?: CalendarEventAttendee[];
    created_at: string;
    updated_at: string;
  }

  export interface CalendarEventFormInput {
    contact_id?: string;
    company_id?: string;
    opportunity_id?: string;
    assigned_to?: string;
    additional_users?: string[];
    additional_contacts?: string[];
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    location_type?: "physical" | "google_meet" | "other";
  }

  export type CalendarEventAttendee = {
    id: string;
    attendee_type: "user" | "contact";
    user_id?: string | null;
    contact_id?: string | null;
    display_name?: string | null;
    email?: string | null;
  };

  export interface OperationsMetrics {
    leads: number;
    prospects: number;
    activeContacts: number;
    totalContacts: number;
    openTickets: number;
    ticketsInProgress: number;
    ticketsClosedInRange: number;
    urgentTickets: number;
    upcomingAppointments: number;
    appointmentsInRange: number;
    ticketsByStatus: Array<{ status: string; count: number }>;
    ticketsByPriority: Array<{ priority: string; count: number }>;
  }

  export interface CompanyRelated {
    contacts: Contact[];
    opportunities: Array<{
      id: string;
      title: string;
      stage: string;
      value?: number;
      currency: string;
      contact_id: string;
      contact_name?: string | null;
      created_at: string;
    }>;
    tickets: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      contact_id?: string | null;
      contact_name?: string | null;
      created_at: string;
    }>;
    documents: Array<{
      id: string;
      title: string;
      type: string;
      status: string;
      file_name?: string;
      file_url?: string;
      contact_id?: string | null;
      contact_name?: string | null;
      created_at: string;
    }>;
    calendar_events: Array<{
      id: string;
      title: string;
      start_time: string;
      end_time: string;
      contact_id?: string | null;
      contact_name?: string | null;
      location?: string;
    }>;
  }

  export type FinanceCurrency = "USD" | "MXN";

  export type FinanceTransactionType = "income" | "expense" | "refund" | "adjustment";
  export type FinanceTransactionStatus = "pending" | "completed" | "failed" | "voided";
  export type FinanceTransactionSource =
    | "manual"
    | "stripe_payment_link"
    | "stripe_checkout"
    | "invoice"
    | "import";

  export interface FinanceCategory {
    id: string;
    user_id: string;
    kind: "income" | "expense";
    slug: string;
    label: string;
    is_system: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }

  export interface FinanceTransaction {
    id: string;
    user_id: string;
    type: FinanceTransactionType;
    category_id?: string | null;
    amount: number;
    currency: FinanceCurrency;
    status: FinanceTransactionStatus;
    source: FinanceTransactionSource;
    direction: "inbound" | "outbound";
    quote_id?: string | null;
    contact_id?: string | null;
    invoice_id?: string | null;
    payment_link_id?: string | null;
    description?: string | null;
    notes?: string | null;
    payment_method?: string | null;
    vendor_name?: string | null;
    transaction_date: string;
    recorded_by?: string | null;
    recurrence_rule?: Record<string, unknown> | null;
    recurrence_parent_id?: string | null;
    is_recurring_parent?: boolean;
    voided_at?: string | null;
    void_reason?: string | null;
    created_at: string;
    updated_at: string;
    category?: Pick<FinanceCategory, "id" | "label" | "kind" | "slug"> | null;
    contact?: { id: string; first_name: string; last_name: string } | null;
    quote?: { id: string; title: string; quote_reference?: string | null } | null;
    invoice?: {
      id: string;
      invoice_number: string;
      quote_id?: string | null;
      quote?: { id: string; title: string; quote_reference?: string | null } | null;
    } | null;
  }

  export type InvoiceStatus =
    | "draft"
    | "pending"
    | "partially_paid"
    | "sent"
    | "viewed"
    | "paid"
    | "overdue"
    | "voided";

  export type InvoiceType =
    | "quote"
    | "services"
    | "retainer"
    | "deposit"
    | "change_order"
    | "milestone";

  export type InvoiceCollectionMethod = "manual" | "payment_link";

  export interface InvoiceLineItem {
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }

  export interface Invoice {
    id: string;
    user_id: string;
    invoice_number: string;
    quote_id?: string | null;
    contact_id: string;
    invoice_type?: InvoiceType;
    collection_method?: InvoiceCollectionMethod | null;
    status: InvoiceStatus;
    line_items: InvoiceLineItem[];
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount_amount: number;
    total: number;
    currency: FinanceCurrency;
    due_date?: string | null;
    sent_at?: string | null;
    paid_at?: string | null;
    notes?: string | null;
    footer_text?: string | null;
    pdf_storage_path?: string | null;
    created_at: string;
    updated_at: string;
    contact?: { id: string; first_name: string; last_name: string; email?: string | null } | null;
    quote?: { id: string; title: string; quote_reference?: string | null } | null;
  }

  export type PaymentLinkStatus = "active" | "paid" | "deactivated" | "expired";

  export interface PaymentLink {
    id: string;
    user_id: string;
    invoice_id: string;
    contact_id?: string | null;
    url: string;
    amount: number;
    currency: FinanceCurrency;
    status: PaymentLinkStatus;
    paid_at?: string | null;
    created_at: string;
    updated_at: string;
    contact?: { id: string; first_name: string; last_name: string } | null;
    invoice?: {
      id: string;
      invoice_number: string;
      total?: number;
      quote_id?: string | null;
      quote?: { id: string; title: string; quote_reference?: string | null } | null;
    } | null;
  }

  export interface FinanceOverview {
    total_revenue: number;
    total_expenses: number | null;
    net_profit: number | null;
    outstanding_invoices_total: number;
    pending_payment_links_total: number;
    revenue_by_month: Array<{ month: string; revenue: number; expenses: number | null }>;
    income_by_category: Array<{ category_label: string; total: number }>;
    expenses_by_category: Array<{ category_label: string; total: number }> | null;
    period?: string;
    from?: string;
    to?: string;
  }

  export interface FinanceSettings {
    default_currency?: FinanceCurrency;
    finance_default_tax_rate?: number;
    invoice_number_prefix?: string;
    invoice_number_start?: number;
    invoice_default_due_days?: number;
    invoice_default_footer_text?: string | null;
    stripe_configured?: boolean;
    invoice_number_locked?: boolean;
  }

  // API Response types
  export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  }
  
  export interface ApiError {
    error: string;
    status: number;
    details?: any;
  }