import { Resend } from 'resend';

// If you didn't set RESEND_API_KEY in your .env, you can paste it directly here for testing
const resend = new Resend(process.env.RESEND_API_KEY || 're_9LkXGBSe_2De9ii3RXMevDz4Y94H34y65');

async function testEmail() {
  try {
    console.log('Attempting to send test email...');
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Resend's default testing domain
      to: ['YOUR_GMAIL_HERE@gmail.com'], // <-- REPLACE THIS WITH YOUR GMAIL
      subject: 'Hello from Resend',
      html: '<strong>It works!</strong> This is a test email from the ROTC PWA.',
    });

    if (error) {
      console.error('Failed to send email:', error);
      return;
    }

    console.log('Email sent successfully!', data);
  } catch (err) {
    console.error('Exception caught:', err);
  }
}

testEmail();
