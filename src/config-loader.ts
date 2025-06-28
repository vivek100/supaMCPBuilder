import { readFile } from 'fs/promises';
import { z } from 'zod';
import { ToolConfig, ResourceConfig, SupaMCPConfig } from './types.js';
import { SupabaseClient } from '@supabase/supabase-js';

// Helper schemas for template variables
const TemplateStringSchema = z.string().regex(/^\{\{.+\}\}$/, 'Must be a template variable like {{variable}}');
const NumberOrTemplateSchema = z.union([z.number(), TemplateStringSchema]);
const StringOrTemplateSchema = z.union([z.string(), TemplateStringSchema]);

// Zod schemas for validation
const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('select'),
    table: z.string(),
    columns: z.array(z.string()).optional(),
    filters: z.record(z.any()).optional(),
    limit: NumberOrTemplateSchema.optional(),
    offset: NumberOrTemplateSchema.optional(),
    orderBy: z.array(z.object({
      column: z.string(),
      ascending: z.boolean().optional()
    })).optional(),
    order: z.array(z.object({
      column: z.string(),
      direction: z.enum(['asc', 'desc']).optional()
    })).optional(),
    single: z.boolean().optional(),
    count: z.enum(['exact', 'planned', 'estimated']).optional()
  }),
  z.object({
    type: z.literal('insert'),
    table: z.string(),
    values: z.union([z.record(z.any()), z.array(z.record(z.any()))]),
    onConflict: z.string().optional(),
    returning: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal('update'),
    table: z.string(),
    values: z.record(z.any()),
    filters: z.record(z.any()),
    returning: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal('delete'),
    table: z.string(),
    filters: z.record(z.any()),
    returning: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal('upsert'),
    table: z.string(),
    values: z.union([z.record(z.any()), z.array(z.record(z.any()))]),
    onConflict: z.string().optional(),
    returning: z.array(z.string()).optional()
  }),
  z.object({
    type: z.literal('rpc'),
    function: z.string(),
    args: z.record(z.any()).optional()
  }),
  z.object({
    type: z.literal('edgeFunction'),
    function: z.string(),
    body: z.record(z.any()).optional(),
    headers: z.record(z.string()).optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional()
  })
]);

const ParametersSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.object({
    type: z.string(),
    description: z.string().optional(),
    default: z.any().optional(),
    optional: z.boolean().optional(),
    enum: z.array(z.any()).optional()
  })),
  required: z.array(z.string()).optional()
});

const ToolConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: ParametersSchema,
  action: ActionSchema
});

const ResourceConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  uriTemplate: z.string(),
  action: ActionSchema,
  mimeType: z.string().optional()
});

const SupaMCPConfigSchema = z.object({
  tools: z.array(ToolConfigSchema).optional(),
  resources: z.array(ResourceConfigSchema).optional()
});

export class ConfigLoader {
  /**
   * Load configuration from a JSON file
   */
  static async loadFromFile(configPath: string): Promise<SupaMCPConfig> {
    try {
      console.log(`📁 Loading configuration from: ${configPath}`);
      
      const configData = await readFile(configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);
      
      // Validate the configuration
      const validatedConfig = SupaMCPConfigSchema.parse(parsedConfig);
      
      console.log(`✅ Configuration loaded successfully:`);
      console.log(`   - Tools: ${validatedConfig.tools?.length || 0}`);
      console.log(`   - Resources: ${validatedConfig.resources?.length || 0}`);
      
      return this.processConfig(validatedConfig);
    } catch (error) {
      console.error(`❌ Failed to load configuration from ${configPath}:`, error);
      throw new Error(`Configuration loading failed: ${(error as Error).message}`);
    }
  }

  /**
   * Load configuration from inline JSON string (full config)
   */
  static async loadFromInlineJson(configJson: string): Promise<SupaMCPConfig> {
    try {
      console.log(`📋 Loading inline JSON configuration...`);
      
      const parsedConfig = JSON.parse(configJson);
      const validatedConfig = SupaMCPConfigSchema.parse(parsedConfig);
      
      console.log(`✅ Inline configuration loaded successfully:`);
      console.log(`   - Tools: ${validatedConfig.tools?.length || 0}`);
      console.log(`   - Resources: ${validatedConfig.resources?.length || 0}`);
      
      return this.processConfig(validatedConfig);
    } catch (error) {
      console.error('❌ Failed to parse inline JSON configuration:', error);
      throw new Error(`Inline JSON configuration parsing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Load configuration from inline tools JSON string (tools only)
   */
  static async loadFromInlineToolsJson(toolsJson: string): Promise<SupaMCPConfig> {
    try {
      console.log(`📋 Loading inline tools JSON configuration...`);
      
      let toolsConfig;
      try {
        toolsConfig = JSON.parse(toolsJson);
      } catch (error) {
        throw new Error(`Invalid JSON format: ${(error as Error).message}`);
      }
      
      // Handle both array format and object format
      let tools;
      if (Array.isArray(toolsConfig)) {
        tools = toolsConfig;
      } else if (toolsConfig.tools && Array.isArray(toolsConfig.tools)) {
        tools = toolsConfig.tools;
      } else {
        throw new Error('Tools JSON must be an array of tools or an object with a "tools" property');
      }
      
      const config = { tools };
      
      try {
        const validatedConfig = SupaMCPConfigSchema.parse(config);
        console.log(`✅ Inline tools configuration loaded successfully:`);
        console.log(`   - Tools: ${validatedConfig.tools?.length || 0}`);
        
        return this.processConfig(validatedConfig);
      } catch (error) {
        throw new Error(`Configuration validation failed: ${(error as Error).message}`);
      }
    } catch (error) {
      console.error('❌ Failed to parse inline tools JSON:', error);
      throw new Error(`Inline tools JSON parsing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Load configuration from inline JSON (for CLI args) - DEPRECATED
   * Use loadFromInlineToolsJson instead
   */
  static async loadFromInlineConfig(toolsConfig: any[]): Promise<SupaMCPConfig> {
    try {
      console.log(`📋 Loading inline configuration with ${toolsConfig.length} tools`);
      
      const config = { tools: toolsConfig };
      const validatedConfig = SupaMCPConfigSchema.parse(config);
      
      return this.processConfig(validatedConfig);
    } catch (error) {
      console.error('❌ Failed to load inline configuration:', error);
      throw new Error(`Inline configuration loading failed: ${(error as Error).message}`);
    }
  }

  /**
   * Load configuration from the Supabase database (tool_configurations table)
   */
  static async loadFromDatabase(supabaseClient: SupabaseClient): Promise<SupaMCPConfig> {
    try {
      console.log('🗄️  Loading configuration from tool_configurations table in Supabase...');
      const { data, error } = await supabaseClient
        .from('tool_configurations')
        .select('config_json')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error || !data) {
        throw new Error('Failed to load config from database: ' + (error?.message || 'No config found'));
      }
      const validatedConfig = SupaMCPConfigSchema.parse(data.config_json);
      console.log(`✅ Configuration loaded from database: Tools: ${validatedConfig.tools?.length || 0}, Resources: ${validatedConfig.resources?.length || 0}`);
      return this.processConfig(validatedConfig);
    } catch (error) {
      console.error('❌ Failed to load configuration from database:', error);
      throw new Error(`Database configuration loading failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process and convert the validated configuration to internal format
   */
  private static processConfig(config: z.infer<typeof SupaMCPConfigSchema>): SupaMCPConfig {
    const processedConfig: SupaMCPConfig = {};

    // Process tools
    if (config.tools) {
      processedConfig.tools = config.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: this.convertParametersToZod(tool.parameters),
        action: tool.action
      }));
    }

    // Process resources
    if (config.resources) {
      processedConfig.resources = config.resources.map(resource => ({
        name: resource.name,
        description: resource.description,
        uriTemplate: resource.uriTemplate,
        action: resource.action,
        mimeType: resource.mimeType
      }));
    }

    return processedConfig;
  }

  /**
   * Convert JSON Schema parameters to Zod schema
   */
  private static convertParametersToZod(params: z.infer<typeof ParametersSchema>): z.ZodSchema<any> {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, prop] of Object.entries(params.properties)) {
      let zodType: z.ZodTypeAny;

      // Create base type
      switch (prop.type) {
        case 'string':
          zodType = z.string();
          if (prop.enum) {
            zodType = z.enum(prop.enum as [string, ...string[]]);
          }
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'integer':
          zodType = z.number().int();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'array':
          zodType = z.array(z.any());
          break;
        case 'object':
          zodType = z.record(z.any());
          break;
        default:
          zodType = z.any();
      }

      // Add default if specified
      if (prop.default !== undefined) {
        zodType = zodType.default(prop.default);
      }

      // Make optional if specified or not in required array
      const isRequired = params.required?.includes(key) ?? !prop.optional;
      if (!isRequired) {
        zodType = zodType.optional();
      }

      shape[key] = zodType;
    }

    return z.object(shape);
  }

  /**
   * Validate tool configuration at runtime
   */
  static validateToolConfig(config: any): config is ToolConfig {
    try {
      ToolConfigSchema.parse(config);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate resource configuration at runtime
   */
  static validateResourceConfig(config: any): config is ResourceConfig {
    try {
      ResourceConfigSchema.parse(config);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a sample configuration file
   */
  static createSampleConfig(): SupaMCPConfig {
    return {
      tools: [
        {
          name: 'get-users',
          description: 'Fetch users from the database',
          parameters: z.object({
            limit: z.number().default(10),
            email_filter: z.string().optional()
          }),
          action: {
            type: 'select',
            table: 'users',
            columns: ['id', 'email', 'created_at'],
            filters: {
              email: '{{email_filter}}'
            },
            limit: '{{limit}}' as any
          }
        },
        {
          name: 'create-post',
          description: 'Create a new blog post',
          parameters: z.object({
            title: z.string(),
            content: z.string(),
            author_id: z.string()
          }),
          action: {
            type: 'insert',
            table: 'posts',
            values: {
              title: '{{title}}',
              content: '{{content}}',
              author_id: '{{author_id}}',
              created_at: 'now()'
            },
            returning: ['id', 'title', 'created_at']
          }
        }
      ],
      resources: [
        {
          name: 'user-profile',
          description: 'Get user profile information',
          uriTemplate: 'users://{user_id}/profile',
          action: {
            type: 'select',
            table: 'users',
            columns: ['id', 'email', 'profile'],
            filters: {
              id: '{{user_id}}'
            },
            single: true
          }
        }
      ]
    };
  }
} 