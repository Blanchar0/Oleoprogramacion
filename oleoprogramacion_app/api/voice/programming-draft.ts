import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({}); // Will use process.env.GEMINI_API_KEY

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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

    res.status(200).json(extraction);

  } catch (error: any) {
    console.error('Error procesando audio en Vercel:', error);
    res.status(500).json({ error: error.message || 'Error procesando audio con Gemini' });
  }
}
