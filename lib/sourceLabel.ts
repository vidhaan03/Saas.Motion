// Union of every stream source the SSE backend may emit, plus a single
// place to format them for display. Used by the badge in the editor + the
// status line in the generating view.

export type SourceTag =
  | "mock"
  | "claude"
  | "gemini"
  | "nim-gemma"
  | "nim-llama"
  | "agentic-nim"
  | "agentic-gemini"
  | "agentic-mixed";

export const humanSourceName = (s: SourceTag): string => {
  switch (s) {
    case "agentic-gemini":
      return "Agentic MoE · Gemini 2.5 Flash Lite";
    case "agentic-nim":
      return "Agentic MoE · NIM";
    case "agentic-mixed":
      return "Agentic MoE · Gemini + NIM";
    case "nim-gemma":
      return "NIM";
    case "nim-llama":
      return "NIM · Llama";
    case "gemini":
      return "Gemini 2.5 Flash Lite";
    case "claude":
      return "Claude";
    case "mock":
    default:
      return "mock generator";
  }
};
