# One Prompt

[![npm version](https://badge.fury.io/js/oneprompt.svg)](https://badge.fury.io/js/oneprompt)
[![tests passing: 26/26](https://img.shields.io/badge/tests%20passing-26/26-blue.svg)](https://opensource.org/licenses/MIT)

**A super framework for prompt engineering.**

An XML-based framework for defining, managing, and validating AI/LLM prompts in a structured way.

It brings software engineering principles to prompt engineering by providing a robust system for variable handling, conditional logic, and modular prompt design.

Whether you're building complex AI applications or managing a library of prompts, One Prompt helps ensure consistency, maintainability, and reliability in your prompt engineering workflow.

## Features

- 🎯 XML-first prompt definition with clear structure and validation
- 💡 Rich variable system with required/optional fields and default values
- 🔄 Conditional content rendering based on variable values
- 🧩 Reusable content parts for modular prompt design
- ✅ Built-in validation for prompts and variables
- 📝 Metadata support for documentation and organization
- 🚀 Simple API for parsing and rendering prompts
- 🛡️ Full TypeScript support with comprehensive type definitions

## Installation

```bash
# Using npm
npm install oneprompt

# Using yarn
yarn add oneprompt

# Using pnpm
pnpm add oneprompt

# Using bun
bun add oneprompt
```

## Quick Start

```xml
<!-- Basic metadata about the prompt -->
<metadata>
  <title>Support Request</title>
</metadata>

<!-- Variable definitions with required/optional flags -->
<variables>
  <var name="issue_category" required="true" />
</variables>

<!-- Main template with conditional logic and variable placeholders -->
<template>
Thank you for contacting support regarding your {{issue_category}} issue.

Our team strives to provide timely and effective solutions. Here's what you can expect:

<oneprompt:if var="issue_category" equals="billing" show="billing_info" />

We'll be in touch within 24-48 hours with a detailed response.

Best regards,
Support Team
</template>

<!-- Reusable content parts referenced by conditionals -->
<part name="billing_info">
For billing-related inquiries, please have your latest invoice and account number ready.
</part>
```

```typescript
import { OnePrompt } from 'oneprompt';

const prompt = ...; // your XML prompt or prompt object

const rendered = OnePrompt.renderWithVariables(prompt, {
  name: "John",
  style: "casual"
});
// Output: "Hey John!"
```

## Core Concepts

### Metadata

The metadata section defines information about the prompt itself:

```xml
<metadata>
  <title>Customer Response</title>
  <description>Template for customer inquiries</description>
  <team>Support</team>
</metadata>
```

### Variables

Variables are placeholders that get replaced with actual values.
They can be:
- **Required**: Must be provided when rendering
- **Optional**: Can have default values

```xml
<variables>
  <var name="customer_name" required="true" />
  <var name="priority" required="false">normal</var>
  <var name="response_type" required="false">standard</var>
</variables>
```

### Template

The main content with variable placeholders and conditional logic:

```xml
<template>
Dear {{customer_name}},

<oneprompt:if var="priority" equals="high" show="urgent_response" else="standard_response" />

Best regards,
Support Team
</template>
```

### Parts

Reusable content blocks that can be referenced in conditionals:

```xml
<part name="urgent_response">
We have marked your case as high priority and assigned a dedicated specialist...
</part>
<part name="standard_response">
Thank you for your inquiry. We will process your request...
</part>
```

## API Reference

### OnePrompt Class

#### `parseFromXml(xml: string): Prompt`
Parses an XML string into a validated Prompt object.

```typescript
// Basic usage
const xml = `
<metadata>
  <title>Customer Greeting</title>
</metadata>
<variables>
  <var name="name" required="true" />
  <var name="language" required="false">english</var>
</variables>
<template>
  <oneprompt:if var="language" equals="spanish" show="spanish_greeting" else="english_greeting" />
  {{name}}!
</template>
<part name="spanish_greeting">¡Hola</part>
<part name="english_greeting">Hello</part>
`;

try {
  const prompt = OnePrompt.parseFromXml(xml);
  console.log(prompt);
  // {
  //   metadata: { title: "Customer Greeting" },
  //   variables: [
  //     { name: "name", required: true },
  //     { name: "language", required: false, default: "english" }
  //   ],
  //   template: "...",
  //   parts: [...]
  // }
} catch (error) {
  if (error instanceof OnePromptError) {
    console.error("Invalid prompt XML:", error.message);
  }
}
```

#### `convertToXml(prompt: Prompt): string`
Converts a Prompt object back to XML format.

```typescript
const prompt: Prompt = {
  metadata: {
    title: "Meeting Request",
    author: "Support Team"
  },
  variables: [
    { name: "requester", required: true },
    { name: "time", required: false, default: "tomorrow" }
  ],
  template: "Meeting requested by {{requester}} for {{time}}",
  parts: []
};

try {
  const xml = OnePrompt.convertToXml(prompt);
  console.log(xml);
  // <metadata>
  //   <title>Meeting Request</title>
  //   <author>Support Team</author>
  // </metadata>
  // <variables>
  //   <var name="requester" required="true" />
  //   <var name="time" required="false">tomorrow</var>
  // </variables>
  // <template>Meeting requested by {{requester}} for {{time}}</template>
} catch (error) {
  console.error("Conversion failed:", error.message);
}
```

#### `validate(prompt: Prompt): void`
Validates a prompt's structure and relationships.

```typescript
const prompt: Prompt = {
  metadata: { title: "Email Template" },
  variables: [
    { name: "recipient", required: true },
    { name: "tone", required: false, default: "formal" }
  ],
  template: `
    <oneprompt:if var="tone" equals="formal" show="formal_greeting" else="casual_greeting" />
    {{recipient}},

    {{message}} // This will cause validation error - 'message' not defined
  `,
  parts: [
    { name: "formal_greeting", content: "Dear" },
    { name: "casual_greeting", content: "Hi" }
  ]
};

try {
  OnePrompt.validate(prompt);
} catch (error) {
  if (error instanceof OnePromptError) {
    // Error: "Variable 'message' used in template but not declared"
    console.error(error.message);
  }
}
```

#### `renderWithVariables(source: string | Prompt, variables: PromptInputVariables): string`
Processes a prompt with provided variables to create final output.

```typescript
// Using prompt object
const prompt: Prompt = {
  metadata: { title: "Support Response" },
  variables: [
    { name: "ticket_id", required: true },
    { name: "priority", required: false, default: "normal" }
  ],
  template: `
    Ticket #{{ticket_id}}
    <oneprompt:if var="priority" equals="high" show="urgent_notice" />
  `,
  parts: [
    { name: "urgent_notice", content: "URGENT: Requires immediate attention" }
  ]
};

// Success case
try {
  const output1 = OnePrompt.renderWithVariables(prompt, {
    ticket_id: "T-123",
    priority: "high"
  });
  console.log(output1);
  // Ticket #T-123
  // URGENT: Requires immediate attention

  const output2 = OnePrompt.renderWithVariables(prompt, {
    ticket_id: "T-456"
  });
  console.log(output2);
  // Ticket #T-456
  // (no urgent notice because priority is "normal" by default)
} catch (error) {
  console.error("Render failed:", error.message);
}

// Error case - missing required variable
try {
  OnePrompt.renderWithVariables(prompt, {
    priority: "high"
    // Missing ticket_id
  });
} catch (error) {
  // Error: "Missing required variable: ticket_id"
  console.error(error.message);
}
```

### OnePromptUtils Class

#### `extractTemplateVariables(template: string): string[]`
Extracts variable names from a template string.

```typescript
const template = `
  Dear {{recipient}},

  Your order #{{order_id}} has been {{status}}.
  <oneprompt:if var="tracking_number" equals="available" show="tracking_info" />
`;

const variables = OnePromptUtils.extractTemplateVariables(template);
console.log(variables);
// ["recipient", "order_id", "status"]
```

#### `validateAndProcessVariables(promptVars: PromptVariable[], inputVars: PromptInputVariables): PromptInputVariables`
Validates input variables against specifications and applies defaults.

```typescript
const promptVariables: PromptVariable[] = [
  { name: "user", required: true },
  { name: "role", required: false, default: "viewer" },
  { name: "team", required: false, default: "general" }
];

// Success case - with defaults
const processed1 = OnePromptUtils.validateAndProcessVariables(
  promptVariables,
  { user: "john.doe" }
);
console.log(processed1);
// {
//   user: "john.doe",
//   role: "viewer",
//   team: "general"
// }

// Success case - override defaults
const processed2 = OnePromptUtils.validateAndProcessVariables(
  promptVariables,
  { user: "jane.doe", role: "admin", team: "engineering" }
);
console.log(processed2);
// {
//   user: "jane.doe",
//   role: "admin",
//   team: "engineering"
// }

// Error case - missing required
try {
  OnePromptUtils.validateAndProcessVariables(
    promptVariables,
    { role: "admin" } // Missing required 'user'
  );
} catch (error) {
  console.error(error.message); // "Missing required variable: user"
}
```

#### `substituteTemplateVariables(template: string, variables: PromptInputVariables): string`
Replaces variable placeholders with their values.

```typescript
const template = `
  Project: {{project_name}}
  Owner: {{owner}}
  Status: {{status}}
  {{#if has_description}}
  Description: {{description}}
  {{/if}}
`;

const result = OnePromptUtils.substituteTemplateVariables(
  template,
  {
    project_name: "OnePrompt",
    owner: "DevTeam",
    status: "Active",
    // description not provided
  }
);

console.log(result);
// Project: OnePrompt
// Owner: DevTeam
// Status: Active
// {{#if has_description}}
// Description: {{description}}
// {{/if}}
```

#### `processConditionals(template: string, variables: PromptInputVariables, parts: PromptPart[]): string`
Processes conditional expressions and includes appropriate parts.

```typescript
const template = `
  <oneprompt:if var="access_level" equals="admin" show="admin_actions" else="user_actions" />

  <oneprompt:if var="has_notifications" equals="true" show="notification_panel" />
`;

const variables = {
  access_level: "admin",
  has_notifications: "true"
};

const parts: PromptPart[] = [
  {
    name: "admin_actions",
    content: "- Create User\n- Delete User\n- Modify Settings"
  },
  {
    name: "user_actions",
    content: "- View Profile\n- Update Settings"
  },
  {
    name: "notification_panel",
    content: "You have new notifications!"
  }
];

const processed = OnePromptUtils.processConditionals(
  template,
  variables,
  parts
);

console.log(processed);
// - Create User
// - Delete User
// - Modify Settings
//
// You have new notifications!
```

## Background & Goal

As AI and LLM applications become more complex, managing prompts as simple strings becomes increasingly error-prone and difficult to maintain. We needed a way to:

- Treat prompts as proper interfaces between humans/applications and AI models
- Enable documentation of prompts
- Validate prompt variables before runtime to catch errors early
- Make prompts reusable and composable across different contexts
- Provide clear separation between prompt logic and variable data

The XML-based approach was chosen to provide a clear structure while maintaining readability and allowing for metadata and validation rules to live alongside the prompt template itself. This makes prompts self-documenting and enables better collaboration between prompt engineers, developers, and other stakeholders.

One Prompt aims to bring software engineering best practices to prompt engineering while keeping the developer experience simple and intuitive.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

For bugs and feature requests, please open an issue.

## License

MIT
