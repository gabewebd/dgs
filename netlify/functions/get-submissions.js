/* ============================================================
   NETLIFY FUNCTION: get-submissions
   ------------------------------------------------------------
   Beginner note: this file runs on Netlify's server, not in the
   visitor's browser. It is the only place that touches your
   Netlify API token, so the token is never exposed to the
   dashboard page itself.

   It needs THREE environment variables set in your Netlify site
   (Site settings > Environment variables):

     NETLIFY_ACCESS_TOKEN   Personal access token from
                            https://app.netlify.com/user/applications
     NETLIFY_SITE_ID        Your site's API ID, found in
                            Site settings > General > Site details
     DASHBOARD_PASSWORD     A password you choose for the CRM
                            dashboard. Share it only with the two
                            team members who use the dashboard.

   See README.md for step by step setup instructions.
   ============================================================ */

exports.handler = async function (event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { password } = body;
  const {
    NETLIFY_ACCESS_TOKEN,
    NETLIFY_SITE_ID,
    DASHBOARD_PASSWORD,
    FORM_NAME
  } = process.env;

  // ---- Check the dashboard password ----
  if (!DASHBOARD_PASSWORD || password !== DASHBOARD_PASSWORD) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect password.' }) };
  }

  if (!NETLIFY_ACCESS_TOKEN || !NETLIFY_SITE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'The dashboard is not fully set up yet. NETLIFY_ACCESS_TOKEN and NETLIFY_SITE_ID need to be added in Site settings > Environment variables.'
      })
    };
  }

  try {
    // Step 1: find the lead-inquiry form's ID for this site
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/forms`,
      { headers: { Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}` } }
    );
    if (!formsRes.ok) {
      throw new Error(`Could not list forms (status ${formsRes.status}). Check NETLIFY_SITE_ID and NETLIFY_ACCESS_TOKEN.`);
    }
    const forms = await formsRes.json();
    const targetFormName = FORM_NAME || 'lead-inquiry';
    const form = forms.find((f) => f.name === targetFormName);

    if (!form) {
      // No submissions yet means the form may not be registered until the first real submit
      return { statusCode: 200, body: JSON.stringify({ submissions: [], note: 'No submissions yet, or the form has not been deployed. Submit the form once on the live site first.' }) };
    }

    // Step 2: fetch that form's submissions
    const subsRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${form.id}/submissions`,
      { headers: { Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}` } }
    );
    if (!subsRes.ok) {
      throw new Error(`Could not fetch submissions (status ${subsRes.status}).`);
    }
    const submissions = await subsRes.json();

    // Shape the data down to what the dashboard needs
    const clean = submissions.map((s) => ({
      id: s.id,
      createdAt: s.created_at,
      name: s.data['Full Name'] || '',
      email: s.data['Email'] || '',
      phone: s.data['Phone'] || '',
      service: s.data['Service Needed'] || '',
      budget: s.data['Budget'] || '',
      urgency: s.data['Urgency'] || '',
      message: s.data['Message'] || ''
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { statusCode: 200, body: JSON.stringify({ submissions: clean }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
