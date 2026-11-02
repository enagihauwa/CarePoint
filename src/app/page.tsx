import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="hero">
          <h1 className="hero-title type-display-small">Book your appointment with CarePoint</h1>
          <p className="hero-text type-body-large">
            See which doctors are available and choose a time that suits you. No payment is needed to book.
          </p>
          <Link className="button type-label-large" href="/book">Book an appointment</Link>
        </section>

        <section className="questions" id="services" aria-labelledby="questions-title">
          <h2 className="section-title type-headline-small" id="questions-title">What patients ask us most</h2>
          <ul className="card-grid">
            <li className="card">
              <h3 className="card-title type-title-large">Is a doctor available today?</h3>
              <p className="card-text type-body-medium">Check today&apos;s doctors and open time slots, then book in a few steps.</p>
            </li>
            <li className="card">
              <h3 className="card-title type-title-large">How much does it cost?</h3>
              <p className="card-text type-body-medium">See the price of each consultation and laboratory test before you decide.</p>
            </li>
            <li className="card">
              <h3 className="card-title type-title-large">Is my lab result ready?</h3>
              <p className="card-text type-body-medium">Check whether your result is still being processed or ready to collect.</p>
            </li>
          </ul>
        </section>

        <section className="notice" id="about" aria-labelledby="notice-title">
          <h2 className="notice-title type-title-medium" id="notice-title">CarePoint Clinic is a fictional clinic</h2>
          <p className="notice-text type-body-small">
            This screen is a design prototype. The doctors, times and results shown in the finished app are sample data.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <p className="footer-text type-body-small">CarePoint Clinic, Lagos, Nigeria (fictional)</p>
      </footer>
    </>
  );
}
