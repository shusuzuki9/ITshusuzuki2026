const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyA-wibN2x6ufFrXZmE2bunPf8Gixi5xEic';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

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

app.post('/ai', async (req, res) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
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
