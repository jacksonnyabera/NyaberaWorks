import { LegalPage } from "@/components/layout/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Terms of service",
  description: "The terms that apply when you use the NyaberaWorks website and engage Jackson Nyabera for services.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="The basic rules for using this website and for working together. Each project also has its own written quote."
    >
      <section>
        <h2>Using this website</h2>
        <p>
          You may browse this site and send enquiries through its forms. Please do not misuse it: no attempts to break
          into it, overload it, or send spam or unlawful content through the forms.
        </p>
      </section>
      <section>
        <h2>Quotes and bookings</h2>
        <p>
          Submitting a quote request or booking request is an enquiry, not a contract. A project begins only when you
          accept a written quote, and a booking is confirmed only when I reply to confirm the time.
        </p>
      </section>
      <section>
        <h2>Prices and payment</h2>
        <p>
          Prices are shown in Kenya shillings (KES), and USD where offered. Starting prices are guides; the price in your
          written quote is the price that applies. Payment terms, deposits and methods are set out in the quote.
        </p>
      </section>
      <section>
        <h2>Scope changes</h2>
        <p>
          Work covers what the quote describes. If you ask for more, I will tell you the effect on price and timeline and
          we agree it before that work continues.
        </p>
      </section>
      <section>
        <h2>Ownership</h2>
        <p>
          Who owns the finished work and under what licence is stated in the quote. Third-party tools and libraries remain
          under their own licences.
        </p>
      </section>
      <section>
        <h2>Biomedical engineering work</h2>
        <p>
          Software, records and documentation I provide support your work but do not replace inspection, calibration,
          safety testing or sign-off by qualified, licensed professionals where regulations require them. Nothing here is
          medical advice.
        </p>
      </section>
      <section>
        <h2>Liability</h2>
        <p>
          I take care with every project, but I cannot promise that a website or system will be free of faults or that it
          will produce a particular business result. To the extent the law allows, my liability is limited to the fees paid
          for the work in question.
        </p>
      </section>
      <section>
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of Kenya.</p>
      </section>
      <section>
        <h2>Questions</h2>
        <p>
          Write to{" "}
          <a className="underline" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
