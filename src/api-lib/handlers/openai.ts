import express from 'express';
import { AIGateway } from '../services/AIGateway.js';

const router = express.Router();

router.get('/models', (req: any, res: any) => {
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
                id: 'gemini-2.5-pro',
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
});

router.post('/chat/completions', async (req: any, res: any) => {
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

    try {
        // Convert OpenAI-style message array to a unified prompt string for AIGateway
        const prompt = messages.map((m: any) => {
            const roleName = m.role === 'system' ? 'System' : m.role === 'user' ? 'User' : 'Assistant';
            return `${roleName}: ${m.content}`;
        }).join('\n\n') + '\n\nAssistant:';

        const userId = req.user?.uid || 'openai-compat';
        const office = req.user?.role || 'general';

        console.log(`[OpenAI Router] Processing chat completion for model ${model} requested by ${userId}`);

        const result = await AIGateway.processChat({
            prompt,
            model,
            userId,
            office,
            feature: 'general',
            skipCache: true
        });

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
    } catch (err: any) {
        console.error('[OpenAI Router] Error processing request:', err);
        return res.status(500).json({
            error: {
                message: err.message || 'An internal server error occurred while processing your request.',
                type: 'api_error',
                param: null,
                code: 'internal_error'
            }
        });
    }
});

export default router;
