// netlify/functions/ask-claude.js
// Secure proxy — ES Module format for modern Netlify runtime

export default async (request, context) => {

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  // Get API key from Netlify environment variables
  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Netlify environment variables.' }),
      { status: 500, headers }
    );
  }

  try {
    const { question, summary } = await request.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'No question provided' }),
        { status: 400, headers }
      );
    }

    // Call Anthropic API securely from the server
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
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errText }),
        { status: response.status, headers }
      );
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text || 'No response received.';

    return new Response(
      JSON.stringify({ answer }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Server error', details: err.message }),
      { status: 500, headers }
    );
  }
};

export const config = {
  path: '/api/ask'
};
