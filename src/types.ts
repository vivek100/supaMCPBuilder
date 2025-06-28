import { z } from 'zod';

// Authentication Configuration - Only User Login
export interface AuthConfig {
  url: string;
  anonKey: string;
  email: string;
  password: string;
}

// Tool Action Types
export type ActionType = 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc' | 'edgeFunction';

// Base Action Interface
export interface BaseAction {
  type: ActionType;
}

// Supabase Filter Operations (complete set from JS library)
export type FilterOperation = 
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'is' | 'in' | 'contains'
  | 'containedBy' | 'rangeGt' | 'rangeGte' | 'rangeLt' | 'rangeLte'
  | 'rangeAdjacent' | 'overlaps' | 'textSearch' | 'match';

// Advanced Filter for complex queries
export interface AdvancedFilter {
  column: string;
  operation: FilterOperation;
  value: any;
  referencedTable?: string; // For filtering on referenced tables
}

// Text Search Configuration
export interface TextSearchConfig {
  column: string;
  query: string;
  type?: 'plain' | 'phrase' | 'websearch';
  config?: string; // Language config like 'english'
}

// OR Condition (supports Supabase's OR syntax)
export interface OrCondition {
  conditions: string; // Format: "id.eq.2,name.eq.Han"
  referencedTable?: string;
}

// Order Configuration (supporting both formats)
export interface OrderConfig {
  column: string;
  ascending?: boolean;
  direction?: 'asc' | 'desc';
  referencedTable?: string; // For ordering by referenced table columns
}

// Select Action with full Supabase JS support
export interface SelectAction extends BaseAction {
  type: 'select';
  table: string;
  columns?: string[]; // Supports embedded syntax like "instruments(name)"
  
  // Basic filters (simple key-value pairs, all treated as .eq())
  filters?: Record<string, any>;
  
  // Advanced filters with specific operations
  advancedFilters?: AdvancedFilter[];
  
  // OR conditions
  orConditions?: OrCondition[];
  
  // Text search
  textSearch?: TextSearchConfig;
  
  // Pagination
  limit?: number | string;
  offset?: number | string;
  range?: { from: number; to: number };
  
  // Ordering (supporting both legacy and new formats)
  orderBy?: OrderConfig[];
  order?: OrderConfig[]; // Legacy support
  
  // Response modifiers
  single?: boolean;
  maybeSingle?: boolean;
  csv?: boolean;
  count?: 'exact' | 'planned' | 'estimated';
  
  // Query options
  head?: boolean; // For count-only queries
}

// Insert Action
export interface InsertAction extends BaseAction {
  type: 'insert';
  table: string;
  values: Record<string, any> | Record<string, any>[];
  onConflict?: string;
  returning?: string[];
  select?: string; // Alternative to returning
}

// Update Action
export interface UpdateAction extends BaseAction {
  type: 'update';
  table: string;
  values: Record<string, any>;
  
  // Basic filters
  filters?: Record<string, any>;
  
  // Advanced filters
  advancedFilters?: AdvancedFilter[];
  
  // OR conditions
  orConditions?: OrCondition[];
  
  returning?: string[];
  select?: string; // Alternative to returning
}

// Delete Action
export interface DeleteAction extends BaseAction {
  type: 'delete';
  table: string;
  
  // Basic filters
  filters?: Record<string, any>;
  
  // Advanced filters
  advancedFilters?: AdvancedFilter[];
  
  // OR conditions
  orConditions?: OrCondition[];
  
  returning?: string[];
  select?: string; // Alternative to returning
}

// Upsert Action
export interface UpsertAction extends BaseAction {
  type: 'upsert';
  table: string;
  values: Record<string, any> | Record<string, any>[];
  onConflict?: string;
  returning?: string[];
  select?: string; // Alternative to returning
}

// RPC Action
export interface RPCAction extends BaseAction {
  type: 'rpc';
  function: string;
  args?: Record<string, any>;
  
  // RPC functions can also have filters applied if they return table data
  advancedFilters?: AdvancedFilter[];
  orConditions?: OrCondition[];
  orderBy?: OrderConfig[];
  limit?: number | string;
  single?: boolean;
  maybeSingle?: boolean;
}

// Edge Function Action
export interface EdgeFunctionAction extends BaseAction {
  type: 'edgeFunction';
  function: string;
  body?: Record<string, any>;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

// Union of all action types
export type ToolAction = 
  | SelectAction 
  | InsertAction 
  | UpdateAction 
  | DeleteAction 
  | UpsertAction 
  | RPCAction 
  | EdgeFunctionAction;

// Tool Configuration
export interface ToolConfig {
  name: string;
  description: string;
  parameters: z.ZodSchema<any>;
  action: ToolAction;
}

// Resource Configuration
export interface ResourceConfig {
  name: string;
  description: string;
  uriTemplate: string;
  action: ToolAction;
  mimeType?: string;
}

// Main Configuration
export interface SupaMCPConfig {
  tools?: ToolConfig[];
  resources?: ResourceConfig[];
}

// CLI Arguments
export interface CLIArgs {
  url: string;
  anonKey: string;
  email: string;
  password: string;
  configPath?: string;
  configJson?: string;
  toolsJson?: string;
  toolsJsonBase64?: string;
  port?: number;
  verbose?: boolean;
}

// MCP Response Format matching the SDK expectations
export interface MCPToolResponse {
  [x: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// Error Response
export interface MCPError {
  code: string;
  message: string;
  details?: any;
} 