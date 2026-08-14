import dotenv from 'dotenv';
dotenv.config();

export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  const htmlTemplate = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e5e7eb; padding: 40px 20px; width: 100%; box-sizing: border-box;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #374151; border-radius: 8px; padding: 40px; text-align: center;">
    <h1 style="color: #ffffff; font-size: 28px; margin-top: 0; letter-spacing: 2px; text-transform: uppercase;">Tanzanian Galaxy</h1>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #d1d5db;">
      Welcome aboard! We're thrilled to have you join our creative space. Please verify your email address to complete your registration.
    </p>
    <a href="${verificationUrl}" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 14px 28px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">Verify Email</a>
    <p style="font-size: 14px; margin-top: 40px; color: #9ca3af;">
      If the button above doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; word-break: break-all; color: #6b7280; margin-bottom: 30px;">
      <a href="${verificationUrl}" style="color: #6b7280;">${verificationUrl}</a>
    </p>
    <div style="border-top: 1px solid #374151; padding-top: 20px; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">This link will expire in 24 hours.</p>
      <p style="margin: 5px 0 0;">&copy; ${new Date().getFullYear()} Tanzanian Galaxy. All rights reserved.</p>
    </div>
  </div>
</div>
  `;

  const payload = {
    apiKey: process.env.APPS_SCRIPT_KEY,
    to: email,
    subject: 'Verify your email for Tanzanian Galaxy',
    body: `Welcome to Tanzanian Galaxy!\n\nPlease verify your email by clicking on this link: ${verificationUrl}\n\nOr copy and paste this link into your browser: ${verificationUrl}\n\nThis link will expire in 24 hours.`,
    htmlBody: htmlTemplate
  };

  try {
    const response = await fetch(process.env.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to send verification email via Apps Script');
    }
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};
