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

## Authentication & Security

- **User Authentication**: Uses email/password with automatic JWT refresh
- **Row Level Security**: All operations respect your Supabase RLS policies
- **Secure by Default**: No admin access, focuses on user-level operations
- **Auto Token Refresh**: Handles JWT expiration automatically

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

## Examples

Check the `examples/` directory for:
- Sample tool configurations
- MCP client setup examples
- Common use cases

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/vivek100/supaMCPBuilder/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/vivek100/supaMCPBuilder/discussions)
- 📖 **Documentation**: Check the examples directory for more details

## Changelog

### v1.0.0
- Initial release
- Basic MCP server functionality
- JSON configuration support
- Base64 encoding support
- Authentication handling
- Template variable support 