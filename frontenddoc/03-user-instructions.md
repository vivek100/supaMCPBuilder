# SupaMCP User Guide - Step-by-Step Instructions

## 🚀 Welcome to SupaMCP

SupaMCP is your gateway to creating powerful MCP (Model Context Protocol) tool configurations for Supabase databases. This guide will walk you through the entire process from setup to testing your generated tools.

## 📋 What You'll Accomplish

By the end of this guide, you will have:
- ✅ Connected your Supabase project
- ✅ Generated an AI prompt with your database context
- ✅ Created MCP tool configurations using AI assistants
- ✅ Tested your tools in the browser
- ✅ Exported a production-ready MCP server configuration

---

## 🎯 Step 1: Project Setup & Connection

### 1.1 Getting Started

**Navigate to:** SupaMCP Homepage → Click "Get Started"

**What you'll need:**
- Supabase project URL (e.g., `https://your-project.supabase.co`)
- Anonymous API key from your Supabase dashboard
- Basic understanding of what data you want to expose

### 1.2 Enter Supabase Connection Details

**Screenshot Placeholder:** *Setup form with URL and key fields*

```
┌─────────────────────────────────────────────┐
│ 🔗 Connect Your Supabase Project           │
├─────────────────────────────────────────────┤
│                                             │
│ Project URL:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ https://your-project.supabase.co        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Anonymous Key:                              │
│ ┌─────────────────────────────────────────┐ │
│ │ eyJhbGciOiJIUzI1NiIsInR5cCI6•••••••••• │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Project Name (optional):                    │
│ ┌─────────────────────────────────────────┐ │
│ │ My Awesome Project                      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│           [ Test Connection ]               │
└─────────────────────────────────────────────┘
```

**How to find your Supabase credentials:**
1. Go to your Supabase dashboard
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the **Project URL** and **anon/public key**

⚠️ **Security Note:** Your keys never leave your browser and are not stored on our servers.

### 1.3 Connection Validation

Once you click "Test Connection," SupaMCP will:
- ✅ Verify your URL and key are valid
- ✅ Check database connectivity
- ✅ Perform basic permission tests
- ⚠️ Display any connection issues with helpful solutions

**Common Connection Issues:**
- **Invalid URL format:** Make sure you include `https://` and end with `.supabase.co`
- **Wrong API key:** Double-check you're using the anonymous key, not the service role key
- **Network issues:** Check your internet connection and firewall settings

---

## 🔍 Step 2: Database Discovery & Selection

### 2.1 Automatic Database Discovery

**Screenshot Placeholder:** *Database discovery results with tables and functions*

After successful connection, SupaMCP automatically discovers:
- 📊 **Database Tables:** All tables in your public schema
- ⚙️ **Functions:** Edge Functions and PostgreSQL functions (RPC)
- 🔒 **Security Policies:** Row Level Security (RLS) status
- 🔗 **Relationships:** Foreign key relationships between tables

```
┌─────────────────────────────────────────────┐
│ 🔍 Database Discovery Results               │
├─────────────────────────────────────────────┤
│                                             │
│ Tables Found: 8                             │
│ ├─ ✅ users (RLS enabled)                   │
│ ├─ ✅ posts (RLS enabled)                   │
│ ├─ ✅ comments (RLS enabled)                │
│ ├─ ⚠️  todos (RLS disabled)                │
│ ├─ ⚠️  leads (RLS disabled)                │
│ └─ ✅ categories (RLS enabled)              │
│                                             │
│ Edge Functions: 2                           │
│ ├─ send-email                               │
│ └─ process-payment                          │
│                                             │
│ Database Functions: 3                       │
│ ├─ get_user_stats                           │
│ ├─ calculate_metrics                        │
│ └─ search_content                           │
└─────────────────────────────────────────────┘
```

### 2.2 Security Review

**Critical Security Checkpoint:**

SupaMCP will highlight tables without Row Level Security (RLS):

⚠️ **Tables without RLS are potentially unsafe to expose publicly**

For each table without RLS, you have options:
1. **Skip this table** (recommended for sensitive data)
2. **Enable RLS in Supabase** before proceeding
3. **Proceed with caution** (only for truly public data)

**To enable RLS in Supabase:**
```sql
-- In your Supabase SQL editor
ALTER TABLE your_table_name ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies
CREATE POLICY "Users can view their own data" ON your_table_name
FOR SELECT USING (auth.uid() = user_id);
```

### 2.3 Functionality Selection

**Choose what to expose as MCP tools:**

```
┌─────────────────────────────────────────────┐
│ 🛠️ Select Functionality to Expose          │
├─────────────────────────────────────────────┤
│                                             │
│ Tables:                                     │
│ ☑️ users - User management operations       │
│ ☑️ posts - Blog post CRUD                   │
│ ☑️ comments - Comment management            │
│ ☐ todos - Todo list (RLS disabled)         │
│ ☐ leads - Sales leads (RLS disabled)       │
│ ☑️ categories - Category management         │
│                                             │
│ Functions:                                  │
│ ☑️ send-email - Email notifications         │
│ ☐ process-payment - Payment processing     │
│ ☑️ get_user_stats - User analytics          │
│ ☑️ search_content - Content search          │
│                                             │
│ CRUD Preferences:                           │
│ ☑️ Create operations                        │
│ ☑️ Read/List operations                     │
│ ☑️ Update operations                        │
│ ☑️ Delete operations (with safety checks)  │
│                                             │
│ Advanced Features:                          │
│ ☑️ Search and filtering                     │
│ ☑️ Pagination support                       │
│ ☑️ Relationship queries                     │
│ ☐ Complex aggregations                     │
└─────────────────────────────────────────────┘
```

**Recommendations:**
- ✅ **Always include existing functions first** - they contain tested business logic
- ✅ **Start with read operations** - safer and easier to test
- ⚠️ **Be careful with delete operations** - consider soft deletes
- 🔒 **Only expose tables with proper RLS policies**

---

## 🤖 Step 3: AI Prompt Generation

### 3.1 Choose Your AI Assistant

**Screenshot Placeholder:** *AI platform selection screen*

**Supported AI Platforms:**
- **Claude (Anthropic)** ⭐ *Recommended*
  - Excellent at understanding complex database schemas
  - Superior code generation capabilities
  - Great at following security guidelines

- **Cursor** ⭐ *Great for developers*
  - Integrated development environment
  - Real-time code editing
  - Perfect for iterative development

- **Bolt (StackBlitz)** ⭐ *For quick prototyping*
  - Instant browser-based development
  - Great for testing and iteration
  - No local setup required

### 3.2 Prompt Customization

**Configure your AI prompt:**

```
┌─────────────────────────────────────────────┐
│ 🎯 Customize Your AI Prompt                │
├─────────────────────────────────────────────┤
│                                             │
│ Target Platform:                            │
│ ● Claude Desktop/Web                        │
│ ○ Cursor IDE                                │
│ ○ Bolt (StackBlitz)                         │
│                                             │
│ Complexity Level:                           │
│ ○ Basic CRUD only                           │
│ ● Standard operations + search              │
│ ○ Advanced with analytics                   │
│                                             │
│ Security Emphasis:                          │
│ ○ Minimal (development only)               │
│ ● Standard (production ready)               │
│ ○ High security (enterprise)               │
│                                             │
│ Include Documentation:                      │
│ ☑️ Parameter descriptions                   │
│ ☑️ Error handling guidelines                │
│ ☑️ Security considerations                  │
│ ☑️ Usage examples                           │
└─────────────────────────────────────────────┘
```

### 3.3 Generated Prompt Preview

**Screenshot Placeholder:** *Prompt preview with copy button*

The generated prompt will include:
- 📊 **Your complete database schema**
- 🔒 **Security policy information**
- ⚙️ **Available functions catalog**
- 🎯 **Specific requirements for selected functionality**
- 📚 **Comprehensive guidelines and examples**

**Prompt Structure:**
```
# Database Analysis Request

## Project Context
- Database: [Your Project Name]
- Tables: [Selected tables with schema]
- Functions: [Available functions]
- Security: [RLS status and recommendations]

## Requirements
- Generate MCP tools for: [Selected functionality]
- Platform: [Your chosen AI assistant]
- Complexity: [Selected level]

## Database Schema
[Detailed schema information]

## Security Policies
[RLS policies and recommendations]

## Expected Deliverable
Generate a JSON configuration with tools for...
```

### 3.4 Copy and Use Prompt

1. **Click "Copy Prompt"** - The full prompt is copied to your clipboard
2. **Open your AI assistant** (Claude, Cursor, or Bolt)
3. **Paste the prompt** and send it to the AI
4. **Wait for the AI response** - This usually takes 30-60 seconds

**Tips for Best Results:**
- 📝 **Be specific in follow-up questions** if the AI needs clarification
- 🔄 **Ask for iterations** if you need modifications
- 🧪 **Request multiple approaches** for complex requirements
- ✅ **Verify the JSON structure** before proceeding

---

## 📋 Step 4: Import AI-Generated Configuration

### 4.1 Copy AI Response

**What to look for in the AI response:**
- JSON configuration block (usually in code fences)
- Tool definitions with proper schema
- Action configurations for each tool
- Security recommendations

**Example AI Response Structure:**
```json
[
  {
    "name": "get-user-profile",
    "description": "Fetch user profile information",
    "parameters": {
      "type": "object",
      "properties": {
        "user_id": {
          "type": "string",
          "description": "UUID of the user"
        }
      },
      "required": ["user_id"]
    },
    "action": {
      "type": "select",
      "table": "users",
      "columns": ["id", "name", "email", "created_at"],
      "filters": {"id": "{{user_id}}"},
      "single": true
    }
  }
]
```

### 4.2 Import Configuration

**Screenshot Placeholder:** *Configuration import interface*

```
┌─────────────────────────────────────────────┐
│ 📥 Import AI-Generated Configuration       │
├─────────────────────────────────────────────┤
│                                             │
│ Paste your AI-generated JSON below:        │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [                                       │ │
│ │   {                                     │ │
│ │     "name": "get-user-profile",         │ │
│ │     "description": "Fetch user...",     │ │
│ │     ...                                 │ │
│ │   }                                     │ │
│ │ ]                                       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ✅ Valid JSON detected                      │
│ ✅ 8 tools found                            │
│ ✅ All schemas validated                    │
│                                             │
│         [ Import Configuration ]            │
└─────────────────────────────────────────────┘
```

**Validation Checks:**
- ✅ **JSON Syntax:** Valid JSON structure
- ✅ **Schema Validation:** Proper tool schema format
- ✅ **Required Fields:** All mandatory fields present
- ✅ **Security Check:** No obvious security issues
- ⚠️ **Warnings:** Non-critical issues that should be reviewed

### 4.3 Review Imported Tools

**Tool Overview Dashboard:**

```
┌─────────────────────────────────────────────┐
│ 🛠️ Imported Tools Summary                  │
├─────────────────────────────────────────────┤
│                                             │
│ ✅ get-user-profile          [SELECT]       │
│ ✅ create-user               [INSERT]       │
│ ✅ update-user-profile       [UPDATE]       │
│ ✅ list-posts               [SELECT]        │
│ ✅ create-post              [INSERT]        │
│ ✅ search-content           [RPC]           │
│ ✅ send-notification        [EDGE-FUNC]     │
│ ⚠️ delete-user              [DELETE]        │
│                                             │
│ Total: 8 tools                              │
│ Ready: 7 tools                              │
│ Warnings: 1 tool (review recommended)      │
└─────────────────────────────────────────────┘
```

**Common Warnings:**
- ⚠️ **Delete operations:** Review for safety measures
- ⚠️ **Missing RLS:** Tools accessing tables without Row Level Security
- ⚠️ **Sensitive data:** Tools that might expose personal information
- ⚠️ **Missing validations:** Parameters without proper constraints

---

## 🧪 Step 5: Testing Your Tools

### 5.1 Enter Testing Environment

**Click "Test Tools"** to open the interactive testing interface.

**Screenshot Placeholder:** *Testing interface with tool selector and form*

**Testing Interface Layout:**
```
┌────────────────┬──────────────────────────────┐
│                │                              │
│   Tool List    │        Testing Area          │
│                │                              │
│ 🔍 Search      │  ┌─────────────────────────┐ │
│                │  │                         │ │
│ ✅ get-user... │  │    Parameter Form       │ │
│ ✅ create-user │  │                         │ │
│ ✅ list-posts  │  │  User ID: [_______]     │ │
│ ✅ search...   │  │                         │ │
│                │  │  [ Execute Tool ]       │ │
│                │  └─────────────────────────┘ │
│                │                              │
│                │  Response:                   │
│                │  ┌─────────────────────────┐ │
│                │  │ { "id": "123", ...}     │ │
│                │  └─────────────────────────┘ │
└────────────────┴──────────────────────────────┘
```

### 5.2 Test Individual Tools

**For each tool you want to test:**

1. **Select tool** from the left sidebar
2. **Fill in parameters** using the auto-generated form
3. **Click "Execute Tool"**
4. **Review the response**

**Example: Testing `get-user-profile`**

```
┌─────────────────────────────────────────────┐
│ 🧪 Testing: get-user-profile                │
├─────────────────────────────────────────────┤
│                                             │
│ Parameters:                                 │
│                                             │
│ User ID: *                                  │
│ ┌─────────────────────────────────────────┐ │
│ │ 550e8400-e29b-41d4-a716-446655440000    │ │
│ └─────────────────────────────────────────┘ │
│ UUID of the user to fetch                  │
│                                             │
│           [ Execute Tool ]                  │
│                                             │
│ ✅ Success (Response time: 143ms)           │
│                                             │
│ Response:                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ {                                       │ │
│ │   "id": "550e8400-e29b-41d4-a716...",   │ │
│ │   "name": "John Doe",                   │ │
│ │   "email": "john@example.com",          │ │
│ │   "created_at": "2024-01-15T10:30:00Z" │ │
│ │ }                                       │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 5.3 Common Testing Scenarios

**Test Different User Scenarios:**

**Scenario 1: Valid Data**
- Use existing user IDs from your database
- Test with different parameter combinations
- Verify expected responses

**Scenario 2: Invalid Data**
- Try non-existent IDs
- Use malformed data (invalid UUIDs, etc.)
- Verify error handling

**Scenario 3: Edge Cases**
- Empty parameters where optional
- Maximum/minimum values
- Special characters in string fields

**Scenario 4: Security Testing**
- Test RLS policies (try accessing other users' data)
- Verify authentication requirements
- Check permission boundaries

### 5.4 Understanding Test Results

**Success Response:**
```json
✅ Status: Success (200ms)
{
  "data": [
    { "id": 1, "title": "My Post", "content": "..." }
  ],
  "count": 1
}
```

**Error Response:**
```json
❌ Status: Error (89ms)
{
  "error": "Row Level Security policy violation",
  "code": "42501",
  "message": "new row violates row-level security policy for table \"posts\""
}
```

**Performance Metrics:**
- ⚡ **Response Time:** Typically 50-300ms for simple queries
- 📊 **Success Rate:** Track success vs error rate
- 🔄 **Test Count:** Number of successful tests run

---

## 🔧 Step 6: Configuration Refinement

### 6.1 Edit Tool Configurations

**If you encounter issues during testing:**

1. **Click "Edit Configuration"** in the testing interface
2. **Select the problematic tool**
3. **Modify the configuration** using the JSON editor
4. **Test the changes** immediately

**Screenshot Placeholder:** *Configuration editor with validation*

**Common Configuration Fixes:**

**Fix 1: Add Missing Columns**
```json
// Before
"columns": ["id", "name"]

// After
"columns": ["id", "name", "email", "created_at"]
```

**Fix 2: Fix Filter Syntax**
```json
// Before (broken)
"filters": {"user_id": "{{userId}}"}

// After (fixed)
"filters": {"user_id": "{{user_id}}"}
```

**Fix 3: Add Proper Ordering**
```json
// Add to action
"orderBy": [
  {"column": "created_at", "direction": "desc"}
]
```

### 6.2 Real-time Validation

**As you edit configurations:**
- ✅ **Syntax highlighting** for JSON
- ✅ **Real-time validation** with error messages
- ✅ **Auto-completion** for known fields
- ✅ **Schema validation** against MCP standards

**Validation Indicators:**
- 🟢 **Green:** Valid configuration
- 🟡 **Yellow:** Warnings (will work but not optimal)
- 🔴 **Red:** Errors (will not work)

### 6.3 Test-Edit-Refine Cycle

**Recommended workflow:**
1. **Test tool** → Identify issue
2. **Edit configuration** → Fix the problem
3. **Re-test immediately** → Verify fix
4. **Repeat** until all tools work correctly

This rapid iteration cycle helps you perfect your configuration quickly.

---

## 📦 Step 7: Export Final Configuration

### 7.1 Final Validation

**Before exporting, SupaMCP performs a comprehensive check:**

```
┌─────────────────────────────────────────────┐
│ ✅ Final Configuration Validation           │
├─────────────────────────────────────────────┤
│                                             │
│ ✅ All tools have valid schemas              │
│ ✅ No security vulnerabilities detected     │
│ ✅ All required fields present              │
│ ✅ Template variables properly defined      │
│ ✅ Action configurations validated          │
│ ⚠️ 1 warning: Delete operation detected    │
│                                             │
│ Status: Ready for export                    │
└─────────────────────────────────────────────┘
```

### 7.2 Choose Export Format

**Available Export Options:**

**Option 1: Tools Configuration Only**
```json
// Just the tools array for existing MCP servers
[
  {
    "name": "get-user-profile",
    "description": "...",
    "parameters": {...},
    "action": {...}
  }
]
```

**Option 2: Complete MCP Server Configuration**
```json
// Full server config ready to deploy
{
  "supabase": {
    "url": "{{SUPABASE_URL}}",
    "anonKey": "{{SUPABASE_ANON_KEY}}"
  },
  "tools": [...],
  "server": {
    "name": "SupaMCP Server",
    "version": "1.0.0"
  }
}
```

**Option 3: Package with Dependencies**
- Complete Node.js project structure
- Package.json with all dependencies
- Environment configuration template
- README with setup instructions

### 7.3 Download and Setup Instructions

**After clicking "Export Configuration":**

1. **Download** the generated files
2. **Follow setup instructions** for your chosen format
3. **Configure environment variables**
4. **Test the deployed MCP server**

**Setup Instructions Example:**
```bash
# For complete server package
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm start
```

---

## 🚀 Step 8: Deploy and Use Your MCP Tools

### 8.1 Using with Claude Desktop

**Add to your Claude Desktop MCP configuration:**

1. **Open Claude Desktop settings**
2. **Navigate to MCP section**
3. **Add your server configuration:**

```json
{
  "mcpServers": {
    "supabase-tools": {
      "command": "node",
      "args": ["path/to/your/server.js"],
      "env": {
        "SUPABASE_URL": "your-project-url",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

**Test in Claude:**
```
Can you fetch the user profile for ID 123?
```

### 8.2 Using with Cursor

**In your Cursor project:**
1. **Add MCP configuration** to your project
2. **Install dependencies** from the exported package
3. **Configure environment variables**
4. **Test tools** in the Cursor chat interface

### 8.3 Using with Bolt

**Deploy to StackBlitz:**
1. **Upload** the exported configuration
2. **Install dependencies** automatically
3. **Configure** environment in StackBlitz settings
4. **Test** immediately in the browser

---

## 🔧 Troubleshooting Common Issues

### Connection Issues

**Problem:** "Failed to connect to Supabase"
**Solutions:**
- ✅ Verify URL format (must include https://)
- ✅ Check API key (use anon key, not service role)
- ✅ Confirm project is not paused
- ✅ Check network connectivity

### Authentication Errors

**Problem:** "Authentication required"
**Solutions:**
- ✅ Verify RLS policies allow anonymous access
- ✅ Check if tables require authentication
- ✅ Review security policies in Supabase

### Tool Execution Failures

**Problem:** "Tool execution failed"
**Solutions:**
- ✅ Verify column names exist in database
- ✅ Check parameter types match schema
- ✅ Ensure required parameters are provided
- ✅ Review RLS policies for the operation

### Performance Issues

**Problem:** "Slow response times"
**Solutions:**
- ✅ Add database indexes for queried columns
- ✅ Limit result sets with pagination
- ✅ Optimize complex queries
- ✅ Use appropriate Supabase plan for your usage

---

## 🎯 Best Practices & Tips

### Security Best Practices

1. **Always enable RLS** on tables with user data
2. **Use least privilege** - only expose necessary operations
3. **Validate all inputs** using JSON Schema constraints
4. **Monitor usage** and set up appropriate limits
5. **Regular security reviews** of exposed functionality

### Performance Optimization

1. **Add database indexes** for frequently queried columns
2. **Use pagination** for list operations
3. **Limit column selection** to necessary fields only
4. **Cache frequent queries** when appropriate
5. **Monitor query performance** in Supabase dashboard

### Development Workflow

1. **Start small** - begin with read-only operations
2. **Test thoroughly** before deploying
3. **Version your configurations** for rollback capability
4. **Document your tools** for team members
5. **Monitor production usage** and error rates

### Team Collaboration

1. **Share configurations** via version control
2. **Document custom business logic** in function descriptions
3. **Use consistent naming conventions**
4. **Review security implications** as a team
5. **Establish deployment procedures**

---

## 📞 Support & Resources

### Getting Help

- **GitHub Issues:** Report bugs and request features
- **Documentation:** Comprehensive guides and examples
- **Community Discord:** Connect with other users
- **Stack Overflow:** Tagged questions and answers

### Additional Resources

- **Supabase Documentation:** Understanding RLS and database design
- **MCP Specification:** Official Model Context Protocol docs
- **Example Configurations:** Pre-built configurations for common use cases
- **Video Tutorials:** Step-by-step video guides

### Contributing

- **Bug Reports:** Help improve the tool
- **Feature Requests:** Suggest new functionality
- **Configuration Sharing:** Share your successful configurations
- **Documentation:** Help improve these guides

---

## 🎉 Congratulations!

You've successfully created and deployed your MCP tool configuration! Your AI assistants can now interact directly with your Supabase database using the tools you've configured.

**What's Next?**
- Explore advanced MCP features
- Build more complex tools
- Share your configuration with the community
- Monitor and optimize performance

**Happy building!** 🚀 