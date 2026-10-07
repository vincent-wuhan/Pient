import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createUpupTools } from "../src/tools.ts";

export default function upupPientExtension(pi: ExtensionAPI): void {
  for (const tool of createUpupTools()) {
    pi.registerTool({
      name: tool.name,
      label: tool.label,
      description: tool.description,
      promptSnippet: tool.promptSnippet,
      promptGuidelines: tool.promptGuidelines,
      parameters: tool.parameters as never,
      execute: tool.execute as never,
    });
  }
}
