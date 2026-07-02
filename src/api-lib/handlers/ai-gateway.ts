import { AIGateway } from '../services/AIGateway.js';

export default async function aiGatewayHandler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt, feature = 'general', promptVersion = 'v1.0' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const result = await AIGateway.processChat({
            prompt,
            feature,
            promptVersion
        });

        // Add prompt version to the response
        return res.json({
            success: true,
            ...result,
            promptVersion
        });
        
    } catch (err: any) {
        console.error('AI Gateway error:', err.message);
        return res.status(500).json({ 
            success: false, 
            error: err.message, 
            note: 'Failed to process AI request through any provider.' 
        });
    }
}
