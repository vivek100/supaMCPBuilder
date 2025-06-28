# 🧾 SupaMCP Server

**A runtime-configurable MCP server that turns your Supabase project into an AI-compatible tool interface**

[![NPM Version](https://img.shields.io/npm/v/@yourorg/mcp-server-supabase-direct)](https://www.npmjs.com/package/@yourorg/mcp-server-supabase-direct)
[![License](https://img.shields.io/npm/l/@yourorg/mcp-server-supabase-direct)](LICENSE)

## 📌 Overview

SupaMCP Server enables developers and AI agents to **interact with Supabase projects** through the Model Context Protocol (MCP). It provides a declarative JSON-based configuration system that exposes your database tables, RPC functions, and edge functions as MCP tools and resources.

### Key Features

- ✅ **Secure User Authentication**: Email/password authentication with automatic token management
- ✅ **JWT Auto-Refresh**: Automatic JWT token refresh with manual re-authentication tools
- ✅ **JSON-based Configuration**: Runtime tool definition without writing code
- ✅ **Full CRUD Operations**: Select, insert, update, delete via Supabase JS SDK
- ✅ **RPC Function Support**: Call PostgreSQL stored procedures
- ✅ **Edge Function Integration**: HTTP calls to Supabase edge functions
- ✅ **MCP Resources**: Expose data as reusable resources
- ✅ **Template System**: Parameter substitution with `{{param}}` syntax
- ✅ **Row Level Security**: Automatic RLS enforcement with user context
- ✅ **Advanced Filtering**: Full Supabase filter support (eq, gt, like, in, etc.)
- ✅ **Default System Tools**: Built-in authentication management tools
- ✅ **TypeScript Support**: Full type definitions included

## 🚀 Quick Start

### 1. Installation

```bash
npm install -g @yourorg/mcp-server-supabase-direct
```

### 2. Basic Usage

#### Using Configuration File
```bash
supabase-mcp-server \
  --url "https://your-project.supabase.co" \
  --anon-key "your-anon-key" \
  --email "user@example.com" \
  --password "your-password" \
  --config-path "./config.json"
```

#### Using Inline Configuration (Perfect for MCP Clients)
```bash
# Simple tools-only configuration
supabase-mcp-server \
  --url "https://your-project.supabase.co" \
  --anon-key "your-anon-key" \
  --email "user@example.com" \
  --password "your-password" \
  --tools-json '[{"name":"get-users","description":"Fetch users","parameters":{"type":"object","properties":{"limit":{"type":"number","default":10}}},"action":{"type":"select","table":"users","limit":"{{limit}}"}}]'
```

### 3. MCP Client Integration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "supabase-mcp-server",
      "args": [
        "--url", "https://your-project.supabase.co",
        "--anon-key", "your-anon-key",
        "--email", "user@example.com",
        "--password", "your-password",
        "--tools-json", "[{\"name\":\"get-users\",\"description\":\"Fetch users\",\"parameters\":{\"type\":\"object\",\"properties\":{\"limit\":{\"type\":\"number\",\"default\":10}}},\"action\":{\"type\":\"select\",\"table\":\"users\",\"limit\":\"{{limit}}\"}}]"
      ]
    }
  }
}
```

## 🔐 Authentication & JWT Management

SupaMCP Server uses **secure user authentication** via email and password with automatic JWT refresh:

- **User Context**: All operations run in the authenticated user's context
- **RLS Enforcement**: Row Level Security policies are automatically enforced
- **Auto JWT Refresh**: Automatic token refresh when JWT expires
- **Manual Re-auth**: Built-in tools for manual authentication refresh
- **No Admin Access**: Focuses on end-user security (admins can use dedicated tools)

### Required Credentials

```bash
--url https://your-project.supabase.co     # Your Supabase project URL
--anon-key eyJ...                          # Your Supabase anonymous key
--email user@example.com                   # User email for authentication
--password userpassword                    # User password
```

### JWT Expiration Handling

When JWT tokens expire, SupaMCP Server automatically:

1. **Detects JWT expiration** in any tool execution
2. **Attempts automatic refresh** using the refresh token
3. **Falls back to re-authentication** if refresh fails
4. **Retries the original operation** with the new token

If automatic refresh fails, the server provides helpful error messages suggesting the use of manual refresh tools.

### Default System Tools

SupaMCP Server automatically registers these system tools:

#### `refresh-auth` Tool
Manually refresh authentication when JWT expires:

```json
{
  "name": "refresh-auth",
  "parameters": {
    "force": false  // Set to true for complete re-authentication
  }
}
```

#### `auth-status` Tool
Check current authentication status:

```json
{
  "name": "auth-status",
  "parameters": {}
}
```

Example usage:
```bash
# Check authentication status
{"tool": "auth-status", "parameters": {}}

# Refresh authentication
{"tool": "refresh-auth", "parameters": {"force": false}}

# Force complete re-authentication
{"tool": "refresh-auth", "parameters": {"force": true}}
```

## 🛠️ Tool Actions

SupaMCP Server supports all major database operations:

### SELECT Operations
```json
{
  "type": "select",
  "table": "posts",
  "columns": ["id", "title", "content"],
  "filters": {
    "author_id": "{{user_id}}",
    "published": true
  },
  "limit": "{{limit}}",
  "orderBy": [
    { "column": "created_at", "ascending": false }
  ]
}
```

### INSERT Operations
```json
{
  "type": "insert",
  "table": "posts",
  "values": {
    "title": "{{title}}",
    "content": "{{content}}",
    "author_id": "{{author_id}}"
  },
  "returning": ["id", "title", "created_at"]
}
```

### UPDATE Operations
```json
{
  "type": "update",
  "table": "posts",
  "values": {
    "title": "{{new_title}}",
    "updated_at": "now()"
  },
  "filters": {
    "id": "{{post_id}}"
  }
}
```

### RPC Function Calls
```json
{
  "type": "rpc",
  "function": "get_user_stats",
  "args": {
    "user_id": "{{user_id}}"
  }
}
```

### Edge Function Calls
```json
{
  "type": "edgeFunction",
  "function": "image-processor",
  "method": "POST",
  "body": {
    "image_url": "{{image_url}}",
    "operation": "resize"
  }
}
```

## 📡 MCP Resources

Resources provide read-only access to data:

```json
{
  "resources": [
    {
      "name": "user-profile",
      "description": "Get user profile information",
      "uriTemplate": "users://{user_id}/profile",
      "action": {
        "type": "select",
        "table": "users",
        "filters": { "id": "{{user_id}}" },
        "single": true
      }
    }
  ]
}
```

## 🎯 Template System

Use `{{parameter}}` syntax for dynamic values:

- **Simple substitution**: `"title": "{{post_title}}"`
- **In filters**: `"author_id": "{{user_id}}"`
- **In table names**: `"table": "{{table_name}}"`
- **In function names**: `"function": "{{function_name}}"`

## 📋 Configuration Examples

### Complete Example
See [`examples/supabase-tools.json`](examples/supabase-tools.json) for a comprehensive configuration with:
- User management tools
- Blog post operations
- RPC function calls
- Edge function integration
- Resource definitions

### Basic Example
See [`examples/basic-config.json`](examples/basic-config.json) for a minimal setup.

## 🔧 CLI Usage

### Direct Command Line

```bash
npx @yourorg/mcp-server-supabase-direct \
  --url https://your-project.supabase.co \
  --anon-key eyJ... \
  --email user@example.com \
  --password userpassword \
  --config-path ./my-tools.json \
  --verbose
```

### Via MCP Client Configuration

Add to your MCP client's configuration file:

```json
{
  "mcpServers": {
    "my-supabase": {
      "command": "npx",
      "args": [
        "-y", "@yourorg/mcp-server-supabase-direct@latest",
        "--url", "https://your-project.supabase.co",
        "--anon-key", "your-anon-key",
        "--email", "user@example.com", 
        "--password", "user-password",
        "--config-path", "./supabase-tools.json"
      ]
    }
  }
}
```

## 🔍 Parameter Schema

Tool parameters follow JSON Schema format:

```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Post title"
      },
      "category": {
        "type": "string",
        "enum": ["tech", "business", "personal"],
        "default": "tech"
      },
      "published": {
        "type": "boolean",
        "default": false
      }
    },
    "required": ["title"]
  }
}
```

## 🏗️ Advanced Features

### Complex Queries with Joins
```json
{
  "type": "select",
  "table": "posts",
  "columns": [
    "id", "title", "content",
    "users(id,email,full_name)"
  ],
  "filters": {
    "published": true
  }
}
```

### Bulk Operations
```json
{
  "type": "insert",
  "table": "posts",
  "values": [
    {"title": "Post 1", "content": "Content 1"},
    {"title": "Post 2", "content": "Content 2"}
  ]
}
```

### Conditional Updates
```json
{
  "type": "update",
  "table": "posts",
  "values": {
    "status": "published",
    "published_at": "now()"
  },
  "filters": {
    "author_id": "{{user_id}}",
    "status": "draft"
  }
}
```

## 🔒 Security Features

- **User-only Authentication**: No anonymous or admin access
- **RLS Enforcement**: All queries respect Row Level Security
- **Parameter Validation**: Input validation via JSON Schema
- **Template Safety**: Prevents SQL injection through parameterization
- **Error Handling**: Detailed error messages without exposing sensitive data

## 🚦 Error Handling

The server provides detailed error messages:

```json
{
  "code": "EXECUTION_ERROR",
  "message": "Insert failed: duplicate key value violates unique constraint",
  "details": {
    "constraint": "users_email_key",
    "table": "users"
  }
}
```

## 🔧 Development

### Building from Source

```bash
git clone https://github.com/yourorg/mcp-server-supabase-direct
cd mcp-server-supabase-direct
npm install
npm run build
```

### Running in Development

```bash
npm run dev -- \
  --url https://your-project.supabase.co \
  --anon-key your-key \
  --email user@example.com \
  --password password \
  --config-path ./examples/basic-config.json
```

### Testing

```bash
npm test
```

## 📚 API Reference

### Core Classes

- **`SupaMCPServer`**: Main server class
- **`AuthManager`**: Handles Supabase authentication
- **`ActionExecutor`**: Executes database operations
- **`ConfigLoader`**: Loads and validates configurations
- **`TemplateResolver`**: Handles parameter substitution

### Types

All TypeScript types are exported for custom implementations.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourorg/mcp-server-supabase-direct/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourorg/mcp-server-supabase-direct/discussions)
- **Documentation**: [Wiki](https://github.com/yourorg/mcp-server-supabase-direct/wiki)

## 🌟 Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Supabase](https://supabase.com/)
- [Claude Desktop](https://claude.ai/download)
- [Continue](https://continue.dev/)

---

**Built with ❤️ for the AI and developer community**

## Configuration Options

The server supports multiple configuration methods:

### 1. Configuration File (`--config-path`)
Point to a JSON file containing your complete configuration:
```bash
--config-path "./my-config.json"
```

### 2. Inline JSON Configuration (`--config-json`)
Pass the complete configuration as a JSON string:
```bash
--config-json '{"tools":[...],"resources":[...]}'
```

### 3. Inline Tools Configuration (`--tools-json`)
Pass only tools configuration as a JSON string (simpler for basic use cases):
```bash
--tools-json '[{"name":"tool1","description":"...","parameters":{...},"action":{...}}]'
```

**Note**: Only one configuration method can be used at a time. The inline options are especially useful for MCP client integration where you want to avoid managing separate configuration files.

# SupaMCPBuilder

A runtime-configurable MCP (Model Context Protocol) server for Supabase databases with inline JSON configuration support. Build dynamic tools for your Supabase database without writing code!

## Features

- 🚀 **Zero Configuration**: Works out of the box with any Supabase project
- 🔧 **Runtime Configurable**: Define tools using JSON configuration
- 🔐 **Built-in Authentication**: Automatic JWT token refresh and session management
- 📊 **Dynamic Tool Generation**: Create custom database operations via JSON
- 🎯 **Template Support**: Use Jinja2-style templates in your configurations
- 🔄 **Base64 Support**: Handle complex JSON configurations safely

## Quick Start

### Using with npx (Recommended)

```bash
npx supamcpbuilder --url YOUR_SUPABASE_URL --anon-key YOUR_ANON_KEY --email YOUR_EMAIL --password YOUR_PASSWORD --tools-json-base64 BASE64_ENCODED_TOOLS
```

### Installation

```bash
npm install -g supamcpbuilder
```

## Configuration Options

### Basic Usage

```bash
supamcpbuilder \
  --url "https://your-project.supabase.co" \
  --anon-key "your-anon-key" \
  --email "your-email@example.com" \
  --password "your-password"
```

### With JSON Configuration File

```bash
supamcpbuilder \
  --url "https://your-project.supabase.co" \
  --anon-key "your-anon-key" \
  --email "your-email@example.com" \
  --password "your-password" \
  --config-path "./tools-config.json"
```

### With Base64 Encoded Tools

```bash
supamcpbuilder \
  --url "https://your-project.supabase.co" \
  --anon-key "your-anon-key" \
  --email "your-email@example.com" \
  --password "your-password" \
  --tools-json-base64 "W3sibmFtZSI6Imxpc3QtdXNlcnMiLCJkZXNjcmlwdGlvbiI6Ikxpc3QgYWxsIHVzZXJzIn1d"
```

## Tool Configuration Format

### Basic Tool Structure

```json
[
  {
    "name": "list-users",
    "description": "List all users from the users table",
    "parameters": {
      "type": "object",
      "properties": {
        "limit": {
          "type": "number",
          "description": "Number of users to return",
          "default": 10
        }
      }
    },
    "action": {
      "type": "select",
      "table": "users",
      "columns": ["id", "name", "email"],
      "limit": "{{limit}}"
    }
  }
]
```

### Supported Action Types

- **select**: Query data from tables
- **insert**: Create new records
- **update**: Modify existing records
- **delete**: Remove records

### Template Variables

Use Jinja2-style templates in your configurations:

```json
{
  "action": {
    "type": "select",
    "table": "{{table_name}}",
    "filters": {
      "id": "{{user_id}}"
    }
  }
}
```

## MCP Client Configuration

### Cursor IDE Configuration

Add to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supamcpbuilder": {
      "command": "npx",
      "args": [
        "-y",
        "supamcpbuilder",
        "--url", "https://your-project.supabase.co",
        "--anon-key", "your-anon-key",
        "--email", "your-email@example.com",
        "--password", "your-password",
        "--tools-json-base64", "YOUR_BASE64_ENCODED_TOOLS"
      ]
    }
  }
}
```

### Claude Desktop Configuration

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "supamcpbuilder": {
      "command": "npx",
      "args": [
        "-y",
        "supamcpbuilder",
        "--url", "https://your-project.supabase.co",
        "--anon-key", "your-anon-key",
        "--email", "your-email@example.com",
        "--password", "your-password",
        "--config-path", "/path/to/your/tools-config.json"
      ]
    }
  }
}
```

## Environment Variables

You can also use environment variables:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_EMAIL="your-email@example.com"
export SUPABASE_PASSWORD="your-password"

supamcpbuilder --config-path "./tools-config.json"
```

## Advanced Configuration

### Complex Tool Example

```json
[
  {
    "name": "create-user-with-profile",
    "description": "Create a new user with profile information",
    "parameters": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "User's full name"
        },
        "email": {
          "type": "string",
          "description": "User's email address"
        },
        "bio": {
          "type": "string",
          "description": "User's biography"
        }
      },
      "required": ["name", "email"]
    },
    "action": {
      "type": "insert",
      "table": "users",
      "values": {
        "name": "{{name}}",
        "email": "{{email}}",
        "bio": "{{bio}}",
        "created_at": "now()"
      },
      "returning": ["id", "name", "email"]
    }
  }
]
```

## Security Considerations

- Always use Row Level Security (RLS) in your Supabase tables
- Use service role keys only in secure environments
- Regularly rotate your API keys
- Monitor your database usage and access patterns

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure your email/password combination is correct
2. **Permission Denied**: Check your RLS policies and user permissions
3. **Tool Not Found**: Verify your JSON configuration syntax
4. **Connection Issues**: Confirm your Supabase URL and API keys

### Debug Mode

Enable debug logging:

```bash
DEBUG=supamcpbuilder supamcpbuilder --url ... --anon-key ...
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: [Create an issue](https://github.com/vivek100/supaMCPBuilder/issues)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/vivek100/supaMCPBuilder/issues)
- 💡 Feature Requests: [GitHub Discussions](https://github.com/vivek100/supaMCPBuilder/discussions)

## Changelog

### v1.0.0
- Initial release
- Basic MCP server functionality
- JSON configuration support
- Base64 encoding support
- Authentication handling
- Template variable support 