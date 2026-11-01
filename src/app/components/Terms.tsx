
import { Link } from "react-router-dom";
import { Store, ArrowLeft } from "lucide-react";

export default function Terms() {
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
            Terms and Conditions
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
                These Terms and Conditions govern your access to and use
                of DGTrack POS, a point-of-sale and business management
                platform operated under the name DGTrack POS.
              </p>
              <p className="mt-2">
                By creating an account or using the service, you agree
                to these Terms and Conditions. If you do not agree,
                you should not create an account or use the service.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                2. Account Registration
              </h3>
              <p>
                You must provide accurate and up-to-date information
                when creating an account, including your name, email
                address and business name.
              </p>
              <p className="mt-2">
                You are responsible for maintaining the confidentiality
                of your login details and for activities carried out
                through your account.
              </p>
              <p className="mt-2">
                You must notify us if you become aware of unauthorized
                access to your account.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                3. Free Trial
              </h3>
              <p>
                New eligible accounts receive a 14-day free trial of
                the Professional plan, subject to the features and
                conditions displayed during registration.
              </p>
              <p className="mt-2">
                The trial begins when your account is successfully
                created and ends on the expiry date recorded in your
                account.
              </p>
              <p className="mt-2">
                The free trial does not automatically charge you.
                You must choose and pay for a subscription to continue
                using paid features after the trial expires.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                4. Subscriptions and Payments
              </h3>
              <p>
                DGTrack POS offers subscription plans with different
                prices, features and usage limits. Current plan details
                are displayed within the platform.
              </p>
              <p className="mt-2">
                Payments are processed through Paystack or another
                payment provider made available by DGTrack POS.
                Payment processing is also subject to the provider's
                terms and policies.
              </p>
              <p className="mt-2">
                Your paid subscription becomes active after successful
                payment verification.
              </p>
              <p className="mt-2">
                Any recurring payment arrangement must be clearly
                disclosed and expressly authorized by you.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                5. Cancellation and Expiry
              </h3>
              <p>
                You may cancel your subscription through the available
                account settings or by contacting us.
              </p>
              <p className="mt-2">
                Cancellation does not necessarily end access immediately.
                Where applicable, access continues until the end of the
                paid subscription period.
              </p>
              <p className="mt-2">
                When a trial or paid subscription expires without
                renewal, access to paid features may be restricted.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                6. Your Business Data
              </h3>
              <p>
                You remain responsible for the accuracy, legality and
                management of the business information you enter into
                DGTrack POS.
              </p>
              <p className="mt-2">
                You should maintain appropriate independent records
                and backups of important business information.
              </p>
              <p className="mt-2">
                Subscription expiry or cancellation does not by itself
                transfer ownership of your business data to DGTrack POS.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                7. Acceptable Use
              </h3>
              <p>
                You agree not to misuse the platform, attempt
                unauthorized access, interfere with its operation,
                or use it for unlawful activities.
              </p>
              <p className="mt-2">
                You are responsible for managing the access and
                permissions of employees using your business account.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                8. Service Availability
              </h3>
              <p>
                We aim to keep DGTrack POS available and reliable.
                However, access may occasionally be interrupted by
                maintenance, technical problems, network failures
                or circumstances beyond our reasonable control.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                9. Changes to the Service or Terms
              </h3>
              <p>
                We may update the platform, subscription plans or
                these Terms from time to time.
              </p>
              <p className="mt-2">
                Where a material change affects users, we will take
                reasonable steps to communicate the change.
              </p>
              <p className="mt-2">
                Updated terms will be published on this page with
                a revised effective date.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                10. Contact Us
              </h3>
              <p>
                For questions, complaints or assistance relating to
                these Terms and Conditions, contact:
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
                See also our{" "}
                <Link
                  to="/privacy"
                  className="text-blue-600 hover:underline"
                >
                  Privacy Policy
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
