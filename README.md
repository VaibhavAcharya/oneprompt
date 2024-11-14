# One Prompt

A library that brings structure, validation, and reliability to prompt engineering.

## Features

- **XML-based Template Definition** — Clear, structured, and self-documenting
- **Variable Management** — Handle required and optional variables with defaults easily
- **Robust Error Handling** — Clear, actionable error messages
- **Zero-Loss Serialization** — Perfect round-trips between parse and serialize
- **Type-Safe API** — Full TypeScript support

## Installation

```bash
npm install oneprompt
# or
yarn add oneprompt
# or
pnpm add oneprompt
# or
bun add oneprompt
```

### Quick Start

```typescript
import { OnePrompt } from 'oneprompt';

// this could also be Prompt object, check render API reference for more details
const promptXmlString = `
<?xml version="1.0" encoding="UTF-8"?>
<metadata>
  <title>AI Assistant</title>
  <some_meta>xyz</some_meta>
</metadata>

<variables>
  <var name="name" required="true" />
  <var name="expertise" required="false">general knowledge</var>
</variables>

<template>
You are an AI assistant specialized in {{expertise}}.
Your user's name is {{name}}.

<note>tags inside template are not processed.</note>

</template>
`;

const rendered = OnePrompt.render(promptXmlString, {
  name: "Alice",
  expertise: "quantum physics" // optional
});
```

## Creating Prompts

Prompts in One Prompt are build using XML and consist of three main sections:

#### 1. Metadata
```xml
<metadata>
  <title>My Prompt</title>
  <description>Optional description</description>
  <!-- Add any custom metadata -->
</metadata>
```

#### 2. Variables
```xml
<variables>
  <var name="user" required="true" />
  <var name="mode" required="false">friendly</var>
</variables>
```

#### 3. Template
```xml
<template>
Hello {{user}}! I'll be {{mode}} in our interaction.
<note>tags inside template are not processed.</note>
</template>
```

## API Reference

### `OnePrompt` Class

#### Static Methods

##### `validate(prompt: Prompt): void`
Validates a prompt structure

```typescript
const prompt = {
  metadata: {
    title: "Test Prompt"
  },
  variables: [
    { name: "user", required: true },
    { name: "style", required: false, default: "casual" }
  ],
  template: "Hello {{user}}, this is a {{style}} message."
};

try {
  OnePrompt.validate(prompt); // Will throw if invalid
} catch (error) {
  console.error(error);
}
```

##### `parse(xml: string): Prompt`
Parses an XML string into a Prompt object

```typescript
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
  <title>Greeting Prompt</title>
</metadata>
<variables>
  <var name="name" required="true" />
  <var name="time" required="false">morning</var>
</variables>
<template>
Good {{time}}, {{name}}!
</template>`;

const prompt = OnePrompt.parse(xml);
console.log(prompt);
/* Output:
{
  metadata: { title: "Greeting Prompt" },
  variables: [
    { name: "name", required: true },
    { name: "time", required: false, default: "morning" }
  ],
  template: "Good {{time}}, {{name}}!"
}
*/
```

##### `serialize(prompt: Prompt): string`
Serializes a Prompt object to XML

```typescript
const prompt = {
  metadata: {
    title: "Math Question",
    subject: "Algebra"
  },
  variables: [
    { name: "difficulty", required: false, default: "medium" },
    { name: "topic", required: true }
  ],
  template: "Generate a {{difficulty}} question about {{topic}}."
};

const xml = OnePrompt.serialize(prompt);
console.log(xml);
/* Output:
<?xml version="1.0" encoding="UTF-8"?>
<metadata>
  <title>Math Question</title>
  <subject>Algebra</subject>
</metadata>
<variables>
  <var name="difficulty" required="false">medium</var>
  <var name="topic" required="true"/>
</variables>
<template>
Generate a {{difficulty}} question about {{topic}}.
</template>
*/
```

##### `render(source: string | Prompt, variables: PromptInputVariables): string`
Renders a prompt with provided variables

```typescript
// Using a Prompt object
const prompt = {
  metadata: { title: "Greeting" },
  variables: [
    { name: "name", required: true },
    { name: "emoji", required: false, default: "👋" }
  ],
  template: "Hello {{name}}! {{emoji}}"
};

const rendered = OnePrompt.render(prompt, {
  name: "Alice"
});

console.log(rendered); // Output: "Hello Alice! 👋"

// Using XML string
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
  <title>Question</title>
</metadata>
<variables>
  <var name="subject" required="true"/>
  <var name="level" required="false">beginner</var>
</variables>
<template>
Please explain {{subject}} at a {{level}} level.
</template>`;

const rendered2 = OnePrompt.render(xml, {
  subject: "quantum computing",
  level: "advanced"
});

console.log(rendered2);
// Output: "Please explain quantum computing at a advanced level."
```

## Best Practices

- Avoid indentation in the `<template>` section as it will be preserved in output
- Use `snake_case` for variable names
- Use descriptive metadata for better prompt management
- Use comments in XML to document complex prompts

## Background

As AI and LLM applications become more complex, managing prompts as simple strings becomes increasingly error-prone and difficult to maintain. We needed a way to:

- Treat prompts as proper interfaces between humans/applications and AI models
- Enable documentation of prompts
- Validate prompt variables before runtime to catch errors early
- Make prompts reusable and composable across different contexts
- Provide clear separation between prompt logic and variable data

The XML-based approach was chosen to provide a clear structure while maintaining readability and allowing for metadata and validation rules to live alongside the prompt template itself. This makes prompts self-documenting and enables better collaboration between prompt engineers, developers, and other stakeholders.

One Prompt aims to bring software engineering best practices to prompt engineering while keeping the developer experience simple and intuitive.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
