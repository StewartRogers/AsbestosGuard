(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/policies');
    console.log('STATUS', res.status);
    const txt = await res.text();
    console.log('BODY', txt.substring(0, 200));
  } catch (e) {
    console.error('GET ERROR', e);
    process.exit(1);
  }
})();
