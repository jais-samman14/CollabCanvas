// =============================================================================
// HTTPS Email Service (Brevo REST API + Local Console Fallback)
// =============================================================================
// WHY WE REMOVED NODEMAILER / SMTP:
//   Render's free tier blocks outbound SMTP ports (25, 465, 587) to stop spam.
//   Brevo's REST API runs over normal HTTPS (port 443), which Render allows!
//   When running locally without a Brevo API key, the OTP is printed right in
//   your terminal so you can test password resets immediately.
// =============================================================================

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const SEND_TIMEOUT_MS = 10000;

/**
 * WHAT IT DOES: Sends an email by making a standard HTTPS POST request to Brevo.
 * SECURITY: Never prints or includes BREVO_API_KEY inside thrown error messages.
 */
const sendViaBrevo = async ({ to, subject, html }) => {
  const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!senderEmail) {
    throw new Error('EMAIL_FROM is not set (use a sender address verified in Brevo)');
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME || 'CollabCanvas Team',
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`Brevo API responded ${res.status}: ${detail}`);
  }
};

/**
 * WHAT IT DOES: Chooses how to deliver an email:
 *   - If BREVO_API_KEY is set -> sends real email over HTTPS port 443.
 *   - If in local development without a key -> prints the OTP to the terminal.
 *   - If in production without a key -> throws a clear setup error.
 */
const sendMail = async (message) => {
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(message);
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'BREVO_API_KEY is required in production (Render free tier blocks outbound SMTP ports)'
    );
  }

  console.log('\n================================================');
  console.log('[DEV EMAIL FALLBACK — BREVO_API_KEY not set]');
  console.log(`To:      ${message.to}`);
  console.log(`Subject: ${message.subject}`);
  if (message.devPreview) console.log(`OTP:     ${message.devPreview}`);
  console.log('================================================\n');
};

/**
 * WHAT IT DOES: Builds the HTML template for the 6-digit password reset OTP and sends it.
 */
const sendPasswordResetOTP = async (email, otp) => {
  await sendMail({
    to: email,
    subject: 'CollabCanvas Password Reset OTP',
    devPreview: otp,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
        <h2 style="color: #4f46e5; text-align: center; margin-top: 0;">Password Reset OTP</h2>
        <p style="color: #334155; font-size: 14px;">Hi,</p>
        <p style="color: #334155; font-size: 14px;">Use the verification code below to reset your CollabCanvas password:</p>
        <div style="background-color: #4f46e5; color: #ffffff; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="margin: 0; font-size: 36px; letter-spacing: 4px; font-family: monospace;">${otp}</h1>
        </div>
        <p style="color: #dc2626; font-size: 12px; text-align: center;"><strong>Valid for 5 minutes only</strong></p>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
          <strong>Security notice:</strong> Never share this OTP with anyone. If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = { sendPasswordResetOTP };
