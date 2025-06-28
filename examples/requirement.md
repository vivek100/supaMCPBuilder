Absolutely — here is the **revised Requirement Document** with clear emphasis on how the **Supabase JS SDK** is used as the core backend engine to power all database, auth, RPC, and edge function interactions.

---

# 🧾 Requirement Document: Supabase → MCP Server Adapter

## 📌 Project Title

**SupaMCP Server**
*A runtime-configurable MCP server that turns your Supabase project into an AI-compatible tool interface using the Supabase JS SDK.*

---

## 🧠 Objective

To enable developers and AI agents to **interact with a Supabase project** (tables, RLS policies, functions, edge functions) via a lightweight **MCP server**, using a **declarative JSON config** that defines:

* How to connect (project URL + credentials)
* What tools are exposed
* What actions each tool performs (`select`, `insert`, `rpc`, etc.)

The server uses the **Supabase JavaScript SDK (`@supabase/supabase-js`)** to perform all backend operations securely and correctly.

---

## 🧩 Key Features

### 1. 🔌 MCP Server Bootstrap via JSON

The server is initialized through a single entry in `mcp.config.json`:

```json
{
  "mcpServers": {
    "my-app-db": {
      "command": "npx",
      "args": [
        "-y",
        "@yourorg/mcp-server-supabase-direct@latest",
        "--url", "https://your-project.supabase.co",
        "--anon-key", "...",
        "--email", "...",
        "--password", "..."
      ],
      "tools": [ ... ]
    }
  }
}
```

The server must:

* Read the config and credentials
* Authenticate the user (if email/password provided)
* Use the resulting `access_token` to initialize an **authenticated Supabase JS client**
* Dynamically scaffold endpoints for the defined tools

---

## 🧰 SDK: Supabase JavaScript Client

The entire backend logic relies on **`@supabase/supabase-js`** for:

| Capability             | How it's used                                   |
| ---------------------- | ----------------------------------------------- |
| **Auth (login)**       | `auth.signInWithPassword({ email, password })`  |
| **Token-based client** | Client with `Authorization: Bearer <token>`     |
| **Table queries**      | `from(...).select()`, `.insert()`, `.update()`  |
| **RLS enforcement**    | Done automatically when using authed token      |
| **RPC calls**          | `rpc(functionName, args)`                       |
| **Edge Functions**     | Custom HTTP calls constructed using the SDK URL |

The SDK ensures:

* **Correct auth context** (RLS enforced)
* **Automatic retries** and rich error messages
* **Consistent syntax** across DB, storage, and functions

---

## 🔐 Authentication Support

### a. Anonymous Key

* Uses `anon` key only
* Limited access depending on RLS/public permissions
* Useful for read-only or public queries

### b. Email + Password

* Uses `anon` key to initiate login
* Retrieves `access_token` via `signInWithPassword`
* Reinitializes the Supabase client with `Authorization: Bearer <token>`
* All future DB operations are executed in **that user's context**

---

## 🛠 Tool Definition Format

Each tool must include:

* `name`: Unique identifier
* `description`: Human-readable explanation
* `parameters`: JSON Schema of inputs
* `action`: Declarative instruction describing the operation

Supported `action.type` values:

| Type           | Backed by Supabase SDK                                                 |
| -------------- | ---------------------------------------------------------------------- |
| `select`       | `from(...).select().filter()`                                          |
| `insert`       | `from(...).insert([...])`                                              |
| `update`       | `from(...).update().match()`                                           |
| `delete`       | `from(...).delete().match()`                                           |
| `rpc`          | `rpc(functionName, args)`                                              |
| `edgeFunction` | HTTP call to `${projectURL}/functions/v1/<function>` with headers/body |

All values in `filters` and `values` support templating using `{{param}}`.

---

## 📡 API Exposure

Each tool is exposed at:

```
POST /tools/<toolName>
```

The server:

* Validates inputs against the `parameters` schema
* Maps values into Supabase SDK calls
* Executes the action using the authenticated or default client

Also:

* `GET /tools` returns tool metadata (name, description, parameters) in OpenAI-compatible format.

---

## 🔄 Runtime Behavior

The server:

* Loads `mcp.config.json` and parses `args` and `tools`
* Initializes Supabase client using `anon` key
* If login credentials are provided, performs login and reinitializes the client with `access_token`
* Dynamically registers all tools as Express POST routes
* Executes queries using Supabase JS SDK functions

---

## 🌍 Deployment & Usage

The MCP server:

* Can be run locally or in the cloud
* Does **not require writing code**
* Is configured entirely via `mcp.config.json`
* Can be embedded in any AI app that supports MCP servers

---

## 🔮 Planned Enhancements

| Feature              | Description                                           |
| -------------------- | ----------------------------------------------------- |
| External `toolsPath` | Reference tool definitions from an external JSON file |
| CLI login utility    | Store access token securely via one-time login        |
| Web UI               | Visual interface to generate the config file          |
| Auth headers         | JWT injection support for custom identity scenarios   |
| Post-processors      | Transform Supabase result before returning to agent   |

---

## ✅ Deliverables Summary

| Component                             | Description                                                    |
| ------------------------------------- | -------------------------------------------------------------- |
| `@yourorg/mcp-server-supabase-direct` | NPM package that launches MCP server using Supabase JS         |
| MCP config support                    | JSON-based runtime configuration for URL, keys, tools          |
| Auth integration                      | Support for both anon key and email/password login             |
| Supabase JS-backed execution          | All DB/RPC/function actions run via SDK with full auth context |
| Tool runtime compiler                 | Converts declarative actions to Supabase JS operations         |
| API server                            | RESTful endpoints for tools + tool discovery                   |

---
