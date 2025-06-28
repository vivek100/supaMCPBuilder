import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AuthConfig, SupaMCPConfig, CLIArgs } from './types.js';
import { AuthManager } from './auth.js';
import { ActionExecutor } from './action-executor.js';
import { ConfigLoader } from './config-loader.js';
import { TemplateResolver } from './template-resolver.js';
import { z } from 'zod';

export class SupaMCPServer {
  private mcpServer: McpServer;
  private authManager: AuthManager;
  private actionExecutor?: ActionExecutor;
  private config?: SupaMCPConfig;

  constructor(private authConfig: AuthConfig) {
    this.mcpServer = new McpServer({
      name: 'supabase-mcp-server',
      version: '1.0.0'
    });

    this.authManager = new AuthManager(authConfig);
  }

  /**
   * Initialize the server with authentication and configuration
   */
  async initialize(config?: SupaMCPConfig, configPath?: string, supabaseClientOverride?: any): Promise<void> {
    try {
      console.log('🚀 Initializing SupaMCP Server...');

      // 1. Authenticate with Supabase
      const supabaseClient = await this.authManager.authenticate();
      this.actionExecutor = new ActionExecutor(supabaseClient, this.authManager);

      // 2. Load configuration
      if (config) {
        this.config = config;
      } else if (configPath) {
        this.config = await ConfigLoader.loadFromFile(configPath);
      } else {
        // Load from database if nothing else provided
        this.config = await ConfigLoader.loadFromDatabase(supabaseClient);
      }

      // 3. Register default system tools first
      await this.registerDefaultTools();

      // 4. Register MCP tools and resources from configuration
      await this.registerMCPTools();
      await this.registerMCPResources();

      console.log('✅ SupaMCP Server initialized successfully');
    } catch (error) {
      console.error('❌ Server initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register default system tools for authentication management
   */
  private async registerDefaultTools(): Promise<void> {
    console.log('🔧 Registering default system tools...');

    // Create Zod schemas for the default tools
    const refreshAuthSchema = z.object({
      force: z.boolean().optional().default(false).describe('Force complete re-authentication instead of token refresh')
    });

    const authStatusSchema = z.object({});

    // Register refresh-auth tool
    await this.mcpServer.registerTool(
      'refresh-auth',
      {
        title: 'Refresh Authentication',
        description: 'Manually refresh authentication when JWT expires. Use this when you get JWT expired errors.',
        inputSchema: refreshAuthSchema.shape
      },
      async (params: any) => {
        try {
          console.log('🔄 Manual authentication refresh requested...');
          
          let newClient;
          if (params.force) {
            newClient = await this.authManager.forceReAuthenticate();
          } else {
            newClient = await this.authManager.refreshAuthentication();
          }
          
          if (newClient && this.actionExecutor) {
            // Update the action executor with the new client
            this.actionExecutor = new ActionExecutor(newClient, this.authManager);
            
            const userContext = this.authManager.getUserContext();
            
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: 'Authentication refreshed successfully',
                  user: userContext.email,
                  userId: userContext.userId,
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          } else {
            throw new Error('Failed to refresh authentication');
          }
        } catch (error: any) {
          console.error('❌ Manual auth refresh failed:', error);
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Authentication refresh failed',
                message: error.message,
                suggestion: 'Please check your credentials and try again, or restart the MCP server'
              }, null, 2)
            }]
          };
        }
      }
    );

    // Register auth-status tool
    await this.mcpServer.registerTool(
      'auth-status',
      {
        title: 'Check Authentication Status',
        description: 'Check current authentication status and user information',
        inputSchema: authStatusSchema.shape
      },
      async () => {
        const userContext = this.authManager.getUserContext();
        const isAuthenticated = this.authManager.isAuthenticated();
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              authenticated: isAuthenticated,
              user: userContext,
              serverTime: new Date().toISOString(),
              toolsRegistered: this.config?.tools?.length || 0,
              resourcesRegistered: this.config?.resources?.length || 0
            }, null, 2)
          }]
        };
      }
    );

    console.log('   ✓ Registered default tools: refresh-auth, auth-status');
  }

  /**
   * Register MCP tools dynamically from configuration
   */
  private async registerMCPTools(): Promise<void> {
    if (!this.config?.tools || !this.actionExecutor) {
      return;
    }

    console.log(`🔧 Registering ${this.config.tools.length} MCP tools...`);

    for (const toolConfig of this.config.tools) {
      try {
        await this.mcpServer.registerTool(
          toolConfig.name,
          {
            title: toolConfig.description,
            description: toolConfig.description,
            inputSchema: (toolConfig.parameters as any)._def?.shape() || {}
          },
          async (params: any) => {
            if (!this.actionExecutor) {
              throw new Error('Action executor not initialized');
            }

            const userContext = this.authManager.getUserContext();
            console.log(`🔄 Executing tool: ${toolConfig.name}`, {
              user: userContext.email,
              params: Object.keys(params)
            });

            try {
              const result = await this.actionExecutor.executeAction(toolConfig.action, params);
              
              console.log(`✅ Tool executed successfully: ${toolConfig.name}`);
              return result;
            } catch (error) {
              console.error(`❌ Tool execution failed: ${toolConfig.name}`, error);
              throw error;
            }
          }
        );

        console.log(`   ✓ Registered tool: ${toolConfig.name}`);
      } catch (error) {
        console.error(`   ❌ Failed to register tool: ${toolConfig.name}`, error);
        throw error;
      }
    }
  }

  /**
   * Register MCP resources dynamically from configuration
   */
  private async registerMCPResources(): Promise<void> {
    if (!this.config?.resources || !this.actionExecutor) {
      return;
    }

    console.log(`📄 Registering ${this.config.resources.length} MCP resources...`);

    for (const resourceConfig of this.config.resources) {
      try {
        // Extract template variables from URI template
        const templateVars = TemplateResolver.extractTemplateVariables(resourceConfig.uriTemplate);
        
        await this.mcpServer.registerResource(
          resourceConfig.name,
          resourceConfig.uriTemplate,
          {
            title: resourceConfig.description,
            description: resourceConfig.description,
            mimeType: resourceConfig.mimeType || 'application/json'
          },
          async (uri: URL) => {
            if (!this.actionExecutor) {
              throw new Error('Action executor not initialized');
            }

            // Extract parameters from URI
            const params = this.extractParamsFromURI(uri, resourceConfig.uriTemplate, templateVars);
            
            const userContext = this.authManager.getUserContext();
            console.log(`🔄 Fetching resource: ${resourceConfig.name}`, {
              user: userContext.email,
              uri: uri.href,
              params: Object.keys(params)
            });

            try {
              const result = await this.actionExecutor.executeAction(resourceConfig.action, params);
              
              console.log(`✅ Resource fetched successfully: ${resourceConfig.name}`);
              
              const contentItem = result.content[0];
              const text = contentItem?.type === 'text' ? contentItem.text : JSON.stringify(result);
              
              return {
                contents: [{
                  uri: uri.href,
                  text: text,
                  mimeType: resourceConfig.mimeType || 'application/json'
                }]
              };
            } catch (error) {
              console.error(`❌ Resource fetch failed: ${resourceConfig.name}`, error);
              throw error;
            }
          }
        );

        console.log(`   ✓ Registered resource: ${resourceConfig.name}`);
      } catch (error) {
        console.error(`   ❌ Failed to register resource: ${resourceConfig.name}`, error);
        throw error;
      }
    }
  }

  /**
   * Extract parameters from URI based on template
   */
  private extractParamsFromURI(uri: URL, template: string, templateVars: string[]): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Simple parameter extraction - this could be enhanced for more complex templates
    const pathParts = uri.pathname.split('/');
    const templateParts = template.replace(/^[^:]*:\/\//, '').split('/');
    
    for (let i = 0; i < templateParts.length && i < pathParts.length; i++) {
      const templatePart = templateParts[i];
      const pathPart = pathParts[i];
      
      if (templatePart.startsWith('{') && templatePart.endsWith('}')) {
        const paramName = templatePart.slice(1, -1);
        params[paramName] = pathPart;
      }
    }
    
    return params;
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    try {
      console.log('🎯 Starting MCP server with stdio transport...');
      
      const transport = new StdioServerTransport();
      await this.mcpServer.connect(transport);
      
      console.log('✅ MCP server is running and ready to accept connections');
    } catch (error) {
      console.error('❌ Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the server
   */
  async shutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down SupaMCP Server...');
      
      if (this.authManager.isAuthenticated()) {
        await this.authManager.signOut();
      }
      
      console.log('✅ Server shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Get server status information
   */
  getStatus(): {
    authenticated: boolean;
    user?: { userId?: string; email?: string };
    toolCount: number;
    resourceCount: number;
    defaultToolCount: number;
    totalToolCount: number;
  } {
    const configToolCount = this.config?.tools?.length || 0;
    const defaultToolCount = 2; // refresh-auth, auth-status
    
    return {
      authenticated: this.authManager.isAuthenticated(),
      user: this.authManager.getUserContext(),
      toolCount: configToolCount,
      resourceCount: this.config?.resources?.length || 0,
      defaultToolCount: defaultToolCount,
      totalToolCount: configToolCount + defaultToolCount
    };
  }
}

/**
 * Create and start a SupaMCP server from CLI arguments
 */
export async function startSupaMCPServer(args: CLIArgs): Promise<SupaMCPServer> {
  const authConfig: AuthConfig = {
    url: args.url,
    anonKey: args.anonKey,
    email: args.email,
    password: args.password
  };

  const server = new SupaMCPServer(authConfig);

  let config: SupaMCPConfig | undefined = undefined;
  let configPath: string | undefined = undefined;

  // Load configuration
  try {
    if (args.configPath) {
      config = await ConfigLoader.loadFromFile(args.configPath);
      configPath = args.configPath;
    } else if (args.configJson) {
      config = await ConfigLoader.loadFromInlineJson(args.configJson);
    } else if (args.toolsJson) {
      config = await ConfigLoader.loadFromInlineToolsJson(args.toolsJson);
    } else if (args.toolsJsonBase64) {
      try {
        const decodedJson = Buffer.from(args.toolsJsonBase64, 'base64').toString('utf-8');
        config = await ConfigLoader.loadFromInlineToolsJson(decodedJson);
      } catch (error) {
        throw new Error(`Failed to decode Base64 tools configuration: ${(error as Error).message}`);
      }
    } // else: config remains undefined, will be loaded from DB
  } catch (error) {
    throw new Error(`Failed to load configuration: ${(error as Error).message}`);
  }

  // Initialize and start server
  await server.initialize(config, configPath);
  await server.start();

  // Setup graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await server.shutdown();
    process.exit(0);
  });

  return server;
} 