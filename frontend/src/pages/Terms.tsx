import React from 'react';

const Terms: React.FC = () => (
  <div className="max-w-2xl mx-auto py-12 px-4 text-gray-900">
    <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
    <p className="mb-4">
      Welcome to ID8 ("we", "our", or "us"). These Terms of Service ("Terms") govern your access to and use of our platform, located at <a href="https://id8.app" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">https://id8.app</a>, and related services (collectively, the "Service"). By creating an account, using the platform, or accessing any of our services, you agree to these Terms.
    </p>
    <h2 className="font-semibold mt-6 mb-2">1. ELIGIBILITY</h2>
    <p className="mb-4">You must be at least 18 years old and legally able to enter into contracts. By using ID8, you affirm that you meet these requirements.</p>
    <h2 className="font-semibold mt-6 mb-2">2. ACCOUNT REGISTRATION</h2>
    <p className="mb-4">You may be required to create an account and provide personal or professional information. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</p>
    <h2 className="font-semibold mt-6 mb-2">3. USE OF THE SERVICE</h2>
    <p className="mb-2">You agree not to:</p>
    <ul className="list-disc list-inside mb-4">
      <li>Use the platform for any unlawful or fraudulent activity;</li>
      <li>Attempt to reverse-engineer or scrape our platform;</li>
      <li>Post or share content that is harmful, defamatory, or violates intellectual property rights;</li>
      <li>Use automated systems to access our service without authorization.</li>
    </ul>
    <h2 className="font-semibold mt-6 mb-2">4. AI-GENERATED CONTENT</h2>
    <p className="mb-2">Our platform uses artificial intelligence to assist with idea generation, validation, and content creation. All outputs may contain inaccuracies or incomplete information. You understand and agree that:</p>
    <ul className="list-disc list-inside mb-4">
      <li>AI-generated content is provided <b>"as-is"</b> and does not constitute business, legal, or financial advice;</li>
      <li>You are solely responsible for decisions made using any outputs.</li>
    </ul>
    <h2 className="font-semibold mt-6 mb-2">5. USER CONTENT</h2>
    <p className="mb-4">You retain all rights to content you input or upload (resumes, ideas, documents, etc.). By using the Service, you grant ID8 a limited license to use, store, and display your content to operate the platform.</p>
    <h2 className="font-semibold mt-6 mb-2">6. COLLABORATION &amp; SHARING</h2>
    <p className="mb-4">You may share content with collaborators under defined permissions. You are responsible for what you share and who you invite.</p>
    <h2 className="font-semibold mt-6 mb-2">7. PAYMENTS &amp; SUBSCRIPTIONS</h2>
    <p className="mb-4">Premium features are available via subscription through Stripe. By subscribing, you authorize us to charge your payment method on a recurring basis. You may cancel anytime via your account settings. Refunds are not guaranteed.</p>
    <h2 className="font-semibold mt-6 mb-2">8. TERMINATION</h2>
    <p className="mb-4">We reserve the right to suspend or terminate your account at our discretion, with or without notice, if we believe you have violated these Terms.</p>
    <h2 className="font-semibold mt-6 mb-2">9. THIRD-PARTY SERVICES</h2>
    <p className="mb-4">We may integrate third-party services (e.g., GitHub, Stripe, LinkedIn). Your use of these services is governed by their respective terms.</p>
    <h2 className="font-semibold mt-6 mb-2">10. LIMITATION OF LIABILITY</h2>
    <p className="mb-4">To the fullest extent permitted by law, ID8 shall not be liable for any indirect, incidental, special, or consequential damages, including loss of profits or data.</p>
    <h2 className="font-semibold mt-6 mb-2">11. CHANGES TO TERMS</h2>
    <p className="mb-4">We may update these Terms from time to time. Continued use of the Service after such changes constitutes acceptance of the revised Terms.</p>
    <h2 className="font-semibold mt-6 mb-2">12. GOVERNING LAW</h2>
    <p className="mb-4">These Terms are governed by the laws of the State of Delaware, without regard to its conflict of law principles.</p>
    <h2 className="font-semibold mt-6 mb-2">13. CONTACT US</h2>
    <p className="mb-4">For questions or concerns, contact us at <a href="mailto:legal@id8.app" className="text-blue-600 underline">legal@id8.app</a>.</p>
  </div>
);

export default Terms; 