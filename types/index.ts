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
    notes?: string;
    preferred_language?: string;
    website?: string;
    date_of_birth?: string;
    preferred_contact_method?: string;
    signals?: string;
    platform?: string;
    friction_area?: string;
    communication_channels?: string;
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    timezone?: string;
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
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    timezone?: string;
    tags?: string;
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
    completed_at?: string;
    created_at: string;
    updated_at: string;
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
    company_id?: string;
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

  export interface OpportunityWithContact extends Opportunity {
    contact?: OpportunityContact | null;
  }
  
  // Ticket (Case) types
  export interface Ticket {
    id: string;
    user_id: string;
    contact_id?: string | null;
    company_id?: string | null;
    title: string;
    subject?: string;
    description?: string;
    status: "open" | "in_progress" | "closed" | "on_hold";
    priority: "low" | "medium" | "high" | "urgent";
    assigned_to?: string;
    category?: string;
    tags?: string[];
    resolution_notes?: string;
    ticket_number?: string;
    created_at: string;
    resolved_at?: string;
    updated_at: string;
    contact?: { id: string; first_name: string; last_name: string } | null;
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
  }

  export interface CrmDocument {
    id: string;
    user_id: string;
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    type: "contract" | "estimate" | "proposal" | "attachment";
    title: string;
    content?: string;
    file_url?: string;
    file_name?: string;
    mime_type?: string;
    file_size_bytes?: number;
    storage_path?: string | null;
    status: "draft" | "sent" | "signed" | "accepted" | "rejected";
    valid_until?: string;
    signed_at?: string;
    created_at: string;
    updated_at: string;
  }

  export interface DocumentFormInput {
    contact_id?: string;
    company_id?: string;
    opportunity_id?: string;
    type?: "contract" | "estimate" | "proposal" | "attachment";
    title: string;
    content?: string;
    status?: "draft" | "sent" | "signed" | "accepted" | "rejected";
  }

  export interface CalendarEvent {
    id: string;
    user_id: string;
    contact_id?: string | null;
    company_id?: string | null;
    opportunity_id?: string | null;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    google_event_id?: string;
    is_synced?: boolean;
    created_at: string;
    updated_at: string;
  }

  export interface CalendarEventFormInput {
    contact_id?: string;
    company_id?: string;
    opportunity_id?: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
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