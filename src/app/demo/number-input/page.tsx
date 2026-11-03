import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import NumberInputDemo from "./NumberInputDemo";
import "../../../styles/book.css";
import "../../../styles/auth.css";
import "../../../styles/demo.css";

// A demo for the Task 3 notes only. It is kept out of search results and is not linked
// from anywhere in the product.
export const metadata: Metadata = { title: "Demo: number input", robots: { index: false, follow: false } };

export default function NumberInputDemoPage() {
  return (
    <>
      <SiteHeader />
      <main className="book">
        <h1 className="book-title type-headline-medium">Demo: number input vs phone input</h1>
        <p className="book-intro type-body-large">
          This page is not part of CarePoint. It shows what the same typing does to a phone number in two kinds of input.
        </p>
        <NumberInputDemo />
      </main>
    </>
  );
}
