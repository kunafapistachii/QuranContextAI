const MODEL = 'gemini-2.5-flash'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { prompt, maxOutputTokens = 500, apiKey: userApiKey } = req.body ?? {}
  const apiKey = userApiKey || process.env.GEMINI_API_KEY

  if (!apiKey) {
    res.status(200).json({ text: '' })
    return
  }

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' })
    return
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })

    if (!geminiRes.ok) {
      res.status(geminiRes.status).json({ error: 'Gemini request failed' })
      return
    }

    const json = await geminiRes.json()
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    res.status(200).json({ text })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
