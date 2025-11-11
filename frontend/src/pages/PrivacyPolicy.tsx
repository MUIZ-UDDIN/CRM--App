import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link 
          to="/register" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Registration
        </Link>

        {/* Header */}
        <div className="bg-white shadow rounded-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Last updated: November 11, 2024</p>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              This Privacy Policy describes how we collect, use, and protect your personal information 
              when you use our CRM application. We are committed to ensuring that your privacy is protected 
              and that we comply with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We collect various types of information in connection with the services we provide, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Account Information:</strong> Name, email address, company name, phone number, and password</li>
              <li><strong>Contact Data:</strong> Information about your customers and contacts that you store in the CRM</li>
              <li><strong>Usage Data:</strong> Information about how you use our application, including features accessed and actions taken</li>
              <li><strong>Communication Data:</strong> Records of emails, SMS messages, and calls made through the platform</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies</li>
              <li><strong>Payment Information:</strong> Billing details and payment card information (processed securely through third-party payment processors)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>To provide, maintain, and improve our CRM services</li>
              <li>To process your transactions and manage your account</li>
              <li>To communicate with you about your account, updates, and support</li>
              <li>To send you marketing communications (with your consent)</li>
              <li>To analyze usage patterns and optimize user experience</li>
              <li>To detect, prevent, and address technical issues and security threats</li>
              <li>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Storage and Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We implement industry-standard security measures to protect your data from unauthorized access, 
              alteration, disclosure, or destruction. This includes encryption of data in transit and at rest, 
              regular security audits, and access controls. However, no method of transmission over the Internet 
              or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (e.g., Twilio for SMS, SendGrid for emails)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to respond to legal process</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
              <li><strong>Data Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our application and store 
              certain information. Cookies are files with a small amount of data that are sent to your browser 
              from a website and stored on your device. You can instruct your browser to refuse all cookies or 
              to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Third-Party Services</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Our application integrates with third-party services including:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Twilio:</strong> For SMS and voice call functionality</li>
              <li><strong>SendGrid:</strong> For email delivery services</li>
              <li><strong>Google OAuth:</strong> For Gmail integration</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              These third-party services have their own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information for as long as necessary to provide our services, comply with 
              legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we 
              will delete or anonymize your personal information within a reasonable timeframe, unless we are 
              required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our service is not intended for use by children under the age of 13. We do not knowingly collect 
              personal information from children under 13. If you become aware that a child has provided us with 
              personal information, please contact us, and we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and maintained on computers located outside of your state, 
              province, country, or other governmental jurisdiction where data protection laws may differ. We 
              take appropriate safeguards to ensure that your personal information remains protected in accordance 
              with this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review 
              this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-3 text-gray-700">
              <p>Email: privacy@crmapp.com</p>
              <p>Support: support@crmapp.com</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link 
            to="/register" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Registration
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
