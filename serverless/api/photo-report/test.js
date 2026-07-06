const url = 'https://ebfrecxaiuyvxihfjgsvdfwf4u0nlqyu.lambda-url.us-east-1.on.aws/';
const payload = { nombre: 'Test Actor', slug: 'test-actor' };

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
.then(async res => {
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
})
.catch(err => console.error(err));
