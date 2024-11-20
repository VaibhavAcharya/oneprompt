import { expect, test, describe } from "bun:test";
import {
  type Prompt,
  OnePrompt,
  OnePromptUtils,
  OnePromptError,
  PromptVariable,
  PromptPart,
} from "../src";

describe("OnePromptUtils", () => {
  describe("extractTemplateVariables", () => {
    test("should extract variables from template", () => {
      const template = "Hello {{name}}, you are {{age}} years old!";
      const vars = OnePromptUtils.extractTemplateVariables(template);
      expect(vars).toEqual(["name", "age"]);
    });

    test("should handle templates with no variables", () => {
      const template = "Hello world!";
      const vars = OnePromptUtils.extractTemplateVariables(template);
      expect(vars).toEqual([]);
    });

    test("should handle repeated variables", () => {
      const template = "Hello {{name}}! How are you {{name}}?";
      const vars = OnePromptUtils.extractTemplateVariables(template);
      expect(vars).toEqual(["name", "name"]);
    });

    test("should handle variables with whitespace", () => {
      const template = "Hello {{ name }}, you are {{ age }}!";
      const vars = OnePromptUtils.extractTemplateVariables(template);
      expect(vars).toEqual(["name", "age"]);
    });
  });

  describe("validateAndProcessVariables", () => {
    test("should process variables with defaults", () => {
      const promptVars = [
        { name: "greeting", required: false, default: "Hello" },
      ] satisfies PromptVariable[];
      const processed = OnePromptUtils.validateAndProcessVariables(
        promptVars,
        {},
      );
      expect(processed).toEqual({ greeting: "Hello" });
    });

    test("should throw error for missing required variables", () => {
      const promptVars = [
        { name: "name", required: true, default: undefined },
      ] satisfies PromptVariable[];
      expect(() => {
        OnePromptUtils.validateAndProcessVariables(promptVars, {});
      }).toThrow("Missing required variable: name");
    });

    test("should override defaults with provided values", () => {
      const promptVars = [
        { name: "greeting", required: false, default: "Hello" },
      ] satisfies PromptVariable[];
      const processed = OnePromptUtils.validateAndProcessVariables(promptVars, {
        greeting: "Hi",
      });
      expect(processed).toEqual({ greeting: "Hi" });
    });

    test("should handle multiple variables with mixed requirements", () => {
      const promptVars = [
        { name: "required1", required: true },
        { name: "required2", required: true },
        { name: "optional1", required: false, default: "default1" },
        { name: "optional2", required: false, default: "default2" },
      ] satisfies PromptVariable[];

      const processed = OnePromptUtils.validateAndProcessVariables(promptVars, {
        required1: "value1",
        required2: "value2",
        optional1: "custom1",
      });

      expect(processed).toEqual({
        required1: "value1",
        required2: "value2",
        optional1: "custom1",
        optional2: "default2",
      });
    });
  });

  describe("substituteTemplateVariables", () => {
    test("should substitute variables in template", () => {
      const template = "Hello {{name}}!";
      const result = OnePromptUtils.substituteTemplateVariables(template, {
        name: "Alice",
      });
      expect(result).toBe("Hello Alice!");
    });

    test("should leave unmatched variables unchanged", () => {
      const template = "Hello {{name}}!";
      const result = OnePromptUtils.substituteTemplateVariables(template, {});
      expect(result).toBe("Hello {{name}}!");
    });

    test("should handle multiple occurrences of same variable", () => {
      const template = "{{name}} is {{name}}!";
      const result = OnePromptUtils.substituteTemplateVariables(template, {
        name: "Bob",
      });
      expect(result).toBe("Bob is Bob!");
    });

    test("should handle special characters in values", () => {
      const template = "Hello {{name}}!";
      const result = OnePromptUtils.substituteTemplateVariables(template, {
        name: "O'Connor & Sons",
      });
      expect(result).toBe("Hello O'Connor & Sons!");
    });
  });

  describe("processConditionals", () => {
    test("should process simple conditional", () => {
      const template =
        '<oneprompt:if var="type" equals="formal" show="formal_greeting" />';
      const variables = { type: "formal" };
      const parts = [{ name: "formal_greeting", content: "Dear Sir/Madam" }];
      const result = OnePromptUtils.processConditionals(
        template,
        variables,
        parts,
      );
      expect(result).toBe("Dear Sir/Madam");
    });

    test("should handle else conditions", () => {
      const template =
        '<oneprompt:if var="type" equals="formal" show="formal" else="casual" />';
      const variables = { type: "casual" };
      const parts = [
        { name: "formal", content: "Dear Sir/Madam" },
        { name: "casual", content: "Hi" },
      ];
      const result = OnePromptUtils.processConditionals(
        template,
        variables,
        parts,
      );
      expect(result).toBe("Hi");
    });

    test("should handle multiple conditionals", () => {
      const template = `<oneprompt:if var="lang" equals="en" show="greeting_en" else="greeting_es" />
<oneprompt:if var="time" equals="morning" show="morning_msg" else="evening_msg" />`;
      const variables = { lang: "en", time: "morning" };
      const parts = [
        { name: "greeting_en", content: "Hello" },
        { name: "greeting_es", content: "Hola" },
        { name: "morning_msg", content: "Good morning" },
        { name: "evening_msg", content: "Good evening" },
      ];
      const result = OnePromptUtils.processConditionals(
        template,
        variables,
        parts,
      );
      expect(result.trim()).toBe("Hello\nGood morning");
    });

    test("should handle undefined parts gracefully", () => {
      const template =
        '<oneprompt:if var="type" equals="formal" show="nonexistent" />';
      const variables = { type: "formal" };
      const parts: PromptPart[] = [];
      const result = OnePromptUtils.processConditionals(
        template,
        variables,
        parts,
      );
      expect(result).toBe("");
    });

    test("should handle nested content within conditionals", () => {
      const template = `<oneprompt:if var="auth" equals="admin" show="admin_section" />
Regular content
<oneprompt:if var="notifications" equals="true" show="notif_section" />`;
      const variables = { auth: "admin", notifications: "true" };
      const parts = [
        { name: "admin_section", content: "Admin Panel" },
        { name: "notif_section", content: "New messages" },
      ];
      const result = OnePromptUtils.processConditionals(
        template,
        variables,
        parts,
      );
      expect(result.trim()).toBe("Admin Panel\nRegular content\nNew messages");
    });
  });
});

describe("OnePrompt", () => {
  describe("validate", () => {
    test("should validate valid prompt", () => {
      const prompt: Prompt = {
        metadata: { title: "Test" },
        variables: [{ name: "name", required: true, default: undefined }],
        template: "Hello {{name}}!",
        parts: [],
      };
      expect(() => OnePrompt.validate(prompt)).not.toThrow();
    });

    test("should throw for missing title", () => {
      const prompt: Prompt = {
        metadata: { title: "" },
        variables: [],
        template: "",
        parts: [],
      };
      expect(() => OnePrompt.validate(prompt)).toThrow(OnePromptError);
    });

    test("should throw for undeclared variables", () => {
      const prompt: Prompt = {
        metadata: { title: "Test" },
        variables: [],
        template: "Hello {{name}}!",
        parts: [],
      };
      expect(() => OnePrompt.validate(prompt)).toThrow(OnePromptError);
    });
  });

  describe("XML Parsing and Converting", () => {
    const validXml = `
      <metadata>
        <title>Test Prompt</title>
      </metadata>
      <variables>
        <var name="name" required="true" />
        <var name="greeting" required="false">Hello</var>
      </variables>
      <template>{{greeting}} {{name}}!</template>
    `;

    test("should parse valid XML", () => {
      const prompt = OnePrompt.parseFromXml(validXml);
      expect(prompt.metadata.title).toBe("Test Prompt");
      expect(prompt.variables).toHaveLength(2);
      expect(prompt.template).toBe("{{greeting}} {{name}}!");
    });

    test("should convert prompt to XML", () => {
      const prompt = OnePrompt.parseFromXml(validXml);
      const xml = OnePrompt.convertToXml(prompt);
      expect(xml).toContain("<title>Test Prompt</title>");
      expect(xml).toContain('var name="name" required="true"');
    });

    test("should throw on invalid XML", () => {
      const invalidXml = "<invalid>";
      expect(() => OnePrompt.parseFromXml(invalidXml)).toThrow(OnePromptError);
    });
  });

  describe("renderWithVariables", () => {
    test("should render prompt with variables", () => {
      const prompt: Prompt = {
        metadata: { title: "Test" },
        variables: [
          { name: "name", required: true, default: undefined },
          { name: "greeting", required: false, default: "Hello" },
        ],
        template: "{{greeting}} {{name}}!",
        parts: [],
      };

      const rendered = OnePrompt.renderWithVariables(prompt, { name: "Alice" });
      expect(rendered).toBe("Hello Alice!");
    });

    test("should render with conditionals", () => {
      const prompt: Prompt = {
        metadata: { title: "Test" },
        variables: [{ name: "type", required: false, default: "formal" }],
        template: '<oneprompt:if var="type" equals="formal" show="greeting" />',
        parts: [{ name: "greeting", content: "Dear Sir/Madam" }],
      };

      const rendered = OnePrompt.renderWithVariables(prompt, {});
      expect(rendered).toBe("Dear Sir/Madam");
    });

    test("should throw for missing required variables", () => {
      const prompt: Prompt = {
        metadata: { title: "Test" },
        variables: [{ name: "name", required: true, default: undefined }],
        template: "Hello {{name}}!",
        parts: [],
      };

      expect(() => OnePrompt.renderWithVariables(prompt, {})).toThrow(
        OnePromptError,
      );
    });
  });
});
