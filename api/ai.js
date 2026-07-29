const MODEL = 'deepseek-v4-flash'
const URL = 'https://api.deepseek.com/anthropic/v1/messages'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { prompt, maxTokens = 500, apiKey: userApiKey } = req.body ?? {}
  const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    res.status(200).json({ text: '' })
    return
  }

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' })
    return
  }

  try {
    const dsRes = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!dsRes.ok) {
      res.status(dsRes.status).json({ error: 'DeepSeek request failed' })
      return
    }

    const json = await dsRes.json()
    const text = json.content?.[0]?.text ?? ''
    res.status(200).json({ text })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
