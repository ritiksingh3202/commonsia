import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy" },
  description:
    "How Commonsia collects, uses, and protects your information when you use our mentorship platform.",
};

const EFFECTIVE = "April 14, 2026";

export default function PrivacyPolicyPage() {
  return (
    <MarketingShell>
      <LegalLayout
        title="Privacy Policy"
        effectiveDateLabel={EFFECTIVE}
        seeAlsoHref="/terms"
        seeAlsoLabel="Terms of Service"
      >
        <section>
          <p>
            Commonsia (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This Privacy Policy
            describes how we collect, use, disclose, and safeguard information when you use our website and services
            (collectively, the &quot;Platform&quot;). By using the Platform, you agree to this policy. If you do not
            agree, please do not use the Platform.
          </p>
        </section>

        <section>
          <h2>1. Information we collect</h2>
          <p>We may collect the following categories of information:</p>
          <ul>
            <li>
              <strong>Account and profile information</strong>, such as your name, email address, role (for example,
              student or mentor), profile details you choose to provide, and authentication identifiers when you sign in
              with a third-party provider.
            </li>
            <li>
              <strong>Usage and technical data</strong>, such as pages viewed, features used, approximate location
              derived from IP address where applicable, device and browser type, and timestamps—used to operate,
              secure, and improve the Platform.
            </li>
            <li>
              <strong>Communications</strong>, including messages, session requests, and support inquiries you send
              through or in connection with the Platform.
            </li>
            <li>
              <strong>Payment-related information</strong>, if applicable: payments are processed by third-party
              providers; we typically receive limited transaction metadata rather than full card numbers.
            </li>
          </ul>
        </section>

        <section>
          <h2>2. How we use your information</h2>
          <p>We use the information above to:</p>
          <ul>
            <li>Provide, maintain, and improve the Platform and user experience.</li>
            <li>Connect students with relevant mentors and facilitate scheduling and communication.</li>
            <li>Authenticate users, prevent fraud and abuse, and enforce our Terms of Service.</li>
            <li>Send service-related notices and, where permitted, product updates; you may opt out of non-essential email
              where applicable.</li>
            <li>Comply with legal obligations and respond to lawful requests.</li>
          </ul>
        </section>

        <section>
          <h2>3. How we share information</h2>
          <p>
            <strong>We do not sell your personal information.</strong> We may share information in these circumstances:
          </p>
          <ul>
            <li>
              <strong>Service providers</strong> who assist us with hosting, analytics, email delivery, authentication,
              payments, or similar functions, subject to confidentiality and processing terms.
            </li>
            <li>
              <strong>Other users</strong>, as needed to operate the Platform—for example, profile information visible to
              mentors or students as part of the product experience.
            </li>
            <li>
              <strong>Legal and safety</strong>, when we believe disclosure is required by law, regulation, legal
              process, or government request, or to protect the rights, safety, or property of Commonsia, our users, or
              others.
            </li>
            <li>
              <strong>Business transfers</strong>, in connection with a merger, acquisition, or sale of assets, where
              your information may transfer as part of that transaction.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Data retention and security</h2>
          <p>
            We retain information for as long as your account is active or as needed to provide the Platform, comply
            with legal obligations, resolve disputes, and enforce our agreements. We implement reasonable technical and
            organizational measures to protect your data. No method of transmission or storage is completely secure; we
            cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2>5. Your rights and choices</h2>
          <p>Depending on your location, you may have rights to:</p>
          <ul>
            <li>Access, correct, or update personal information in your account settings where available.</li>
            <li>Request deletion of your account or certain data, subject to legal and legitimate business exceptions.</li>
            <li>Object to or restrict certain processing, or withdraw consent where processing is consent-based.</li>
          </ul>
          <p>
            To exercise these rights, contact us at{" "}
            <a href="mailto:admin@commonsia.com" className="font-medium text-primary hover:underline">
              admin@commonsia.com
            </a>
            . We may verify your identity before fulfilling requests.
          </p>
        </section>

        <section>
          <h2>6. Third-party services</h2>
          <p>
            The Platform may integrate third-party sign-in, analytics, or payment providers. Those services have their
            own privacy policies. We encourage you to read them. Commonsia is not responsible for third-party practices
            beyond our control.
          </p>
        </section>

        <section>
          <h2>7. International users</h2>
          <p>
            If you access the Platform from outside the country where we operate servers or subprocessors, your
            information may be transferred to and processed in other jurisdictions. We take steps designed to ensure
            appropriate safeguards where required by law.
          </p>
        </section>

        <section>
          <h2>8. Children&apos;s privacy</h2>
          <p>
            The Platform is not directed at children under the age required by applicable law to use such services without
            parental consent. If you believe we have collected information from a child inappropriately, contact us and
            we will take appropriate steps.
          </p>
        </section>

        <section>
          <h2>9. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised policy with a new effective
            date and, where appropriate, provide additional notice. Continued use of the Platform after changes become
            effective constitutes acceptance of the updated policy, to the extent permitted by law.
          </p>
        </section>

        <section>
          <h2>10. Contact us</h2>
          <p>
            For questions about this Privacy Policy or our data practices, email{" "}
            <a href="mailto:admin@commonsia.com" className="font-medium text-primary hover:underline">
              admin@commonsia.com
            </a>{" "}
            or use our{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              contact page
            </Link>
            .
          </p>
        </section>
      </LegalLayout>
    </MarketingShell>
  );
}
