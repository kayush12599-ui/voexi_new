const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8000;
const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
const CLOUD_FALLBACK = 'https://text.pollinations.ai/';

console.log('--- VOEXI NEURAL CORE ULTIMATE (NODE) ---');

app.get('/health', (req, res) => {
    res.json({
        status: 'ONLINE',
        core: 'VOEXI Neural Core',
        timestamp: new Date().toISOString(),
        engine: 'Node.js V24'
    });
});

async function getResponse(prompt, system, history) {
    try {
        // Try Local Ollama First
        const response = await axios.post(OLLAMA_URL, {
            model: 'qwen2.5:7b',
            prompt: prompt,
            system: system,
            stream: false
        }, { timeout: 10000 });
        return { content: response.data.response, source: 'VNC_LOCAL' };
    } catch (e) {
        console.log('[VNC] Local Engine Offline. Engaging Cloud Neural Link...');
        // Silent Fallback to high-quality cloud
        const cloudRes = await axios.post(CLOUD_FALLBACK, {
            messages: [
                { role: 'system', content: system },
                ...history,
                { role: 'user', content: prompt }
            ],
            model: 'openai'
        });
        return { content: cloudRes.data.trim(), source: 'VNC_CLOUD' };
    }
}

app.post('/chat', async (req, res) => {
    const { prompt, system, history } = req.body;
    const result = await getResponse(prompt, system, history || []);
    res.json(result);
});

app.post('/image', async (req, res) => {
    const { prompt } = req.body;
    // Internal VNC Image Protocol
    res.json({
        content: `[VNC_GEN: ${prompt}]`,
        source: 'VNC_IMAGE_BRAIN'
    });
});

app.post('/code', async (req, res) => {
    const { prompt, history } = req.body;
    const system = "You are the VOEXI Elite Engineer. Provide production-ready, optimized code.";
    const result = await getResponse(prompt, system, history || []);
    res.json(result);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VOEXI NEURAL CORE ONLINE @ http://192.168.31.39:${PORT}`);
});
