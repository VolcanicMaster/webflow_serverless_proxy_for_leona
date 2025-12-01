// server.js
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // This now works perfectly with v3

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Enable CORS
app.use(cors({
    origin: [
		'https://leona-1e033a.webflow.io/new-home',
		'https://www.leona.health'
	], 
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// 2. Parse JSON bodies
app.use(express.json());

// 3. The Proxy Route
app.post('/api/chat', async (req, res) => {
    
    // Config
    const API_KEY = process.env.LANGGRAPH_API_KEY;
    const BASE_URL = process.env.LANGGRAPH_URL;
    const ASSISTANT_ID = process.env.ASSISTANT_ID;

    if (!API_KEY || !BASE_URL) {
        return res.status(500).json({ error: 'Server Config Error: Missing Secrets' });
    }

    const { action, threadId, message } = req.body;

    try {
        // SCENARIO 1: Create Thread
        if (action === 'create_thread') {
            const response = await fetch(`${BASE_URL}/threads`, {
                method: 'POST',
                headers: {
                    'X-Api-Key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) throw new Error(`LangGraph Init Error: ${response.status}`);
            const data = await response.json();
            return res.status(200).json(data);
        }

        // SCENARIO 2: Send Message
        if (action === 'send_message') {
            if (!threadId) return res.status(400).json({ error: 'Missing Thread ID' });

            const runUrl = `${BASE_URL}/threads/${threadId}/runs/wait`;
            
            const response = await fetch(runUrl, {
                method: 'POST',
                headers: {
                    'X-Api-Key': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assistant_id: ASSISTANT_ID,
                    multitask_strategy: "enqueue",
                    input: {
                        messages: [{ role: "user", content: message }]
                    }
                })
            });

            if (!response.ok) throw new Error(`LangGraph Run Error: ${response.status}`);
            const data = await response.json();
            return res.status(200).json(data);
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});