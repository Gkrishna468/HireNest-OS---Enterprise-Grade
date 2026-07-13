import { AIGateway } from '../services/AIGateway.js';

export default async function openaiCompatHandler(req: any, res: any) {
    const rawPath = req.path.replace(/^\//, '');
    const path = rawPath.split('?')[0];

    try {
        if (req.method === 'GET' && (path === 'models' || path === 'v1/models')) {
            return res.json({
                object: 'list',
                data: [
                    {
                        id: 'gemini-3.5-flash',
                        object: 'model',
                        created: 1700000000,
                        owned_by: 'google'
                    },
                    {
                        id: 'gemini-3.1-pro-preview',
                        object: 'model',
                        created: 1700000000,
                        owned_by: 'google'
                    },
                    {
                        id: 'qwen3:8b',
                        object: 'model',
                        created: 1700000000,
                        owned_by: 'ollama'
                    },
                    {
                        id: 'deepseek-r1',
                        object: 'model',
                        created: 1700000000,
                        owned_by: 'ollama'
                    }
                ]
            });
        }

        if (req.method === 'POST' && (path === 'chat/completions' || path === 'v1/chat/completions')) {
            const { model = 'gemini-3.5-flash', messages, temperature, max_tokens, stream = false } = req.body;

            if (!messages || !Array.isArray(messages)) {
                return res.status(400).json({
                    error: {
                        message: 'messages array is required',
                        type: 'invalid_request_error',
                        param: 'messages',
                        code: null
                    }
                });
            }

            // Convert OpenAI style message array to a unified prompt string
            const prompt = messages.map((m: any) => {
                const roleName = m.role === 'system' ? 'System' : m.role === 'user' ? 'User' : 'Assistant';
                return `${roleName}: ${m.content}`;
            }).join('\n\n') + '\n\nAssistant:';

            const userId = req.user?.uid || 'openai-compat';
            const office = req.user?.role || 'general';

            console.log(`[OpenAI-Compat] Processing chat completion for model ${model} requested by ${userId}`);

            const result = await AIGateway.processChat({
                prompt,
                model,
                userId,
                office,
                feature: 'general',
                skipCache: true // Skip cached values for direct chat/completions developer tools to ensure live responsiveness
            });

            // Calculate approximate tokens for standard usage reporting
            const promptTokens = Math.max(1, Math.ceil(prompt.length / 4));
            const completionTokens = Math.max(1, Math.ceil(result.response.length / 4));

            return res.json({
                id: `chatcmpl-${Math.random().toString(36).substring(2, 15)}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: result.model || model,
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: result.response
                        },
                        logprobs: null,
                        finish_reason: 'stop'
                    }
                ],
                usage: {
                    prompt_tokens: promptTokens,
                    completion_tokens: completionTokens,
                    total_tokens: promptTokens + completionTokens
                }
            });
        }

        // Return connection/status index for other paths
        if (path === '' || path === 'v1') {
            return res.json({
                status: 'operational',
                message: 'HireNest AI Gateway (OpenAI Compatible Adapter Interface v1.0) is online and healthy.'
            });
        }

        return res.status(404).json({
            error: {
                message: `The endpoint ${req.method} ${req.path} was not found on this server.`,
                type: 'invalid_request_error',
                param: null,
                code: 'resource_missing'
            }
        });

    } catch (err: any) {
        console.error('[OpenAI-Compat] Error processing request:', err);
        return res.status(500).json({
            error: {
                message: err.message || 'An internal server error occurred while processing your request.',
                type: 'api_error',
                param: null,
                code: 'internal_error'
            }
        });
    }
}
