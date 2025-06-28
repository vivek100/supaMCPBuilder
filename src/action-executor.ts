import { SupabaseClient } from '@supabase/supabase-js';
import { 
  ToolAction, 
  SelectAction, 
  InsertAction, 
  UpdateAction, 
  DeleteAction, 
  UpsertAction, 
  RPCAction, 
  EdgeFunctionAction,
  MCPToolResponse,
  MCPError,
  AdvancedFilter,
  OrCondition,
  OrderConfig,
  TextSearchConfig
} from './types.js';
import { TemplateResolver } from './template-resolver.js';

export class ActionExecutor {
  private authManager?: any; // Will be injected for re-authentication

  constructor(private supabase: SupabaseClient, authManager?: any) {
    this.authManager = authManager;
  }

  /**
   * Set auth manager for JWT refresh capability
   */
  setAuthManager(authManager: any): void {
    this.authManager = authManager;
  }

  /**
   * Execute a tool action with parameter substitution and JWT refresh handling
   */
  async executeAction(action: ToolAction, params: Record<string, any>): Promise<MCPToolResponse> {
    try {
      return await this.executeActionWithRetry(action, params);
    } catch (error) {
      console.error('❌ Action execution error:', error);
      // Format error as a proper Error object with detailed message
      const formattedError = this.formatError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Execute action with automatic JWT refresh retry
   */
  private async executeActionWithRetry(action: ToolAction, params: Record<string, any>, retryCount = 0): Promise<MCPToolResponse> {
    try {
      // Validate required parameters
      const validation = TemplateResolver.validateParams(action, params);
      if (!validation.valid) {
        throw new Error(`Missing required parameters: ${validation.missing.join(', ')}`);
      }

      // Resolve templates in the action
      const resolvedAction = TemplateResolver.resolveAction(action, params);

      // Execute the appropriate action
      switch (resolvedAction.type) {
        case 'select':
          return await this.executeSelect(resolvedAction);
        case 'insert':
          return await this.executeInsert(resolvedAction);
        case 'update':
          return await this.executeUpdate(resolvedAction);
        case 'delete':
          return await this.executeDelete(resolvedAction);
        case 'upsert':
          return await this.executeUpsert(resolvedAction);
        case 'rpc':
          return await this.executeRPC(resolvedAction);
        case 'edgeFunction':
          return await this.executeEdgeFunction(resolvedAction);
        default:
          throw new Error(`Unsupported action type: ${(action as any).type}`);
      }
    } catch (error) {
      // Check if this is a JWT expiration error and we haven't retried yet
      if (this.isJWTExpiredError(error) && retryCount === 0 && this.authManager) {
        console.log('🔄 JWT expired, attempting to refresh authentication...');
        
        try {
          // Attempt to refresh authentication
          const newClient = await this.authManager.refreshAuthentication();
          if (newClient) {
            this.supabase = newClient;
            console.log('✅ Authentication refreshed successfully, retrying action...');
            
            // Retry the action once with the new client
            return await this.executeActionWithRetry(action, params, retryCount + 1);
          }
        } catch (refreshError) {
          console.error('❌ Failed to refresh authentication:', refreshError);
          // Fall through to throw the original JWT error with helpful message
        }
        
        // If refresh failed, throw a helpful error
        throw new Error('JWT expired and automatic refresh failed. Please use the "refresh-auth" tool to re-authenticate.');
      }
      
      // For any other error or if retry already attempted, throw the original error
      throw error;
    }
  }

  /**
   * Check if an error is due to JWT expiration
   */
  private isJWTExpiredError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.supabaseError?.message || '';
    const errorCode = error.code || error.supabaseError?.code || '';
    
    return (
      errorMessage.includes('JWT expired') ||
      errorMessage.includes('jwt expired') ||
      errorMessage.includes('Invalid JWT') ||
      errorMessage.includes('token expired') ||
      errorCode === 'PGRST301' ||
      errorCode === 'invalid_jwt'
    );
  }

  /**
   * Execute SELECT operation with full Supabase JS support
   */
  private async executeSelect(action: SelectAction): Promise<MCPToolResponse> {
    let query = this.supabase
      .from(action.table)
      .select(action.columns?.join(',') || '*', {
        count: action.count || undefined,
        head: action.head || false
      });

    // Apply filters, ordering, and pagination BEFORE response modifiers
    query = this.applyFilters(query, action);
    query = this.applyOrdering(query, action);
    query = this.applyPagination(query, action);
    
    // Apply response modifiers LAST (these change the query type)
    let finalQuery: any = query;
    if (action.single) {
      finalQuery = query.single();
    } else if (action.maybeSingle) {
      finalQuery = query.maybeSingle();
    } else if (action.csv) {
      finalQuery = query.csv();
    }

    // Execute query
    const result = await finalQuery;

    if (result.error) {
      throw { 
        type: 'SUPABASE_ERROR',
        operation: 'SELECT',
        table: action.table,
        supabaseError: result.error,
        message: `Select failed: ${result.error.message}`
      };
    }

    return this.formatSuccessResponse(result.data, result.count);
  }

  /**
   * Apply all types of filters to a query
   */
  private applyFilters(query: any, action: SelectAction | UpdateAction | DeleteAction | RPCAction): any {
    // Type guard to check if action has filters property
    const hasFilters = 'filters' in action && action.filters;
    const hasAdvancedFilters = 'advancedFilters' in action && action.advancedFilters;
    const hasOrConditions = 'orConditions' in action && action.orConditions;
    const hasTextSearch = 'textSearch' in action && action.textSearch;

    // 1. Apply basic filters (all as .eq())
    if (hasFilters) {
      const cleanFilters = TemplateResolver.cleanFilters(action.filters!);
      for (const [column, value] of Object.entries(cleanFilters)) {
        query = query.eq(column, value);
      }
    }

    // 2. Apply advanced filters with specific operations
    if (hasAdvancedFilters) {
      for (const filter of action.advancedFilters!) {
        query = this.applyAdvancedFilter(query, filter);
      }
    }

    // 3. Apply OR conditions
    if (hasOrConditions) {
      for (const orCondition of action.orConditions!) {
        if (orCondition.referencedTable) {
          query = query.or(orCondition.conditions, { referencedTable: orCondition.referencedTable });
        } else {
          query = query.or(orCondition.conditions);
        }
      }
    }

    // 4. Apply text search (only for SelectAction)
    if (hasTextSearch && action.type === 'select') {
      query = this.applyTextSearch(query, (action as SelectAction).textSearch!);
    }

    return query;
  }

  /**
   * Apply a single advanced filter
   */
  private applyAdvancedFilter(query: any, filter: AdvancedFilter): any {
    const { column, operation, value, referencedTable } = filter;
    
    // Handle JSON column syntax (e.g., "address->postcode")
    const filterOptions = referencedTable ? { referencedTable } : undefined;

    switch (operation) {
      case 'eq':
        return query.eq(column, value, filterOptions);
      case 'neq':
        return query.neq(column, value, filterOptions);
      case 'gt':
        return query.gt(column, value, filterOptions);
      case 'gte':
        return query.gte(column, value, filterOptions);
      case 'lt':
        return query.lt(column, value, filterOptions);
      case 'lte':
        return query.lte(column, value, filterOptions);
      case 'like':
        return query.like(column, value, filterOptions);
      case 'ilike':
        return query.ilike(column, value, filterOptions);
      case 'is':
        return query.is(column, value, filterOptions);
      case 'in':
        return query.in(column, value, filterOptions);
      case 'contains':
        return query.contains(column, value, filterOptions);
      case 'containedBy':
        return query.containedBy(column, value, filterOptions);
      case 'rangeGt':
        return query.rangeGt(column, value, filterOptions);
      case 'rangeGte':
        return query.rangeGte(column, value, filterOptions);
      case 'rangeLt':
        return query.rangeLt(column, value, filterOptions);
      case 'rangeLte':
        return query.rangeLte(column, value, filterOptions);
      case 'rangeAdjacent':
        return query.rangeAdjacent(column, value, filterOptions);
      case 'overlaps':
        return query.overlaps(column, value, filterOptions);
      case 'match':
        return query.match(value, filterOptions); // match takes an object, not column
      default:
        console.warn(`Unsupported filter operation: ${operation}`);
        return query;
    }
  }

  /**
   * Apply text search
   */
  private applyTextSearch(query: any, textSearch: TextSearchConfig): any {
    const options: any = {};
    if (textSearch.type) options.type = textSearch.type;
    if (textSearch.config) options.config = textSearch.config;
    
    return query.textSearch(textSearch.column, textSearch.query, options);
  }

  /**
   * Apply ordering to query
   */
  private applyOrdering(query: any, action: SelectAction | RPCAction): any {
    // Type guard and safe property access
    const orderBy = 'orderBy' in action ? action.orderBy : undefined;
    const order = 'order' in action ? action.order : undefined;
    const orderConfigs = orderBy || order || [];
    
    for (const orderConfig of orderConfigs) {
      const ascending = orderConfig.ascending ?? (orderConfig.direction === 'asc' || orderConfig.direction === undefined);
      const options: any = { ascending };
      
      if (orderConfig.referencedTable) {
        options.referencedTable = orderConfig.referencedTable;
      }
      
      query = query.order(orderConfig.column, options);
    }
    
    return query;
  }

  /**
   * Apply pagination to query
   */
  private applyPagination(query: any, action: SelectAction | RPCAction): any {
    // Support explicit range (only for SelectAction)
    if ('range' in action && action.range) {
      return query.range(action.range.from, action.range.to);
    }
    
    // Support limit
    if (action.limit !== undefined) {
      const limitValue = typeof action.limit === 'string' ? parseInt(action.limit, 10) : action.limit;
      if (!isNaN(limitValue)) {
        query = query.limit(limitValue);
      }
    }
    
    // Support offset (convert to range, only for SelectAction)
    if ('offset' in action && action.offset !== undefined) {
      const offsetValue = typeof action.offset === 'string' ? parseInt(action.offset, 10) : action.offset;
      const limitValue = typeof action.limit === 'string' ? parseInt(action.limit, 10) : (action.limit || 1000);
      if (!isNaN(offsetValue) && !isNaN(limitValue)) {
        query = query.range(offsetValue, offsetValue + limitValue - 1);
      }
    }
    
    return query;
  }

  /**
   * Execute INSERT operation
   */
  private async executeInsert(action: InsertAction): Promise<MCPToolResponse> {
    // Handle special PostgreSQL functions in values
    const processedValues = await this.processSpecialValues(action.values);
    
    let query = this.supabase
      .from(action.table)
      .insert(processedValues);

    // Handle returning/select as final step
    let finalQuery: any = query;
    if (action.returning) {
      finalQuery = query.select(action.returning.join(','));
    } else if (action.select) {
      finalQuery = query.select(action.select);
    }

    const result = await finalQuery;

    if (result.error) {
      throw { 
        type: 'SUPABASE_ERROR',
        operation: 'INSERT',
        table: action.table,
        values: processedValues,
        supabaseError: result.error,
        message: `Insert failed: ${result.error.message}`
      };
    }

    return this.formatSuccessResponse(result.data);
  }

  /**
   * Execute UPDATE operation
   */
  private async executeUpdate(action: UpdateAction): Promise<MCPToolResponse> {
    // Handle special PostgreSQL functions in values
    const processedValues = await this.processSpecialValues(action.values);
    
    let query = this.supabase
      .from(action.table)
      .update(processedValues);

    // Apply filters FIRST
    query = this.applyFilters(query, action);

    // Handle returning/select as final step
    let finalQuery: any = query;
    if (action.returning) {
      finalQuery = query.select(action.returning.join(','));
    } else if (action.select) {
      finalQuery = query.select(action.select);
    }

    const result = await finalQuery;

    if (result.error) {
      throw { 
        type: 'SUPABASE_ERROR',
        operation: 'UPDATE',
        table: action.table,
        values: processedValues,
        filters: 'filters' in action ? action.filters : undefined,
        supabaseError: result.error,
        message: `Update failed: ${result.error.message}`
      };
    }

    return this.formatSuccessResponse(result.data);
  }

  /**
   * Execute DELETE operation
   */
  private async executeDelete(action: DeleteAction): Promise<MCPToolResponse> {
    let query = this.supabase
      .from(action.table)
      .delete();

    // Apply filters FIRST
    query = this.applyFilters(query, action);

    // Handle returning/select as final step
    let finalQuery: any = query;
    if (action.returning) {
      finalQuery = query.select(action.returning.join(','));
    } else if (action.select) {
      finalQuery = query.select(action.select);
    }

    const result = await finalQuery;

    if (result.error) {
      throw { 
        type: 'SUPABASE_ERROR',
        operation: 'DELETE',
        table: action.table,
        filters: 'filters' in action ? action.filters : undefined,
        supabaseError: result.error,
        message: `Delete failed: ${result.error.message}`
      };
    }

    return this.formatSuccessResponse(result.data);
  }

  /**
   * Execute UPSERT operation
   */
  private async executeUpsert(action: UpsertAction): Promise<MCPToolResponse> {
    // Handle special PostgreSQL functions in values
    const processedValues = await this.processSpecialValues(action.values);
    
    let query = this.supabase
      .from(action.table)
      .upsert(processedValues, action.onConflict ? { onConflict: action.onConflict } : undefined);

    // Handle returning/select as final step
    let finalQuery: any = query;
    if (action.returning) {
      finalQuery = query.select(action.returning.join(','));
    } else if (action.select) {
      finalQuery = query.select(action.select);
    }

    const result = await finalQuery;

    if (result.error) {
      throw { 
        type: 'SUPABASE_ERROR',
        operation: 'UPSERT',
        table: action.table,
        values: processedValues,
        supabaseError: result.error,
        message: `Upsert failed: ${result.error.message}`
      };
    }

    return this.formatSuccessResponse(result.data);
  }

  /**
   * Execute RPC operation with enhanced filtering support
   */
  private async executeRPC(action: RPCAction): Promise<MCPToolResponse> {
    let query = this.supabase.rpc(action.function, action.args);

    // Apply filters, ordering, and pagination BEFORE response modifiers
    query = this.applyFilters(query, action);
    query = this.applyOrdering(query, action);
    query = this.applyPagination(query, action);
    
    // Apply response modifiers LAST (these change the query type)
    let finalQuery: any = query;
    if (action.single) {
      finalQuery = query.single();
    } else if (action.maybeSingle) {
      finalQuery = query.maybeSingle();
    }

    const result = await finalQuery;

    if (result.error) {
      throw { 
        type: 'SUPABASE_ERROR',
        operation: 'RPC',
        function: action.function,
        args: action.args,
        supabaseError: result.error,
        message: `RPC failed: ${result.error.message}`
      };
    }

    return this.formatSuccessResponse(result.data);
  }

  /**
   * Execute Edge Function operation
   */
  private async executeEdgeFunction(action: EdgeFunctionAction): Promise<MCPToolResponse> {
    const options: any = {};
    
    if (action.body) options.body = action.body;
    if (action.headers) options.headers = action.headers;
    if (action.method) options.method = action.method;

    const result = await this.supabase.functions.invoke(action.function, options);

    if (result.error) {
      throw { 
        type: 'EDGE_FUNCTION_ERROR',
        operation: 'EDGE_FUNCTION',
        function: action.function,
        edgeFunctionError: result.error,
        message: `Edge function failed: ${result.error.message}`
      };
    }

    return this.formatSuccessResponse(result.data);
  }

  /**
   * Process special PostgreSQL values like auth.uid() and now()
   */
  private async processSpecialValues(values: any): Promise<any> {
    if (Array.isArray(values)) {
      return Promise.all(values.map(v => this.processSpecialValues(v)));
    }
    
    if (typeof values === 'object' && values !== null) {
      const processed: any = {};
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === 'string') {
          if (value === 'auth.uid()') {
            const { data: { user } } = await this.supabase.auth.getUser();
            processed[key] = user?.id || null;
          } else if (value === 'now()') {
            processed[key] = new Date().toISOString();
          } else {
            processed[key] = value;
          }
        } else {
          processed[key] = await this.processSpecialValues(value);
        }
      }
      return processed;
    }
    
    return values;
  }

  /**
   * Format successful response
   */
  private formatSuccessResponse(data: any, count?: number | null): MCPToolResponse {
    let responseText: string;
    
    if (count !== null && count !== undefined) {
      responseText = `Count: ${count}\n\nData:\n${JSON.stringify(data, null, 2)}`;
    } else {
      responseText = JSON.stringify(data, null, 2);
    }

    return {
      content: [{
        type: 'text',
        text: responseText
      }]
    };
  }

  /**
   * Format error response
   */
  private formatError(error: any): MCPError {
    if (error && typeof error === 'object' && error.type) {
      return {
        code: error.type,
        message: error.message || 'Unknown error occurred',
        details: error
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || String(error) || 'An unknown error occurred',
      details: error
    };
  }
} 