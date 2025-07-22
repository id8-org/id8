import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create transporter for MailHog
const transporter = nodemailer.createTransport({
  host: 'mailhog', // Docker service name
  port: 1025,
  secure: false
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Log the signup (in production, you'd store this in a database)
    console.log(`New signup: ${email}`);

    // Send confirmation email via MailHog
    const mailOptions = {
      from: 'noreply@id8.com',
      to: email,
      subject: 'Welcome to ID8 - Early Access Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1e40af;">Welcome to ID8! 🚀</h1>
          <p>Thank you for signing up for early access to ID8!</p>
          <p>We're excited to help you unlock your next big idea with AI-powered idea generation, validation, and deep dives.</p>
          <p>You'll be among the first to know when we launch. In the meantime, here's what you can expect:</p>
          <ul>
            <li>Personalized idea generation based on your skills and interests</li>
            <li>Deep dive analysis with market, product, and funding insights</li>
            <li>Collaborative tools to refine and launch your ideas</li>
          </ul>
          <p>Stay tuned for updates!</p>
          <p>Best regards,<br>The ID8 Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: 'Signup successful! Check your email for confirmation.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to process signup' },
      { status: 500 }
    );
  }
} 