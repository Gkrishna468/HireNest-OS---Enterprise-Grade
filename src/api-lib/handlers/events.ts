import express from 'express';
import { EventBus } from '../services/EventBus.js';

const eventsHandler = express.Router();

eventsHandler.post('/publish', async (req, res) => {
    try {
        const { type, payload, source, orgId } = req.body;
        
        if (!type || !payload) {
            return res.status(400).json({ error: 'type and payload are required' });
        }

        const eventId = await EventBus.publish(type, payload, source || 'API', orgId);
        
        res.json({ success: true, eventId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default eventsHandler;
