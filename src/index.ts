import { XMLBuilder, XMLParser } from "fast-xml-parser";

/**
 * Core types for the OnePrompt library
 */

/**
 * Metadata about a prompt definition
 * @property title - Required title of the prompt
 * @property [key: string] - Additional string metadata fields that can be undefined
 *
 * @example
 * ```ts
 * const metadata: PromptMetadata = {
 *   title: "My Prompt",
 *   description: "A simple prompt",
 * };
 * ```
 */
export type PromptMetadata = {
  title: string;
  [key: string]: string | undefined;
};

/**
 * Describes a variable that can be used in a prompt template
 * @property name - The name of the variable
 * @property required - Whether the variable is required
 * @property default - Default value if variable not provided
 *
 * @example
 * ```ts
 * const variable: PromptVariable = {
 *   name: "greeting",
 *   required: false,
 *   default: "Hello"
 * };
 * ```
 */
export type PromptVariable = { name: string } & (
  | {
      required: true;
      default?: undefined;
    }
  | {
      required: false;
      default: string;
    }
);

/**
 * Represents a named section of prompt content
 * @property name - Unique identifier for the part
 * @property content - The content of this part
 *
 * @example
 * ```ts
 * const part: PromptPart = {
 *   name: "greeting_formal",
 *   content: "Dear Sir/Madam"
 * };
 * ```
 */
export type PromptPart = {
  name: string;
  content: string;
};

/**
 * Complete prompt definition containing all components
 * @property metadata - Metadata about the prompt
 * @property variables - Variable definitions used in the template
 * @property template - The prompt template text
 * @property parts - Named content sections that can be referenced
 *
 * @example
 * ```ts
 * const prompt: Prompt = {
 *   metadata: {
 *     title: "Formal Letter",
 *     description: "Template for formal correspondence"
 *   },
 *   variables: [
 *     { name: "recipient", required: true },
 *     { name: "sender", required: false, default: "Anonymous" }
 *   ],
 *   template: "Dear {{recipient}}, ...\nBest regards,\n{{sender}}",
 *   parts: [
 *     { name: "header", content: "CONFIDENTIAL" },
 *     { name: "footer", content: "Page 1 of 1" }
 *   ]
 * };
 * ```
 */
export type Prompt = {
  metadata: PromptMetadata;
  variables: PromptVariable[];
  template: string;
  parts: PromptPart[];
};

/**
 * Type for variable name-value pairs provided as input
 *
 * @example
 * ```ts
 * const variables: PromptInputVariables = {
 *   recipient: "John Smith",
 *   sender: "Jane Doe"
 * };
 * ```
 */
export type PromptInputVariables = Record<string, string>;

/**
 * Custom error class for OnePrompt specific errors
 */
export class OnePromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnePromptError";
  }
}

/**
 * Utility class containing helper methods for prompt operations
 */
export class OnePromptUtils {
  /**
   * Extracts variable names from a template string
   * @param template - Template string containing variables in {{varName}} format
   * @returns Array of variable names without the curly braces
   *
   * @example
   * ```ts
   * const vars = OnePromptUtils.extractTemplateVariables("Hello {{name}}, age: {{age}}");
   * console.log(vars); // ["name", "age"]
   * ```
   */
  public static extractTemplateVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = template.match(regex) || [];
    return matches.map((match) => match.slice(2, -2).trim());
  }

  /**
   * Validates input variables against prompt variables specification
   * @param promptVars - Variable definitions from prompt
   * @param inputVars - Actual input variables
   * @returns Processed variables with defaults applied
   * @throws {OnePromptError} If validation fails
   *
   * @example
   * ```ts
   * const processed = OnePromptUtils.validateAndProcessVariables(
   *   [{ name: "greeting", required: false, default: "Hello" }],
   *   {}
   * );
   * console.log(processed); // { greeting: "Hello" }
   * ```
   */
  public static validateAndProcessVariables(
    promptVars: PromptVariable[],
    inputVars: PromptInputVariables,
  ): PromptInputVariables {
    const processed: PromptInputVariables = {};

    for (const { name, required, default: defaultValue } of promptVars) {
      if (name in inputVars) {
        processed[name] = inputVars[name];
      } else if (required) {
        throw new Error(`Missing required variable: ${name}`);
      } else {
        processed[name] = defaultValue!;
      }
    }

    return processed;
  }

  /**
   * Substitutes variables in template with their values
   * @param template - Template string with {{varName}} placeholders
   * @param variables - Object containing variable values
   * @returns String with variables replaced with their values
   *
   * @example
   * ```ts
   * const result = OnePromptUtils.substituteTemplateVariables(
   *   "Hello {{name}}!",
   *   { name: "Alice" }
   * );
   * console.log(result); // "Hello Alice!"
   * ```
   */
  public static substituteTemplateVariables(
    template: string,
    variables: PromptInputVariables,
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      varName = varName.trim();
      return variables[varName] || match;
    });
  }

  /**
   * Processes conditional expressions in a template and replaces with appropriate parts
   * @param template - Template containing conditional expressions
   * @param variables - Variable values to evaluate conditions
   * @param parts - Available parts that can be shown/hidden
   * @returns Template with conditionals processed
   *
   * @example
   * ```ts
   * const processed = OnePromptUtils.processConditionals(
   *   '<oneprompt:if var="type" equals="formal" show="formal_greeting" else="casual_greeting" />',
   *   { type: "formal" },
   *   [
   *     { name: "formal_greeting", content: "Dear Sir/Madam" },
   *     { name: "casual_greeting", content: "Hi there" }
   *   ]
   * );
   * console.log(processed); // "Dear Sir/Madam"
   * ```
   */
  public static processConditionals(
    template: string,
    variables: PromptInputVariables,
    parts: PromptPart[],
  ): string {
    const partsMap = new Map(parts.map((p) => [p.name, p.content]));

    return template.replace(
      /<oneprompt:if\s+var="([^"]+)"\s+equals="([^"]+)"\s+show="([^"]+)"(?:\s+else="([^"]+)")?\s*\/>/g,
      (match, varName, equalsValue, showPart, elsePart) => {
        const varValue = variables[varName];
        const partToShow = varValue === equalsValue ? showPart : elsePart;

        if (!partToShow) return "";
        return partsMap.get(partToShow) || "";
      },
    );
  }
}

/**
 * Main class for handling prompt operations
 */
export class OnePrompt {
  private static readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    stopNodes: ["template", "part"],
    parseTagValue: false,
  });

  private static readonly xmlBuilder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
    suppressBooleanAttributes: false,
  });

  /**
   * Validates a prompt structure ensuring all required fields and relationships are correct
   * @param prompt - Prompt object to validate
   * @throws {OnePromptError} If validation fails
   *
   * @example
   * ```ts
   * const prompt = {
   *   metadata: { title: "Test" },
   *   variables: [{ name: "user", required: true }],
   *   template: "Hello {{user}}!"
   * };
   * OnePrompt.validate(prompt); // Validates or throws
   * ```
   */
  public static validate(prompt: Prompt): void {
    try {
      if (!prompt.metadata.title) {
        throw new Error("Title is required in metadata");
      }

      const usedVars = OnePromptUtils.extractTemplateVariables(prompt.template);
      const declaredVars = new Map(prompt.variables.map((v) => [v.name, v]));

      for (const varName of usedVars) {
        if (!declaredVars.has(varName)) {
          throw new Error(
            `Variable "${varName}" used in template but not declared`,
          );
        }
      }

      for (const variable of prompt.variables) {
        if (!variable.required && variable.default === undefined) {
          throw new Error(
            `Optional variable "${(variable as any).name}" must have a default value`,
          );
        }
      }

      // Validate parts used in conditions exist
      const partNames = new Set(prompt.parts.map((p) => p.name));
      const conditionalRegex =
        /<oneprompt:if\s+var="([^"]+)"\s+equals="([^"]+)"\s+show="([^"]+)"(?:\s+else="([^"]+)")?\s*\/>/g;
      let match;

      while ((match = conditionalRegex.exec(prompt.template)) !== null) {
        const [, varName, , showPart, elsePart] = match;

        if (!prompt.variables.some((v) => v.name === varName)) {
          throw new Error(
            `Conditional references undefined variable "${varName}"`,
          );
        }

        if (!partNames.has(showPart)) {
          throw new Error(
            `Conditional references undefined part "${showPart}"`,
          );
        }

        if (elsePart && !partNames.has(elsePart)) {
          throw new Error(
            `Conditional references undefined part "${elsePart}"`,
          );
        }
      }
    } catch (error: any) {
      throw new OnePromptError(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Parses an XML string into a Prompt object
   * @param xml - XML string in OnePrompt format
   * @returns Parsed and validated Prompt object
   * @throws {OnePromptError} If parsing fails
   *
   * @example
   * ```ts
   * const xml = `
   * <?xml version="1.0" encoding="UTF-8"?>
   * <metadata><title>Test</title></metadata>
   * <variables><var name="user" required="true"/></variables>
   * <template>Hello {{user}}!</template>
   * `;
   * const prompt = OnePrompt.parseFromXml(xml);
   * ```
   */
  public static parseFromXml(xml: string): Prompt {
    try {
      const promptData = this.xmlParser.parse(xml);

      const prompt: Prompt = {
        metadata: {
          title: promptData.metadata.title,
          ...promptData.metadata,
        },
        variables: [],
        template: promptData.template,
        parts: [],
      };

      if (promptData.variables?.var) {
        const vars = Array.isArray(promptData.variables.var)
          ? promptData.variables.var
          : [promptData.variables.var];

        prompt.variables = vars.map((v: any) => ({
          name: v["@_name"],
          required: v["@_required"] === "true",
          default: v["#text"],
        }));
      }

      if (promptData.part) {
        const parts = Array.isArray(promptData.part)
          ? promptData.part
          : [promptData.part];

        prompt.parts = parts.map((p: any) => ({
          name: p["@_name"],
          content: p["#text"] || "",
        }));
      }

      this.validate(prompt);
      return prompt;
    } catch (error: any) {
      throw new OnePromptError(`Parse failed: ${error.message}`);
    }
  }

  /**
   * Converts a Prompt object to XML format
   * @param prompt - Prompt object to convert
   * @returns XML string representation
   * @throws {OnePromptError} If conversion fails
   *
   * @example
   * ```ts
   * const prompt = {
   *   metadata: { title: "Test" },
   *   variables: [{ name: "user", required: true }],
   *   template: "Hello {{user}}!"
   * };
   * const xml = OnePrompt.convertToXml(prompt);
   * ```
   */
  public static convertToXml(prompt: Prompt): string {
    try {
      this.validate(prompt);

      const xmlObj = {
        metadata: prompt.metadata,
        variables: {
          var: prompt.variables.map((v) => ({
            "@_name": v.name,
            "@_required": v.required.toString(),
            "#text": v.default,
          })),
        },
        part: prompt.parts.map((p) => ({
          "@_name": p.name,
          "#text": p.content,
        })),
        template: prompt.template,
      };

      return this.xmlBuilder.build(xmlObj);
    } catch (error: any) {
      throw new OnePromptError(`Conversion to XML failed: ${error.message}`);
    }
  }

  /**
   * Renders a prompt by substituting variables with their values
   * @param source - XML string or Prompt object
   * @param variables - Values for template variables
   * @returns Rendered template with variables substituted
   * @throws {OnePromptError} If rendering fails
   *
   * @example
   * ```ts
   * const rendered = OnePrompt.renderWithVariables(
   *   promptObj, // or XML string
   *   { user: "Alice", greeting: "Hi" }
   * );
   * ```
   */
  public static renderWithVariables(
    source: string | Prompt,
    variables: PromptInputVariables,
  ): string {
    try {
      const prompt =
        typeof source === "string" ? this.parseFromXml(source) : source;
      this.validate(prompt);

      const processedVars = OnePromptUtils.validateAndProcessVariables(
        prompt.variables,
        variables,
      );

      // Process conditionals first
      let processedTemplate = OnePromptUtils.processConditionals(
        prompt.template.trim(),
        processedVars,
        prompt.parts,
      );

      // Then substitute remaining variables
      return OnePromptUtils.substituteTemplateVariables(
        processedTemplate,
        processedVars,
      );
    } catch (error: any) {
      throw new OnePromptError(`Render failed: ${error.message}`);
    }
  }

  /**
   * @deprecated Use parseFromXml() instead
   */
  public static parse(xml: string): Prompt {
    console.warn(
      "`OnePrompt.parse()` is deprecated. Use `OnePrompt.parseFromXml()` instead.",
    );
    return this.parseFromXml(xml);
  }

  /**
   * @deprecated Use convertToXml() instead
   */
  public static serialize(prompt: Prompt): string {
    console.warn(
      "`OnePrompt.serialize()` is deprecated. Use `OnePrompt.convertToXml()` instead.",
    );
    return this.convertToXml(prompt);
  }

  /**
   * @deprecated Use renderWithVariables() instead
   */
  public static render(
    source: string | Prompt,
    variables: PromptInputVariables,
  ): string {
    console.warn(
      "`OnePrompt.render()` is deprecated. Use `OnePrompt.renderWithVariables()` instead.",
    );
    return this.renderWithVariables(source, variables);
  }
}
