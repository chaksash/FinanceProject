// netlify/functions/ask-claude.js

const handler = async (event) => {

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Netlify environment variables.' })
    };
  }

  try {
    const { question, summary } = JSON.parse(event.body);

    if (!question) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No question provided' }) };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: `You are a personal finance assistant for Ashish Chakravarti, based in Dubai, UAE. You have access to his complete financial transaction data summarised below. Answer questions concisely, helpfully and specifically using the data provided. All amounts are in AED (UAE Dirhams). Format large numbers with commas. Be precise with figures from the data. If the question cannot be answered from the data, say so clearly.\n\nFINANCIAL DATA SUMMARY:\n${JSON.stringify(summary)}`,
        messages: [{ role: 'user', content: question }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errText })
      };
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text || 'No response received.';

    return { statusCode: 200, headers, body: JSON.stringify({ answer }) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', details: err.message })
    };
  }
};

module.exports = { handler };
