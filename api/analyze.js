export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audioBase64, mediaType, genre, focuses, notes } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  let prompt = `You are an expert music producer and mixing engineer with 20+ years of experience across all genres.
Analyze this audio file for mix quality, arrangement, balance, dynamics, frequency issues, and production suggestions.

Respond ONLY with a valid JSON object — no markdown, no backticks, no preamble. Format:
{
  "score": <integer 1-10>,
  "feedback": [
    {
      "severity": "<issue|warning|good|idea>",
      "element": "<short element name e.g. Kick, Snare, Low-end, Mix bus, Arrangement>",
      "feedback": "<specific, actionable observation in 1-2 sentences>",
      "action": "<concrete next step, or null>"
    }
  ],
  "overall": "<2-3 sentence overall summary of the track strengths and main improvements needed>"
}
Provide 4-7 feedback items. Be specific, technical, and genuinely helpful.`;

  if (genre) prompt += `\nGenre: ${genre}`;
  if (focuses) prompt += `\nFocus areas: ${focuses}`;
  if (notes) prompt += `\nProducer notes: ${notes}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mediaType,
                  data: audioBase64
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    const result = await response.json();

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }

    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
