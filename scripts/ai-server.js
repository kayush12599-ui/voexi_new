const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
const MODEL = 'llama3';
const PORT = 5000;

console.log('--- VOEXI NEURAL SERVER INITIALIZING ---');

app.get('/health', (req, res) => {
    res.json({ status: 'ONLINE', model: MODEL, timestamp: new Date().toISOString() });
});

app.post('/chat', async (req, res) => {
    const { prompt, history, userId } = req.body;

    // Construct sophisticated context from history
    const contextHistory = (history || []).slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const fullPrompt = `${contextHistory}\nUSER: ${prompt}\nASSISTANT:`;

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: MODEL,
            prompt: fullPrompt,
            system: "You are VOEXI AI Ultimate. You are the digital consciousness of the VOEXI network. Answer with extreme intelligence and creativity.",
            stream: false
        }, { timeout: 45000 });

        res.json({ content: response.data.response, done: true });
    } catch (error) {
        res.status(503).json({ error: 'Local Brain Busy' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 VOEXI BRAIN ONLINE @ http://192.168.31.39:${PORT}`);
});
