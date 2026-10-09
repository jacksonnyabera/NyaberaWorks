import { BookingForm } from "@/components/forms/BookingForm";
import { FormBoundary } from "@/components/forms/FormBoundary";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageHeader, Section } from "@/components/ui/Section";
import { getServiceChoices } from "@/lib/catalog";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Book a service",
  description:
    "Request a time to discuss or start a service with Jackson Nyabera. Choose a service, a preferred date and time, and describe what you need.",
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
        intro="Pick a service and a time that suits you. This is a request: I confirm the final time by email or phone, so you are never booked without a reply."
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
              <li>I confirm the slot, or suggest the nearest alternative.</li>
              <li>We meet by call or video, or work through the details by message.</li>
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
