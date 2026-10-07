import { CtaBand } from "@/components/home/CtaBand";
import { FaqList } from "@/components/home/FaqList";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader, Section } from "@/components/ui/Section";
import { faqs } from "@/content/general";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "FAQ",
  description: "Answers about quotes, timelines, payment, ownership, remote work and support after launch.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />
      <PageHeader title="Frequently asked questions" intro="Straight answers before you get in touch." />
      <Section>
        <div className="max-w-3xl">
          <FaqList />
        </div>
      </Section>
      <CtaBand title="Question not answered here?" body="Send it through the contact form. I reply to every message." />
    </>
  );
}
