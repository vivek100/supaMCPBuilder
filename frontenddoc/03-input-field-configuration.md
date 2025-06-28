# MCP Tool Input Field Configuration Guide

## 🎯 Overview

This guide explains how to configure input fields for testing MCP tools based on the actual configuration structure used in the SupaMCP server. The input fields are generated from the `parameters` property in each tool configuration, not from a separate `inputSchema`.

## 📋 Actual Configuration Structure

### Real MCP Tool Configuration Format
```json
{
  "name": "tool-name",
  "description": "Tool description",
  "parameters": {
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "description": "Field description",
        "default": "default_value"
      }
    },
    "required": ["field_name"]
  },
  "action": {
    "type": "select",
    "table": "table_name",
    "columns": ["column1", "column2"],
    "filters": {"column": "{{field_name}}"}
  }
}
```

### Key Points
1. **`parameters`** contains the JSON Schema for form generation (NOT `inputSchema`)
2. **Template variables** in `action` use `{{field_name}}` syntax
3. **Required fields** are defined in `parameters.required` array
4. **Field types** determine the UI component used

## 🛠️ Field Type Configuration

### 1. String Fields

#### Basic String Input
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "project_name": {
        "type": "string",
        "description": "Name of the project",
        "maxLength": 200,
        "minLength": 1
      }
    },
    "required": ["project_name"]
  }
}
```

**Generates:** Text input field with validation

#### String with Enum (Dropdown)
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "description": "Project status",
        "enum": ["pending", "in_progress", "completed"],
        "default": "pending"
      }
    }
  }
}
```

**Generates:** Dropdown/select field with predefined options

#### String with Pattern Validation
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "project_id": {
        "type": "string",
        "description": "UUID of the project",
        "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
      }
    }
  }
}
```

**Generates:** Text input with pattern validation

### 2. Number Fields

#### Basic Number Input
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "limit": {
        "type": "number",
        "description": "Number of items to return",
        "default": 10,
        "minimum": 1,
        "maximum": 100
      }
    }
  }
}
```

**Generates:** Number input with min/max validation

#### Integer with Step
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "offset": {
        "type": "number",
        "description": "Number of items to skip",
        "default": 0,
        "minimum": 0,
        "multipleOf": 1
      }
    }
  }
}
```

**Generates:** Integer input (step=1)

### 3. Date Fields

#### Date Input
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "due_date": {
        "type": "string",
        "description": "Due date in YYYY-MM-DD format",
        "format": "date"
      }
    }
  }
}
```

**Generates:** Date picker input

### 4. Array Fields

#### Array of Strings
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "roles": {
        "type": "array",
        "description": "User roles involved",
        "items": {
          "type": "string"
        }
      }
    }
  }
}
```

**Generates:** Multi-input field or tag input

### 5. Object Fields

#### JSON Object Input
```json
{
  "parameters": {
    "type": "object",
    "properties": {
      "metadata": {
        "type": "object",
        "description": "Additional metadata as JSON"
      }
    }
  }
}
```

**Generates:** JSON editor or textarea with JSON validation

## 🔄 Dynamic Form Generation Implementation

### Configuration Parser
```typescript
interface MCPToolConfig {
  name: string;
  description: string;
  parameters: JSONSchema7;  // This is the correct property name
  action: ToolAction;
}

class FormFieldGenerator {
  static generateFields(parameters: JSONSchema7): FormField[] {
    const fields: FormField[] = [];
    
    if (parameters.properties) {
      Object.entries(parameters.properties).forEach(([fieldName, schema]) => {
        if (typeof schema === 'object') {
          fields.push({
            name: fieldName,
            type: schema.type || 'string',
            description: schema.description,
            required: parameters.required?.includes(fieldName) || false,
            default: schema.default,
            enum: schema.enum,
            minimum: schema.minimum,
            maximum: schema.maximum,
            maxLength: schema.maxLength,
            minLength: schema.minLength,
            pattern: schema.pattern,
            format: schema.format
          });
        }
      });
    }
    
    return fields;
  }
}
```

### Form Field Rendering
```typescript
const DynamicFormField: React.FC<{
  field: FormField;
  value: any;
  onChange: (value: any) => void;
}> = ({ field, value, onChange }) => {
  
  // String with enum = Dropdown
  if (field.type === 'string' && field.enum) {
    return (
      <Select value={value || field.default || ''} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${field.name}`} />
        </SelectTrigger>
        <SelectContent>
          {field.enum.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  
  // Date format = Date picker
  if (field.type === 'string' && field.format === 'date') {
    return (
      <Input
        type="date"
        value={value || field.default || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  
  // Number = Number input
  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={value || field.default || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        min={field.minimum}
        max={field.maximum}
        step={field.multipleOf || 1}
      />
    );
  }
  
  // Array = Multi-input
  if (field.type === 'array') {
    return (
      <ArrayInput
        value={value || []}
        onChange={onChange}
        itemType={field.items?.type || 'string'}
      />
    );
  }
  
  // Object = JSON editor
  if (field.type === 'object') {
    return (
      <Textarea
        value={value ? JSON.stringify(value, null, 2) : '{}'}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
          } catch (error) {
            // Handle invalid JSON
          }
        }}
        className="font-mono"
        rows={6}
      />
    );
  }
  
  // Default: String input
  return (
    <Input
      type="text"
      value={value || field.default || ''}
      onChange={(e) => onChange(e.target.value)}
      maxLength={field.maxLength}
      pattern={field.pattern}
      placeholder={field.description}
    />
  );
};
```

## 📝 Real Examples from Configuration

### Example 1: Project Creation Tool
```json
{
  "name": "create-project",
  "description": "Create a new project",
  "parameters": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "description": "Project name (max 200 characters)",
        "maxLength": 200,
        "minLength": 1
      },
      "description": {
        "type": "string", 
        "description": "Project description",
        "maxLength": 1000
      },
      "current_version": {
        "type": "string",
        "description": "Initial version identifier",
        "default": "1.0.0"
      }
    },
    "required": ["name", "description"]
  },
  "action": {
    "type": "insert",
    "table": "projects",
    "values": {
      "name": "{{name}}",
      "description": "{{description}}",
      "current_version": "{{current_version}}"
    }
  }
}
```

**Generated Form:**
- **Name**: Required text input (max 200 chars)
- **Description**: Required textarea (max 1000 chars)  
- **Current Version**: Optional text input (default: "1.0.0")

### Example 2: List Projects Tool
```json
{
  "name": "list-user-projects",
  "description": "List projects with pagination",
  "parameters": {
    "type": "object",
    "properties": {
      "limit": {
        "type": "number",
        "description": "Number of projects to return (1-50)",
        "default": 10,
        "minimum": 1,
        "maximum": 50
      },
      "offset": {
        "type": "number",
        "description": "Number of projects to skip",
        "default": 0,
        "minimum": 0
      }
    }
  },
  "action": {
    "type": "select",
    "table": "projects",
    "limit": "{{limit}}",
    "offset": "{{offset}}"
  }
}
```

**Generated Form:**
- **Limit**: Number input (1-50, default: 10)
- **Offset**: Number input (min: 0, default: 0)

### Example 3: Filter with Enum
```json
{
  "name": "list-todos",
  "description": "List todos with filtering",
  "parameters": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "description": "Filter by todo status",
        "enum": ["pending", "in_progress", "completed"]
      },
      "priority": {
        "type": "string",
        "description": "Filter by priority level", 
        "enum": ["low", "medium", "high"]
      }
    }
  },
  "action": {
    "type": "select",
    "table": "todos",
    "advancedFilters": [
      {"column": "status", "operation": "eq", "value": "{{status}}"},
      {"column": "priority", "operation": "eq", "value": "{{priority}}"}
    ]
  }
}
```

**Generated Form:**
- **Status**: Dropdown (pending, in_progress, completed)
- **Priority**: Dropdown (low, medium, high)

## 🔗 Template Variable Mapping

### How Variables Work
1. **Define in parameters**: `"project_id": {"type": "string"}`
2. **Use in action**: `"filters": {"id": "{{project_id}}"}`
3. **User fills form**: Input field for "project_id"
4. **Template resolution**: `{{project_id}}` gets replaced with user input
5. **Supabase execution**: Final query uses actual value

### Variable Resolution Process
```typescript
class TemplateResolver {
  static resolveAction(action: ToolAction, formData: Record<string, any>): ToolAction {
    const resolved = JSON.parse(JSON.stringify(action));
    
    return this.replaceVariables(resolved, formData);
  }
  
  private static replaceVariables(obj: any, data: Record<string, any>): any {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return data[varName] !== undefined ? data[varName] : match;
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariables(item, data));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.replaceVariables(value, data);
      }
      return resolved;
    }
    
    return obj;
  }
}
```

## ✅ Implementation Checklist

### For AI Implementation:
1. ✅ Parse `parameters` property (not `inputSchema`)
2. ✅ Generate form fields based on JSON Schema types
3. ✅ Handle required vs optional fields
4. ✅ Implement field validation (min/max, pattern, etc.)
5. ✅ Support all field types (string, number, array, object, enum)
6. ✅ Template variable resolution in actions
7. ✅ Form submission and validation
8. ✅ Error handling for invalid inputs

### Testing Considerations:
- Test with and without default values
- Validate required field enforcement  
- Test template variable replacement
- Verify field type rendering
- Check validation rules (min/max, pattern)
- Test enum dropdown functionality
- Validate array and object input handling

This configuration approach ensures that the testing tool accurately reflects the actual MCP server configuration structure and provides a seamless testing experience. 