# AI Gateway Policy

1. **Centralized Routing**: Never call an LLM (Gemini, OpenAI, Claude, Ollama) directly. All requests must route through `AIGateway`.
2. **Caching**: Utilize the AI Gateway cache heavily to minimize redundant processing costs.
3. **Extension Protocol**: If the Gateway lacks a capability:
   - Explain why.
   - Propose the Gateway extension (e.g., in the `AICapability` type).
   - Wait for approval before implementing.
