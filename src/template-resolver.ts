import { ToolAction } from './types.js';

export class TemplateResolver {
  /**
   * Resolve templates in a tool action by substituting {{param}} with actual values
   */
  static resolveAction<T extends ToolAction>(action: T, params: Record<string, any>): T {
    return this.deepResolveTemplates(action, params) as T;
  }

  /**
   * Recursively resolve templates in any object structure
   */
  private static deepResolveTemplates(obj: any, params: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.resolveStringTemplate(obj, params);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepResolveTemplates(item, params));
    }
    
    if (obj && typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.deepResolveTemplates(value, params);
      }
      return resolved;
    }
    
    return obj;
  }

  /**
   * Resolve template strings like "{{param}}" with actual values
   */
  private static resolveStringTemplate(template: string, params: Record<string, any>): any {
    // Handle exact template match (return the actual value, not string)
    const exactMatch = template.match(/^{{(\w+)}}$/);
    if (exactMatch) {
      const paramName = exactMatch[1];
      return params[paramName];
    }

    // Handle template within string (string substitution)
    return template.replace(/{{(\w+)}}/g, (match, paramName) => {
      const value = params[paramName];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Extract template variables from a string
   */
  static extractTemplateVariables(template: string): string[] {
    const matches = template.match(/{{(\w+)}}/g);
    if (!matches) return [];
    
    return matches.map(match => match.slice(2, -2));
  }

  /**
   * Extract all template variables from an action object
   */
  static extractActionVariables(action: ToolAction): string[] {
    const variables = new Set<string>();
    this.collectVariables(action, variables);
    return Array.from(variables);
  }

  /**
   * Recursively collect template variables from an object
   */
  private static collectVariables(obj: any, variables: Set<string>): void {
    if (typeof obj === 'string') {
      const vars = this.extractTemplateVariables(obj);
      vars.forEach(v => variables.add(v));
      return;
    }
    
    if (Array.isArray(obj)) {
      obj.forEach(item => this.collectVariables(item, variables));
      return;
    }
    
    if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => 
        this.collectVariables(value, variables)
      );
    }
  }

  /**
   * Validate that all required template variables are provided in params
   */
  static validateParams(action: ToolAction, params: Record<string, any>): { 
    valid: boolean; 
    missing: string[]; 
  } {
    const requiredVars = this.extractActionVariables(action);
    const missing = requiredVars.filter(varName => 
      params[varName] === undefined || params[varName] === null
    );
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Clean up undefined/null values from filters to prevent Supabase errors
   */
  static cleanFilters(filters: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }
} 