const fs = require('fs');
const file = 'src/api-lib/services/AIGateway.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /static getModelRouting\(feature: string\): \{ provider: string, model: string \}\[\] \{[\s\S]*?    \}/,
  `static getModelRouting(feature: string): { provider: string, model: string }[] {
        const ollamaFast = process.env.OLLAMA_MODEL_FAST || 'qwen3:8b';
        const ollamaAccurate = process.env.OLLAMA_MODEL_ACCURATE || 'deepseek-r1';
        
        switch (feature) {
            case 'resume_parsing':
            case 'executive_summary':
            case 'email_drafting':
            case 'copilot':
            case 'candidate_coach':
                return [
                    { provider: 'ollama', model: ollamaFast },
                    { provider: 'google', model: 'gemini-2.5-flash' }
                ];
            case 'candidate_matching':
            case 'semantic_reasoning':
                return [
                    { provider: 'google', model: 'gemini-2.5-pro' },
                    { provider: 'ollama', model: ollamaAccurate }
                ];
            default:
                return [
                    { provider: 'google', model: 'gemini-2.5-flash' },
                    { provider: 'ollama', model: ollamaFast }
                ];
        }
    }`
);

fs.writeFileSync(file, content);
