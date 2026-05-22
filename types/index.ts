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
    title?: string;
    source?: string;
    status: 'lead' | 'active' | 'inactive' | 'prospect';
    tags?: string[];
    custom_fields?: Record<string, any>;
    notes?: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface ContactFormInput {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    source?: string;
    status: 'lead' | 'active' | 'inactive' | 'prospect';
  }
  
  // Opportunity related types
  export interface Opportunity {
    id: string;
    user_id: string;
    contact_id: string;
    pipeline_id?: string;
    title: string;
    value?: number;
    currency: string;
    stage: string;
    probability: number;
    expected_close_date?: string;
    owner_id?: string;
    notes?: string;
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
  }
  
  // Ticket related types
  export interface Ticket {
    id: string;
    user_id: string;
    contact_id: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'closed' | 'on_hold';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assigned_to?: string;
    category?: string;
    tags?: string[];
    resolution_notes?: string;
    created_at: string;
    resolved_at?: string;
    updated_at: string;
  }
  
  export interface TicketFormInput {
    contact_id: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'closed' | 'on_hold';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assigned_to?: string;
    category?: string;
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