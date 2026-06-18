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
const API_KEY = process.env.API_KEY || process.env.AI_KEY || process.env.OPENAI_API_KEY;
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

function postJson(url, payload, headers = {}) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const request = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                ...headers
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
        if (!API_KEY) return res.status(500).json({ error: 'API_KEY is not configured' });
        if (!req.body || !req.body.prompt) return res.status(400).json({ error: 'Prompt is required' });

        // OpenAIの通信先URL
        const url = 'https://api.openai.com/v1/chat/completions';
        
        // OpenAI向けのリクエストデータ
        const payload = {
            model: "gpt-4o-mini", // 高速・高精度・低価格なモデル
            messages: [
                {
                    role: "system",
                    content: "あなたはプロのプロダクトデザイナー兼カラーコーディネーターです。ユーザーのテーマに基づいて脚立の3パーツのカラーをデザインします。必ずJSON形式で、bodyColor, stepColor, otbColor の3つのキーを持つオブジェクトを返してください。値は # から始まるHEXカラーコードにしてください。"
                },
                {
                    role: "user",
                    content: `テーマ：「${req.body.prompt}」\nこのテーマから連想される色を使用して、3色をデザインしてください。`
                }
            ],
            response_format: { type: "json_object" } // 必ずJSONで返すよう強制
        };

        const headers = { 'Authorization': `Bearer ${API_KEY}` };
        const aiResponse = await postJson(url, payload, headers);

        if (!aiResponse.ok) return res.status(aiResponse.statusCode).json(aiResponse.data);
        return res.json(aiResponse.data);
        
    } catch (error) {
        console.error('AI proxy error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});