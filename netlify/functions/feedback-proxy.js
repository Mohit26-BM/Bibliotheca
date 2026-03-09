// ============================================================
// Feedback Proxy Function for Netlify
// Keeps WEB3FORMS_ACCESS_KEY server-side only
// Frontend calls this function instead of calling Web3Forms directly
// ============================================================

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get authorization token — feedback should only be allowed for authenticated users
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    const formData = JSON.parse(event.body);

    // Submit to Web3Forms with the server-side access key
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_ACCESS_KEY,
        ...formData
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: result.message || 'Failed to submit feedback' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Feedback proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Server error' })
    };
  }
};
