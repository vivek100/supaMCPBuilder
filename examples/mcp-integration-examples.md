# MCP Integration Examples

This document shows various ways to integrate SupaMCP Server with MCP clients using different configuration methods.

## 1. Using Configuration File (Traditional)

```json
{
  "mcpServers": {
    "my-supabase": {
      "command": "npx",
      "args": [
        "-y", "@yourorg/mcp-server-supabase-direct@latest",
        "--url", "https://your-project.supabase.co",
        "--anon-key", "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "--email", "user@example.com",
        "--password", "userpassword",
        "--config-path", "./supabase-tools.json"
      ]
    }
  }
}
```

## 2. Using Inline JSON Configuration

### Full Configuration (Tools + Resources)

```json
{
  "mcpServers": {
    "my-supabase": {
      "command": "npx",
      "args": [
        "-y", "@yourorg/mcp-server-supabase-direct@latest",
        "--url", "https://your-project.supabase.co",
        "--anon-key", "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "--email", "user@example.com",
        "--password", "userpassword",
        "--config-json", "{\"tools\":[{\"name\":\"get-users\",\"description\":\"Fetch users\",\"parameters\":{\"type\":\"object\",\"properties\":{\"limit\":{\"type\":\"number\",\"default\":10}}},\"action\":{\"type\":\"select\",\"table\":\"users\",\"limit\":\"{{limit}}\"}}],\"resources\":[{\"name\":\"user-profile\",\"description\":\"User profile\",\"uriTemplate\":\"users://{user_id}/profile\",\"action\":{\"type\":\"select\",\"table\":\"users\",\"filters\":{\"id\":\"{{user_id}}\"},\"single\":true}}]}"
      ]
    }
  }
}
```

### Tools-Only Configuration (Simpler)

```json
{
  "mcpServers": {
    "my-supabase": {
      "command": "npx",
      "args": [
        "-y", "@yourorg/mcp-server-supabase-direct@latest",
        "--url", "https://your-project.supabase.co",
        "--anon-key", "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "--email", "user@example.com",
        "--password", "userpassword",
        "--tools-json", "[{\"name\":\"get-users\",\"description\":\"Fetch users from database\",\"parameters\":{\"type\":\"object\",\"properties\":{\"limit\":{\"type\":\"number\",\"default\":10}}},\"action\":{\"type\":\"select\",\"table\":\"users\",\"limit\":\"{{limit}}\"}}]"
      ]
    }
  }
}
```

## 3. Readable Multi-line Format (Using Environment Variables)

For better readability, you can use environment variables:

### Environment Variables (.env)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_EMAIL=user@example.com
SUPABASE_PASSWORD=userpassword
SUPABASE_TOOLS_JSON=[
  {
    "name": "get-users",
    "description": "Fetch users from the database",
    "parameters": {
      "type": "object",
      "properties": {
        "limit": {"type": "number", "default": 10},
        "role": {"type": "string", "optional": true}
      }
    },
    "action": {
      "type": "select",
      "table": "users",
      "columns": ["id", "email", "role", "created_at"],
      "filters": {"role": "{{role}}"},
      "limit": "{{limit}}"
    }
  },
  {
    "name": "create-user",
    "description": "Create a new user",
    "parameters": {
      "type": "object",
      "properties": {
        "email": {"type": "string"},
        "name": {"type": "string"}
      },
      "required": ["email", "name"]
    },
    "action": {
      "type": "insert",
      "table": "users",
      "values": {
        "email": "{{email}}",
        "name": "{{name}}",
        "created_at": "now()"
      },
      "returning": ["id", "email", "name"]
    }
  }
]
```

### MCP Configuration
```json
{
  "mcpServers": {
    "my-supabase": {
      "command": "npx",
      "args": [
        "-y", "@yourorg/mcp-server-supabase-direct@latest",
        "--url", "${SUPABASE_URL}",
        "--anon-key", "${SUPABASE_ANON_KEY}",
        "--email", "${SUPABASE_EMAIL}",
        "--password", "${SUPABASE_PASSWORD}",
        "--tools-json", "${SUPABASE_TOOLS_JSON}"
      ]
    }
  }
}
```

## 4. Dynamic Configuration Examples

### E-commerce Tools
```json
{
  "tools": [
    {
      "name": "get-products",
      "description": "Search products by category or name",
      "parameters": {
        "type": "object",
        "properties": {
          "category": {"type": "string", "optional": true},
          "search": {"type": "string", "optional": true},
          "limit": {"type": "number", "default": 20}
        }
      },
      "action": {
        "type": "select",
        "table": "products",
        "columns": ["id", "name", "price", "category", "description"],
        "filters": {
          "category": "{{category}}",
          "name": "{{search}}"
        },
        "limit": "{{limit}}"
      }
    },
    {
      "name": "create-order",
      "description": "Create a new order",
      "parameters": {
        "type": "object",
        "properties": {
          "customer_id": {"type": "string"},
          "items": {"type": "array"}
        },
        "required": ["customer_id", "items"]
      },
      "action": {
        "type": "insert",
        "table": "orders",
        "values": {
          "customer_id": "{{customer_id}}",
          "items": "{{items}}",
          "status": "pending",
          "created_at": "now()"
        },
        "returning": ["id", "status", "created_at"]
      }
    }
  ]
}
```

### Blog Management Tools
```json
{
  "tools": [
    {
      "name": "publish-post",
      "description": "Publish a blog post",
      "parameters": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "content": {"type": "string"},
          "tags": {"type": "array", "optional": true}
        },
        "required": ["title", "content"]
      },
      "action": {
        "type": "insert",
        "table": "posts",
        "values": {
          "title": "{{title}}",
          "content": "{{content}}",
          "tags": "{{tags}}",
          "published": true,
          "published_at": "now()"
        }
      }
    },
    {
      "name": "get-analytics",
      "description": "Get blog analytics via stored procedure",
      "parameters": {
        "type": "object",
        "properties": {
          "period": {"type": "string", "enum": ["day", "week", "month"], "default": "week"}
        }
      },
      "action": {
        "type": "rpc",
        "function": "get_blog_analytics",
        "args": {"time_period": "{{period}}"}
      }
    }
  ]
}
```

## 5. Quick Setup Commands

### Minimal Setup
```bash
npx @yourorg/mcp-server-supabase-direct \
  --url "https://your-project.supabase.co" \
  --anon-key "your-anon-key" \
  --email "user@example.com" \
  --password "password" \
  --tools-json '[{"name":"list-users","description":"List all users","parameters":{"type":"object","properties":{"limit":{"type":"number","default":10}}},"action":{"type":"select","table":"users","limit":"{{limit}}"}}]'
```

### With Multiple Tools
```bash
npx @yourorg/mcp-server-supabase-direct \
  --url "https://your-project.supabase.co" \
  --anon-key "your-anon-key" \
  --email "user@example.com" \
  --password "password" \
  --config-json '{"tools":[{"name":"get-users","description":"Get users","parameters":{"type":"object","properties":{"limit":{"type":"number","default":10}}},"action":{"type":"select","table":"users","limit":"{{limit}}"}},{"name":"create-user","description":"Create user","parameters":{"type":"object","properties":{"email":{"type":"string"},"name":{"type":"string"}},"required":["email","name"]},"action":{"type":"insert","table":"users","values":{"email":"{{email}}","name":"{{name}}"}}}]}'
```

## 6. Testing Configuration

You can test your configuration before using it in MCP:

```bash
# Test with verbose output
npx @yourorg/mcp-server-supabase-direct \
  --url "your-url" \
  --anon-key "your-key" \
  --email "your-email" \
  --password "your-password" \
  --tools-json '[...]' \
  --verbose
```

## CLI Options Summary

- `--config-path`: Path to JSON configuration file
- `--config-json`: Full configuration as JSON string (tools + resources)
- `--tools-json`: Tools-only configuration as JSON string (simpler)
- `--verbose`: Enable detailed logging

**Note**: Only one configuration method can be used at a time. 