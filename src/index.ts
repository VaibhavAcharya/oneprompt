import { XMLBuilder, XMLParser } from "fast-xml-parser";

/**
 * Core types for the OnePrompt library
 */
export type PromptMetadata = {
  title: string;
  [key: string]: string | undefined;
};

export type PromptVariable = {
  name: string;
  required: boolean;
  default?: string;
};

export type Prompt = {
  metadata: PromptMetadata;
  variables: PromptVariable[];
  template: string;
};

export type PromptInputVariables = Record<string, string>;

/**
 * Custom error classes for specific error handling
 */
export class OnePromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnePromptError";
  }
}

/**
 * Main class for handling prompt operations
 */
export class OnePrompt {
  private static readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    stopNodes: ["template"],
    parseTagValue: false,
  });

  private static readonly xmlBuilder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: false,
  });

  /**
   * Extracts variable names from a template string
   */
  private static extractVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = template.match(regex) || [];
    return matches.map((match) => match.slice(2, -2).trim());
  }

  /**
   * Validates a prompt structure
   * @param prompt - Prompt object to validate
   * @throws {OnePromptError} If validation fails
   */
  public static validate(prompt: Prompt): void {
    try {
      if (!prompt.metadata.title) {
        throw new Error("Title is required in metadata");
      }

      const usedVars = this.extractVariables(prompt.template);
      const declaredVars = new Map(prompt.variables.map((v) => [v.name, v]));

      // Check all used variables are declared
      for (const varName of usedVars) {
        if (!declaredVars.has(varName)) {
          throw new Error(
            `Variable "${varName}" used in template but not declared`,
          );
        }
      }

      // Validate optional variables have defaults
      for (const variable of prompt.variables) {
        if (!variable.required && variable.default === undefined) {
          throw new Error(
            `Optional variable "${variable.name}" must have a default value`,
          );
        }
      }
    } catch (error: any) {
      throw new OnePromptError(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Parses an XML string into a Prompt object
   * @param xml - XML string to parse
   * @returns Parsed Prompt object
   * @throws {OnePromptError} If parsing fails
   */
  public static parse(xml: string): Prompt {
    try {
      const promptData = this.xmlParser.parse(xml);

      const prompt: Prompt = {
        metadata: {
          title: promptData.metadata.title,
          ...promptData.metadata,
        },
        variables: [],
        template: promptData.template,
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

      this.validate(prompt);
      return prompt;
    } catch (error: any) {
      throw new OnePromptError(`Parse failed: ${error.message}`);
    }
  }

  /**
   * Serializes a Prompt object to XML
   * @param prompt - Prompt object to serialize
   * @returns XML string
   * @throws {OnePromptError} If serialization fails
   */
  public static serialize(prompt: Prompt): string {
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
        template: "\n" + prompt.template + "\n",
      };

      return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        this.xmlBuilder.build(xmlObj)
      );
    } catch (error: any) {
      throw new OnePromptError(`Serialize failed: ${error.message}`);
    }
  }

  /**
   * Renders a prompt with provided variables
   * @param source - XML string or Prompt object
   * @param variables - Variable values for template
   * @returns Rendered template string
   * @throws {OnePromptError} If rendering fails
   */
  public static render(
    source: string | Prompt,
    variables: PromptInputVariables,
  ): string {
    try {
      const prompt = typeof source === "string" ? this.parse(source) : source;
      this.validate(prompt);

      const processedVars = this.processVariables(prompt.variables, variables);
      return this.renderTemplate(prompt.template, processedVars);
    } catch (error: any) {
      throw new OnePromptError(`Render failed: ${error.message}`);
    }
  }

  /**
   * Processes and validates input variables
   */
  private static processVariables(
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
   * Renders template with processed variables
   */
  private static renderTemplate(
    template: string,
    variables: PromptInputVariables,
  ): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      varName = varName.trim();
      return variables[varName] || match;
    });
  }
}
