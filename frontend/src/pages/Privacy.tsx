import React from 'react';

const Privacy: React.FC = () => (
  <div className="max-w-2xl mx-auto py-12 px-4 text-gray-900">
    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
    <p className="mb-4">
      ID8 ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform, located at <a href="https://id8.app" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">https://id8.app</a>.
    </p>
    <h2 className="font-semibold mt-6 mb-2">1. INFORMATION WE COLLECT</h2>
    <p className="mb-2">We collect the following information when you use our Service:</p>
    <ul className="list-disc list-inside mb-4">
      <li><b>Account Info:</b> Name, email, login credentials, LinkedIn/GitHub profiles</li>
      <li><b>Profile Info:</b> Uploaded resumes, skills, experience, goals</li>
      <li><b>Usage Data:</b> Pages visited, features used, feedback submitted</li>
      <li><b>Payment Data:</b> Managed via Stripe; we do not store full payment credentials</li>
      <li><b>Communications:</b> Support messages, collaboration comments, referral invites</li>
    </ul>
    <h2 className="font-semibold mt-6 mb-2">2. HOW WE USE YOUR INFORMATION</h2>
    <p className="mb-2">We use your information to:</p>
    <ul className="list-disc list-inside mb-4">
      <li>Provide and improve our services</li>
      <li>Generate AI-enhanced ideas and insights</li>
      <li>Facilitate collaboration and data sharing</li>
      <li>Process subscriptions and payments</li>
      <li>Send relevant product updates and emails</li>
      <li>Comply with legal obligations</li>
    </ul>
    <h2 className="font-semibold mt-6 mb-2">3. DATA SHARING</h2>
    <p className="mb-2">We share your data only as necessary:</p>
    <ul className="list-disc list-inside mb-4">
      <li>With service providers (e.g., Stripe, Resend, Twilio)</li>
      <li>With collaborators you invite to your workspace</li>
      <li>As required by law or in connection with a legal claim</li>
    </ul>
    <p className="mb-4">We do not sell or rent your personal information.</p>
    <h2 className="font-semibold mt-6 mb-2">4. DATA STORAGE &amp; SECURITY</h2>
    <ul className="list-disc list-inside mb-4">
      <li>Data is stored securely using encrypted services</li>
      <li>We take appropriate technical and organizational measures to protect your data</li>
      <li>In the event of a data breach, we will notify affected users as required by law</li>
    </ul>
    <h2 className="font-semibold mt-6 mb-2">5. COOKIES &amp; TRACKING</h2>
    <p className="mb-4">We use cookies and similar technologies to enhance your experience, analyze usage, and deliver tailored content. You can adjust your cookie settings in your browser.</p>
    <h2 className="font-semibold mt-6 mb-2">6. INTERNATIONAL USERS</h2>
    <p className="mb-4">If you are accessing the Service from outside the United States, you understand that your information may be transferred to and processed in the U.S.</p>
    <h2 className="font-semibold mt-6 mb-2">7. YOUR RIGHTS</h2>
    <p className="mb-2">You may:</p>
    <ul className="list-disc list-inside mb-4">
      <li>Access or update your account information</li>
      <li>Delete your account and associated data</li>
      <li>Request a copy of your personal data</li>
    </ul>
    <p className="mb-4">Email <a href="mailto:privacy@id8.app" className="text-blue-600 underline">privacy@id8.app</a> to submit a request.</p>
    <h2 className="font-semibold mt-6 mb-2">8. CHILDREN'S PRIVACY</h2>
    <p className="mb-4">Our service is not intended for children under 13. We do not knowingly collect information from children.</p>
    <h2 className="font-semibold mt-6 mb-2">9. CHANGES TO THIS POLICY</h2>
    <p className="mb-4">We may update this Privacy Policy periodically. We will notify you of significant changes via email or in-app notifications.</p>
    <h2 className="font-semibold mt-6 mb-2">10. CONTACT US</h2>
    <p className="mb-4">For privacy-related concerns, email: <a href="mailto:privacy@id8.app" className="text-blue-600 underline">privacy@id8.app</a></p>
  </div>
);

export default Privacy; 