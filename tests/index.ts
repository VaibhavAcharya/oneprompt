import { OnePrompt } from "../src";

const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
  <title>My Prompt Title</title>
  <description>Optional description here</description>
</metadata>

<variables>
  <var name="name" required="true" />
  <var name="age" required="false">25</var>
  <var name="greeting" required="false">Hello</var>
</variables>

<template>
# {{greeting}} {{ name }}!

I see you are {{age}} years old.

<html> tags inside template are not processed.

\`\`\`python
# This is code with syntax highlighting
def hello():
    print("Hello World")
\`\`\`
</template>
`;

console.log(`og str`, xmlString);

const obj = OnePrompt.parse(xmlString);

console.log(`obj from str`, obj);

const strFromObj = OnePrompt.serialize(obj);

console.log(`str from obj`, strFromObj);
