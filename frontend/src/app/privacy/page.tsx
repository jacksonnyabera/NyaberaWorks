import { LegalPage } from "@/components/layout/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Privacy policy",
  description: "What personal information NyaberaWorks collects, why, how long it is kept and how to ask for it to be corrected or deleted.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="This explains what information this website collects, why, and what you can ask me to do with it."
    >
      <section>
        <h2>Who is responsible</h2>
        <p>
          {site.name} is operated by {site.owner}, based in {site.location}. For anything in this policy, write to{" "}
          <a className="underline" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          .
        </p>
      </section>
      <section>
        <h2>What I collect</h2>
        <ul>
          <li>
            <strong>Forms:</strong> the details you type into the contact, quote and booking forms: name, email, phone
            (where asked), the service you are interested in, and your message or project description.
          </li>
          <li>
            <strong>Accounts:</strong> if you create an account when that feature opens, your name, email and a
            securely hashed password. Passwords are never stored in readable form.
          </li>
          <li>
            <strong>Technical logs:</strong> the server records request times, pages requested and error details to keep
            the site secure and working. Logs are not used to build profiles of visitors.
          </li>
        </ul>
        <p>This site does not use advertising trackers.</p>
      </section>
      <section>
        <h2>Why I use it</h2>
        <ul>
          <li>To reply to your enquiry and prepare quotes.</li>
          <li>To confirm and manage bookings and the work you request.</li>
          <li>To keep records of work and payments that I may need for tax and legal reasons.</li>
          <li>To keep the website secure and fix faults.</li>
        </ul>
      </section>
      <section>
        <h2>Who sees it</h2>
        <p>
          Your details are visible to me and are not sold or shared for marketing. They are processed by the services
          needed to run the site, such as hosting and email delivery, and may be shared if the law requires it. When
          online payment is added, payment providers will process your payment details directly; this site will not store
          card numbers.
        </p>
      </section>
      <section>
        <h2>How long I keep it</h2>
        <p>
          Enquiries that do not lead to work are kept for as long as needed to follow up, then deleted or anonymised.
          Records of paid work are kept for the period required for accounting and legal purposes.
        </p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          Under the Kenya Data Protection Act, 2019, you can ask to see the personal data I hold about you, correct it,
          object to its use, or ask for it to be deleted. Email the address above and I will respond promptly. You can also
          complain to the Office of the Data Protection Commissioner of Kenya.
        </p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>If this policy changes, the date at the top changes with it.</p>
      </section>
    </LegalPage>
  );
}
