const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');
const fs = require('fs');

function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex === -1) continue;

        const key = trimmed.slice(0, equalsIndex).trim();
        const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnvFile();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const allowedOrigins = new Set([
    'https://itshusuzuki.com',
    'https://www.itshusuzuki.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]);
const localOriginRegex = /^https?:\/\/(?:localhost|127\.0\.0\.1)(:\d+)?$/;
const itshusuzukiOriginRegex = /^https?:\/\/(?:www\.)?itshusuzuki\.com(?::\d+)?$/;

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || localOriginRegex.test(origin) || itshusuzukiOriginRegex.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname), { dotfiles: 'ignore' }));

function postJson(url, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const request = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (response) => {
            let responseBody = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
                responseBody += chunk;
            });
            response.on('end', () => {
                let data = {};
                try {
                    data = responseBody ? JSON.parse(responseBody) : {};
                } catch (error) {
                    return reject(new Error('Invalid JSON response from Gemini API'));
                }

                const statusCode = response.statusCode || 500;
                resolve({
                    ok: statusCode >= 200 && statusCode < 300,
                    statusCode,
                    data
                });
            });
        });

        request.on('error', reject);
        request.write(body);
        request.end();
    });
}

app.post('/api/chat', async (req, res) => {
    try {
        if (!API_KEY) {
            return res.status(500).json({ error: 'API_KEY is not configured on the server' });
        }

        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const model = encodeURIComponent(GEMINI_MODEL);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
        const geminiResponse = await postJson(url, req.body);
        const data = geminiResponse.data;

        if (!geminiResponse.ok) {
            return res.status(geminiResponse.statusCode).json({
                error: data.error?.message || 'Gemini API request failed',
                details: data
            });
        }

        return res.json(data);
    } catch (error) {
        console.error('AI proxy error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
