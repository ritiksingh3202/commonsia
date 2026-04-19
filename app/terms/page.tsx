import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { MarketingShell } from "@/components/layout/MarketingShell";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service" },
  description:
    "Terms governing your use of Commonsia, the mentorship platform connecting architecture students with industry experts.",
};

const EFFECTIVE = "April 14, 2026";

export default function TermsOfServicePage() {
  return (
    <MarketingShell>
      <LegalLayout
        title="Terms of Service"
        effectiveDateLabel={EFFECTIVE}
        seeAlsoHref="/privacy"
        seeAlsoLabel="Privacy Policy"
      >
        <section>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Commonsia website, apps,
            and related services (the &quot;Platform&quot;). By creating an account, accessing, or using the Platform, you
            agree to these Terms. If you do not agree, do not use the Platform.
          </p>
        </section>

        <section>
          <h2>1. The Platform</h2>
          <p>
            Commonsia provides a platform that connects students with industry mentors and experts for guidance,
            feedback, and professional insight. Commonsia is not a university, employer, or licensed professional advisor.
            We do not guarantee any particular outcome from mentorship, sessions, or other interactions on the Platform.
          </p>
        </section>

        <section>
          <h2>2. Eligibility and accounts</h2>
          <p>You agree to:</p>
          <ul>
            <li>Provide accurate, current registration and profile information and keep it updated.</li>
            <li>Maintain the confidentiality of your credentials and notify us of unauthorized use.</li>
            <li>Use the Platform only in compliance with applicable laws and these Terms.</li>
          </ul>
        </section>

        <section>
          <h2>3. User conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Harass, threaten, defame, or discriminate against others.</li>
            <li>Post false, misleading, or fraudulent information.</li>
            <li>Attempt to bypass payments, fees, or Platform mechanics (including soliciting off-platform payments to
              evade applicable fees where they apply).</li>
            <li>Scrape, overload, or interfere with the Platform; reverse engineer except where law permits.</li>
            <li>Use the Platform for unlawful purposes or to distribute malware or spam.</li>
          </ul>
        </section>

        <section>
          <h2>4. Mentor content and disclaimer</h2>
          <p>
            Mentors and experts provide opinions, experience-based guidance, and educational information—not legal,
            financial, medical, or other regulated professional advice unless they are separately qualified and engaged
            under a separate agreement. You are solely responsible for decisions you make based on mentorship. Commonsia
            does not endorse any specific mentor statement or recommendation.
          </p>
        </section>

        <section>
          <h2>5. Payments and fees</h2>
          <p>
            Where mentors charge fees or the Platform facilitates paid sessions, pricing, refunds, and disputes may be
            governed by additional terms shown at checkout or in product flows. Commonsia may charge service or
            commission fees as disclosed. Payments are processed by third-party payment providers; their terms and
            privacy policies apply to payment data they handle.
          </p>
        </section>

        <section>
          <h2>6. Intellectual property</h2>
          <p>
            The Platform, branding, and our proprietary content are owned by Commonsia or our licensors. You retain
            ownership of content you submit; you grant us a license to host, display, and use that content as needed to
            operate and improve the Platform, consistent with our Privacy Policy.
          </p>
        </section>

        <section>
          <h2>7. Suspension and termination</h2>
          <p>
            We may suspend or terminate access to your account if we reasonably believe you violated these Terms, pose a
            risk to others or the Platform, or as required by law. You may stop using the Platform at any time. Certain
            provisions survive termination (including disclaimers, limitations of liability, and dispute terms).
          </p>
        </section>

        <section>
          <h2>8. Disclaimers</h2>
          <p>
            THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.
          </p>
        </section>

        <section>
          <h2>9. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, COMMONSIA AND ITS AFFILIATES, OFFICERS, DIRECTORS,
            EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
            DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE PLATFORM OR MENTORSHIP
            CONTENT. OUR AGGREGATE LIABILITY FOR CLAIMS RELATING TO THE PLATFORM WILL NOT EXCEED THE GREATER OF (A) THE
            AMOUNT YOU PAID TO COMMONSIA FOR THE PLATFORM IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED
            U.S. DOLLARS (USD $100), IF NO FEES APPLIED. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE
            CASES, OUR LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.
          </p>
        </section>

        <section>
          <h2>10. Indemnity</h2>
          <p>
            You will defend and indemnify Commonsia and its affiliates against claims, damages, losses, and expenses
            (including reasonable attorneys&apos; fees) arising from your use of the Platform, your content, or your
            violation of these Terms, to the extent permitted by law.
          </p>
        </section>

        <section>
          <h2>11. Changes to these Terms</h2>
          <p>
            We may modify these Terms from time to time. We will post the updated Terms with a new effective date and,
            where required or appropriate, provide additional notice. If you continue to use the Platform after changes
            take effect, you accept the revised Terms. If you do not agree, you must stop using the Platform.
          </p>
        </section>

        <section>
          <h2>12. Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws applicable in the jurisdiction we designate for dispute resolution,
            without regard to conflict-of-law principles, except where mandatory consumer protections in your country
            require otherwise. Courts or forums in that jurisdiction will have exclusive jurisdiction over disputes,
            unless applicable law requires a different forum.
          </p>
        </section>

        <section>
          <h2>13. Contact</h2>
          <p>
            For questions about these Terms, email{" "}
            <a href="mailto:hello@commonsia.com" className="font-medium text-primary hover:underline">
              hello@commonsia.com
            </a>{" "}
            or visit our{" "}
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
