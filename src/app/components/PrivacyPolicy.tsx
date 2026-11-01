
import { Link } from "react-router-dom";
import { Store, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft size={18} />
          Back to DGTrack POS
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10">

          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Store className="text-white" size={26} />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              DGTrack POS
            </h1>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Privacy Policy
          </h2>

          <p className="text-sm text-slate-500 mb-8">
            Effective date: 1 November 2026
          </p>

          <div className="space-y-7 text-slate-700 leading-7">

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                1. Introduction
              </h3>

              <p>
                This Privacy Policy explains how DGTrack POS collects,
                uses, stores and protects information when you use
                our point-of-sale and business management platform.
              </p>

              <p className="mt-2">
                By using DGTrack POS, you acknowledge that your
                information may be processed as described in this
                policy.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                2. Information We Collect
              </h3>

              <p>
                Depending on how you use the platform, we may collect:
              </p>

              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  Account information, such as your name, email
                  address and password.
                </li>
                <li>
                  Business information, including your business name.
                </li>
                <li>
                  Employee account information and assigned permissions.
                </li>
                <li>
                  Business records, including products, inventory,
                  sales, returns and reports.
                </li>
                <li>
                  Subscription and payment transaction information.
                </li>
                <li>
                  Technical information needed to operate, secure
                  and improve the platform.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                3. How We Use Information
              </h3>

              <p>We use information to:</p>

              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Create and manage business accounts.</li>
                <li>Provide sales, inventory and reporting features.</li>
                <li>Manage employees and account permissions.</li>
                <li>Process subscriptions and verify payments.</li>
                <li>Send account notifications and service emails.</li>
                <li>Provide technical support.</li>
                <li>Protect the platform against misuse and unauthorized access.</li>
                <li>Improve platform performance and reliability.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                4. Business and Customer Information
              </h3>

              <p>
                DGTrack POS allows businesses to store operational
                information, which may include information about
                their own customers and employees.
              </p>

              <p className="mt-2">
                The business account owner is responsible for ensuring
                that they have an appropriate reason and authority
                to enter and use that information.
              </p>

              <p className="mt-2">
                Business information is used to provide the platform's
                features and is not intended to be publicly displayed
                to other businesses.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                5. Payment Information
              </h3>

              <p>
                Payments may be processed through Paystack or other
                payment providers made available by DGTrack POS.
              </p>

              <p className="mt-2">
                Payment providers process payment information under
                their own privacy and security policies.
              </p>

              <p className="mt-2">
                DGTrack POS may retain transaction references,
                payment status, subscription details and other
                information needed to manage billing.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                6. Data Storage and Security
              </h3>

              <p>
                We use technical and organizational measures intended
                to protect account and business information against
                unauthorized access, alteration, loss or disclosure.
              </p>

              <p className="mt-2">
                Information may be stored using third-party hosting
                and database providers.
              </p>

              <p className="mt-2">
                No internet-based service can guarantee absolute
                security. Users should also protect their passwords
                and account access.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                7. Sharing of Information
              </h3>

              <p>
                We may share limited information with service
                providers when necessary to operate DGTrack POS,
                including providers involved in:
              </p>

              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Cloud hosting and database storage.</li>
                <li>Payment processing.</li>
                <li>Email delivery.</li>
                <li>Technical maintenance and security.</li>
              </ul>

              <p className="mt-2">
                We do not sell personal information to third parties.
                Information may also be disclosed where required
                by applicable law.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                8. Data Retention
              </h3>

              <p>
                We retain information for as long as necessary to
                provide the service, maintain business records,
                meet legal obligations and resolve disputes.
              </p>

              <p className="mt-2">
                When a trial or paid subscription expires, access
                to paid features may be restricted. Expiry does not
                automatically mean that stored business information
                is immediately deleted.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                9. Your Privacy Rights
              </h3>

              <p>
                Subject to applicable law, you may request access
                to, correction of or deletion of personal information
                associated with your account.
              </p>

              <p className="mt-2">
                Some information may need to be retained where
                required by law or for legitimate operational purposes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                10. Changes to This Policy
              </h3>

              <p>
                We may update this Privacy Policy when our services
                or legal obligations change.
              </p>

              <p className="mt-2">
                Updated versions will be published on this page
                with a revised effective date.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                11. Contact Us
              </h3>

              <p>
                For privacy questions or requests concerning your
                information, contact:
              </p>

              <a
                href="mailto:SSEUN3568@GMAIL.COM"
                className="text-blue-600 hover:underline font-medium"
              >
                SSEUN3568@GMAIL.COM
              </a>
            </section>

            <section className="border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-500">
                Read our{" "}
                <Link
                  to="/terms"
                  className="text-blue-600 hover:underline"
                >
                  Terms and Conditions
                </Link>.
              </p>
            </section>

          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} DGTrack POS. All rights reserved.
        </p>

      </div>
    </div>
  );
}
