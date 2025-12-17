(async () => {
  try {
    const payload = {
      application: {
        id: 'TEST-1',
        companyName: 'Acme Asbestos Removal Ltd',
        applicantName: 'John Doe',
        email: 'john@acme.com',
        phone: '5550123',
        address: '123 Industrial Way, Springfield',
        status: 'Submitted'
      },
      factSheet: null
    };

    const res = await fetch('http://localhost:5000/__api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // set a reasonable timeout via AbortController if needed
    });

    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
  } catch (e) {
    console.error('REQUEST ERROR', e);
    process.exit(1);
  }
})();
