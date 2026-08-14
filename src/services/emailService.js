import dotenv from 'dotenv';
dotenv.config();

export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  const payload = {
    apiKey: process.env.APPS_SCRIPT_KEY,
    to: email,
    subject: 'Verify your email for Mnembo Blog',
    body: `Welcome to Mnembo Blog!\n\nPlease verify your email by clicking on this link: ${verificationUrl}\n\nOr copy and paste this link into your browser: ${verificationUrl}\n\nThis link will expire in 24 hours.`
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
