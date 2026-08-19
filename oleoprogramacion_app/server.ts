import express from 'express';
import cors from 'cors';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI(); // Will use process.env.GEMINI_API_KEY

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), db: 'supabase' });
  });

  // Voice programming draft endpoint
  app.post('/api/voice/programming-draft', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      if (!audioBase64) {
        return res.status(400).json({ error: 'No audio data provided' });
      }

      // Generate content with Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Escucha este audio de un supervisor agrícola. Extrae en formato JSON exacto con las siguientes llaves: dateText (texto o null), zoneText (texto o null), lotText (texto o null), laborText (texto o null), activityText (texto o null), personnelTexts (array de strings vacio si no hay) y observations (texto o null). Devuelve estrictamente el objeto JSON sin markdown.'
              },
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: audioBase64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const jsonResponse = response.text || '{}';
      
      // Parse to ensure it's valid JSON before sending
      const data = JSON.parse(jsonResponse);
      
      // We wrap the response in the format expected by voiceResolver (VoiceExtraction)
      const extraction = {
        transcript: "Transcripción procesada por Gemini",
        dateText: data.dateText || null,
        zoneText: data.zoneText || null,
        lotText: data.lotText || null,
        laborText: data.laborText || null,
        activityText: data.activityText || null,
        personnelTexts: data.personnelTexts || [],
        observations: data.observations || null,
        generalConfidence: 0.95
      };

      res.json(extraction);

    } catch (error: any) {
      console.error('Error procesando audio:', error);
      res.status(500).json({ error: error.message || 'Error procesando audio con Gemini' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT contiene un valor inválido.');
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Oleoflores Server running on http://0.0.0.0:${port} with Supabase backend`);
  });
}

startServer().catch((error) => {
  console.error('No fue posible iniciar el servidor.', error);
  process.exitCode = 1;
});
