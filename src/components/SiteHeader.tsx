import Link from "next/link";

// Shared by every page so the site looks like one site.
export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="logo type-title-large" href="/">CarePoint Clinic</Link>
      <nav className="nav" aria-label="Main">
        <Link className="nav-link type-label-large" href="/#services">Services</Link>
        <Link className="nav-link type-label-large" href="/#about">About</Link>
      </nav>
    </header>
  );
}
