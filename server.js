const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/ai', async (req, res) => {
    try {
        const body = req.body;
        if (!body || typeof body !== 'object' || !body.prompt || !body.prompt.text) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const promptText = body.prompt.text;
        const themeMatch = promptText.match(/テーマ: (.+)$/);
        const theme = themeMatch ? themeMatch[1].trim() : '';

        // テーマに基づいてカラーを生成する関数
        function generateColorsFromTheme(theme) {
            const colorThemes = {
                // 自然・抽象
                '海': { bodyColor: '#006994', stepColor: '#00AEEF', otbColor: '#87CEEB' },
                '青': { bodyColor: '#1E90FF', stepColor: '#4169E1', otbColor: '#87CEEB' },
                '森': { bodyColor: '#228B22', stepColor: '#32CD32', otbColor: '#90EE90' },
                '緑': { bodyColor: '#228B22', stepColor: '#32CD32', otbColor: '#90EE90' },
                '赤': { bodyColor: '#DC143C', stepColor: '#FF6347', otbColor: '#FFA07A' },
                '火': { bodyColor: '#DC143C', stepColor: '#FF6347', otbColor: '#FFA07A' },
                '太陽': { bodyColor: '#FFD700', stepColor: '#FFA500', otbColor: '#FFFF00' },
                '黄色': { bodyColor: '#FFD700', stepColor: '#FFA500', otbColor: '#FFFF00' },
                '紫': { bodyColor: '#8A2BE2', stepColor: '#DA70D6', otbColor: '#DDA0DD' },
                'ピンク': { bodyColor: '#FF1493', stepColor: '#FF69B4', otbColor: '#FFB6C1' },
                '春': { bodyColor: '#98FB98', stepColor: '#00FF7F', otbColor: '#F0E68C' },
                '夏': { bodyColor: '#FFD700', stepColor: '#FF6347', otbColor: '#87CEEB' },
                '秋': { bodyColor: '#FF6347', stepColor: '#8B4513', otbColor: '#DAA520' },
                '冬': { bodyColor: '#87CEEB', stepColor: '#FFFFFF', otbColor: '#B0C4DE' },
                // 国
                '日本': { bodyColor: '#BC002D', stepColor: '#FFFFFF', otbColor: '#BC002D' },
                'フランス': { bodyColor: '#002654', stepColor: '#FFFFFF', otbColor: '#ED2939' },
                'アメリカ': { bodyColor: '#B22234', stepColor: '#FFFFFF', otbColor: '#3C3B6E' },
                'イタリア': { bodyColor: '#009246', stepColor: '#FFFFFF', otbColor: '#CE2B37' },
                'ドイツ': { bodyColor: '#000000', stepColor: '#DD0000', otbColor: '#FFCC00' },
                'ブラジル': { bodyColor: '#009739', stepColor: '#FEDD00', otbColor: '#002776' },
                // 動物
                'パンダ': { bodyColor: '#000000', stepColor: '#FFFFFF', otbColor: '#000000' },
                '猫': { bodyColor: '#FFA500', stepColor: '#000000', otbColor: '#FFFFFF' },
                '犬': { bodyColor: '#8B4513', stepColor: '#D2691E', otbColor: '#F4A460' },
                'ライオン': { bodyColor: '#FFD700', stepColor: '#8B4513', otbColor: '#FFFFFF' },
                'トラ': { bodyColor: '#FFA500', stepColor: '#000000', otbColor: '#FFFFFF' },
                // スポーツチーム（例）
                '東京ヤクルトスワローズ': { bodyColor: '#006400', stepColor: '#FFD700', otbColor: '#FFFFFF' }, // 緑と金
                '読売ジャイアンツ': { bodyColor: '#FFA500', stepColor: '#000000', otbColor: '#FFA500' }, // オレンジと黒
                '阪神タイガース': { bodyColor: '#FFD700', stepColor: '#000000', otbColor: '#FFD700' }, // 黄と黒
                '広島東洋カープ': { bodyColor: '#FF0000', stepColor: '#FFFFFF', otbColor: '#FF0000' }, // 赤
                '横浜DeNAベイスターズ': { bodyColor: '#0066CC', stepColor: '#FFFFFF', otbColor: '#0066CC' }, // 青
                // 飲食店（例）
                'マクドナルド': { bodyColor: '#FF0000', stepColor: '#FFD700', otbColor: '#FFFFFF' }, // 赤黄
                'スターバックス': { bodyColor: '#00704A', stepColor: '#FFFFFF', otbColor: '#00704A' }, // 緑
                'ミスタードーナツ': { bodyColor: '#FF69B4', stepColor: '#FFD700', otbColor: '#FFFFFF' }, // ピンクと黄
                'モスバーガー': { bodyColor: '#8B4513', stepColor: '#FFFFFF', otbColor: '#8B4513' }, // 茶
                'サブウェイ': { bodyColor: '#009900', stepColor: '#FFFFFF', otbColor: '#009900' } // 緑
            };

            // 完全一致をチェック
            if (colorThemes[theme]) {
                return colorThemes[theme];
            }

            // 部分一致をチェック（例: "海"が含まれるテーマ）
            for (const key in colorThemes) {
                if (theme.includes(key)) {
                    return colorThemes[key];
                }
            }
            }

            // テーマがマッチしない場合はランダム生成
            function randomColor() {
                return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            }
            return {
                bodyColor: randomColor(),
                stepColor: randomColor(),
                otbColor: randomColor()
            };
        }

        const colors = generateColorsFromTheme(theme);
        const jsonResponse = JSON.stringify(colors);

        // Gemini形式に合わせたレスポンス
        const response = {
            candidates: [{
                content: [{
                    text: jsonResponse
                }]
            }]
        };

        return res.json(response);
    } catch (error) {
        console.error('AI proxy error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'hello.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
