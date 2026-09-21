const nodemailer = require("nodemailer");
const dns = require("dns").promises;

// nodemailer does its own DNS lookup and picks Gmail's IPv6 address,
// which the host can't route to — so resolve IPv4 ourselves
const getTransporter = async () => {
    const { address } = await dns.lookup("smtp.gmail.com", { family: 4 });
    return nodemailer.createTransport({
        host: address,                          // IPv4 literal
        port: 587,
        secure: false,
        requireTLS: true,
        tls: { servername: "smtp.gmail.com" },  // certificate is for the hostname, not the IP
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const sendPasswordResetOTP = async (email, otp) => {
    const mailOptions = {
        from: `"CollabCanvas Team" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "CollabCanvas Password Reset OTP",
        text: `Your CollabCanvas password reset OTP is ${otp}. It is valid for 5 minutes. If you didn't request this, ignore this email.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
                <h2 style="color: #667eea; text-align: center; margin-top: 0;">Password Reset OTP</h2>
                <p style="color: #333; font-size: 14px;">Hi,</p>
                <p style="color: #333; font-size: 14px;">Your OTP for password reset is:</p>
                <div style="background-color: #667eea; color: white; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="margin: 0; font-size: 36px; letter-spacing: 3px; font-family: monospace;">${otp}</h1>
                </div>
                <p style="color: #e74c3c; font-size: 12px; text-align: center;"><strong>⏰ Valid for 5 minutes only</strong></p>
                <p style="color: #666; font-size: 12px; line-height: 1.5;">
                    <strong>Security:</strong> Never share this OTP with anyone. If you didn't request this, ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #999; font-size: 11px; text-align: center; margin: 0;">© 2026 CollabCanvas</p>
            </div>
        `,
    };

    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetOTP };