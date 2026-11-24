const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => {
  delete require.cache[require.resolve('../services/emailService')];
  return require('../services/emailService');
};

test('sends through the Brevo HTTPS API with the right request shape', async () => {
  process.env.BREVO_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'noreply@example.com';
  let captured;
  global.fetch = async (url, opts) => {
    captured = { url, opts, body: JSON.parse(opts.body) };
    return { ok: true, status: 201, text: async () => '' };
  };
  const { sendPasswordResetOTP } = load();
  await sendPasswordResetOTP('user@example.com', '123456');

  assert.equal(captured.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(captured.opts.method, 'POST');
  assert.equal(captured.opts.headers['api-key'], 'test-key');
  assert.deepEqual(captured.body.to, [{ email: 'user@example.com' }]);
  assert.equal(captured.body.sender.email, 'noreply@example.com');
  assert.match(captured.body.htmlContent, /123456/);
  assert.equal(captured.body.textContent, undefined); // Brevo: one body type per request
});

test('throws a useful error (without the API key) when Brevo rejects', async () => {
  process.env.BREVO_API_KEY = 'secret-key-value';
  process.env.EMAIL_FROM = 'noreply@example.com';
  global.fetch = async () => ({ ok: false, status: 401, text: async () => '{"message":"Key not found"}' });
  const { sendPasswordResetOTP } = load();
  await assert.rejects(
    () => sendPasswordResetOTP('a@b.com', '111111'),
    (err) => /401/.test(err.message) && !err.message.includes('secret-key-value')
  );
});

test('fails clearly when no verified sender is configured', async () => {
  process.env.BREVO_API_KEY = 'k';
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_USER;
  global.fetch = async () => ({ ok: true });
  const { sendPasswordResetOTP } = load();
  await assert.rejects(() => sendPasswordResetOTP('a@b.com', '1'), /EMAIL_FROM/);
});
