interface WebMCPRegisteredTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>, options?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
}

interface WebMCPModelContext extends EventTarget {
  registerTool: (tool: WebMCPRegisteredTool, options?: { signal?: AbortSignal; exposedTo?: string[] }) => Promise<void>;
  getTools?: () => Promise<Array<{ name: string; description: string; inputSchema?: Record<string, unknown> }>>;
}

interface Document {
  readonly modelContext?: WebMCPModelContext;
}
