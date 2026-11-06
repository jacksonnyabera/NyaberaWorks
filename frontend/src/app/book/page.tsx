import { BookingForm } from "@/components/forms/BookingForm";
import { FormBoundary } from "@/components/forms/FormBoundary";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader, Section } from "@/components/ui/Section";
import { getServiceChoices } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Book a service",
  description:
    "Request a consultation with NyaberaWorks. Choose a service, a preferred date and time, and describe what your business needs.",
  path: "/book",
});

export default async function BookPage() {
  const services = await getServiceChoices();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Book a service", path: "/book" },
        ])}
      />
      <PageHeader
        title="Book a service"
        intro="Choose a service and a preferred time. This is a booking request; NyaberaWorks confirms the final time by email or phone before it is scheduled."
      />
      <Section>
        <div className="grid gap-14 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
          <FormBoundary>
            <BookingForm services={services} />
          </FormBoundary>
          <aside aria-label="How booking works" className="space-y-6">
            <h2 className="text-xl">How booking works</h2>
            <ol className="list-decimal space-y-4 pl-5 text-lg marker:text-teal">
              <li>You send your preferred date and time.</li>
              <li>NyaberaWorks confirms the slot or suggests the nearest alternative.</li>
              <li>The consultation takes place by call, video or an agreed messaging channel.</li>
            </ol>
            <p className="text-muted">
              Times are East Africa Time (EAT). If you need a custom project priced first, use{" "}
              <a className="underline" href="/quote">
                Request a quote
              </a>{" "}
              instead.
            </p>
          </aside>
        </div>
      </Section>
    </>
  );
}
