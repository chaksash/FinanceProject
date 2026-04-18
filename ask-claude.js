// netlify/functions/ask-claude.js
// Secure proxy — keeps your Anthropic API key on the server, never in the browser.

exports.handler = async function(event, context) {

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // CORS headers — allow your GitHub Pages domain and Netlify domain
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Get the API key from Netlify environment variables (you set this in Netlify dashboard)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API key not configured. Please add ANTHROPIC_API_KEY in Netlify environment variables.' })
    };
  }

  try {
    // Parse the request body sent from the dashboard
    const { question, summary } = JSON.parse(event.body);

    if (!question) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No question provided' }) };
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
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errText })
      };
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text || 'No response received.';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error', details: err.message })
    };
  }
};
