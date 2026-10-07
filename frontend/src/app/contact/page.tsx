import { ContactForm } from "@/components/forms/ContactForm";
import { FormBoundary } from "@/components/forms/FormBoundary";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader, Section } from "@/components/ui/Section";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contact",
  description: "Send Jackson Nyabera a message about a website, application, automation or biomedical engineering project.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <PageHeader
        title="Contact"
        intro="Ask a question or describe what you need. I reply to every message, usually within one to two working days."
      />
      <Section>
        <div className="grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <FormBoundary>
            <ContactForm />
          </FormBoundary>
          <aside aria-label="Other ways to reach me" className="space-y-8">
            <div>
              <h2 className="text-xl">Prefer to write directly?</h2>
              <ul className="mt-4 space-y-3 text-lg">
                <li>
                  <a className="underline-offset-4 hover:underline" href={`mailto:${site.email}`}>
                    {site.email}
                  </a>
                </li>
                <li>
                  <a className="underline-offset-4 hover:underline" href={site.phoneHref}>
                    {site.phoneDisplay}
                  </a>
                </li>
                <li>
                  <a
                    className="underline-offset-4 hover:underline"
                    href={site.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xl">Based in</h2>
              <p className="mt-2 text-lg text-muted">{site.location}. Working with clients remotely across Kenya and beyond.</p>
            </div>
            <div>
              <h2 className="text-xl">Need a price?</h2>
              <p className="mt-2 text-muted">
                A quote request collects the details I need to give you a written scope, timeline and price.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
