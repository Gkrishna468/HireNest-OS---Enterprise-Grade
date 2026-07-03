export default async function aiHealthHandler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const response = await fetch(`${baseUrl}/api/tags`);
        if (response.ok) {
            const data = await response.json();
            return res.status(200).json({ server: 'ok', ollama: 'ok', models: data.models?.map((m: any) => m.name) || [] });
        } else {
            return res.status(503).json({ server: 'ok', ollama: 'error', status: response.status });
        }
    } catch (e: any) {
        return res.status(503).json({ server: 'ok', ollama: 'unreachable', error: e.message });
    }
}
