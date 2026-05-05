export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audioBase64, mediaType, genre, focuses, notes } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const systemPrompt = `You are an expert music producer and mixing engineer with 20+ years of experience across all genres.
Analyze audio files for mix quality, arrangement, balance, dynamics, frequency issues, and production suggestions.

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
  "overall": "<2-3 sentence overall summary of the track's strengths and main improvements needed>"
}
Provide 4-7 feedback items. Be specific, technical, and genuinely helpful.`;

  let userContent = `Please analyze this audio file and give me professional music production feedback.`;
  if (genre) userContent += `\nGenre: ${genre}`;
  if (focuses) userContent += `\nFocus areas: ${focuses}`;
  if (notes) userContent += `\nProducer notes: ${notes}`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: mediaType, data: audioBase64 }
            },
            { type: 'text', text: userContent }
          ]
        }]
      })
    });

    const result = await anthropicRes.json();

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }

    const raw = (result.content || []).map(b => b.text || '').join('');
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
