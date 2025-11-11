import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const TermsOfService: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500">Last updated: November 11, 2024</p>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using this CRM application, you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do not 
              use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use License</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Permission is granted to temporarily access and use the CRM application for personal or 
              commercial purposes. This is the grant of a license, not a transfer of title, and under 
              this license you may not:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose without proper licensing</li>
              <li>Attempt to decompile or reverse engineer any software contained in the application</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
            <p className="text-gray-700 leading-relaxed">
              To use certain features of the service, you must register for an account. You agree to 
              provide accurate, current, and complete information during the registration process and 
              to update such information to keep it accurate, current, and complete. You are responsible 
              for safeguarding your password and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Free Trial</h2>
            <p className="text-gray-700 leading-relaxed">
              New users are granted a 14-day free trial period. During this period, you have full access 
              to all features of the application. After the trial period expires, you must subscribe to 
              a paid plan to continue using the service. No credit card is required for the trial period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. User Data and Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Your use of the CRM application is also governed by our Privacy Policy. Please review our 
              Privacy Policy, which also governs the site and informs users of our data collection practices. 
              We take data security seriously and implement industry-standard measures to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Acceptable Use</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              You agree not to use the CRM application:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
              <li>To upload or transmit viruses or any other type of malicious code</li>
              <li>To spam, phish, pharm, pretext, spider, crawl, or scrape</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Service Modifications</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify or discontinue, temporarily or permanently, the service 
              (or any part thereof) with or without notice. You agree that we shall not be liable to 
              you or to any third party for any modification, suspension, or discontinuance of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              In no event shall the CRM application or its suppliers be liable for any damages (including, 
              without limitation, damages for loss of data or profit, or due to business interruption) 
              arising out of the use or inability to use the materials on the application, even if we or 
              our authorized representative has been notified orally or in writing of the possibility of 
              such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We may terminate or suspend your account and bar access to the service immediately, without 
              prior notice or liability, under our sole discretion, for any reason whatsoever and without 
              limitation, including but not limited to a breach of the Terms. If you wish to terminate 
              your account, you may simply discontinue using the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at 
              support@crmapp.com
            </p>
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

export default TermsOfService;
