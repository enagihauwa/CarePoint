"use client";

import { useState } from "react";

// A throwaway demo for task-03-form-attacked (step 4). It shows what the SAME typing does
// in a type="number" input and in a type="tel" input. It is not part of the product.

function Readout({ raw, asNumber }: { raw: string; asNumber: string }) {
  return (
    <dl className="demo-readout type-body-medium">
      <dt>What the form receives (text)</dt>
      <dd>{raw === "" ? "(empty)" : `"${raw}"`}</dd>
      <dt>The same value as a number</dt>
      <dd>{asNumber}</dd>
    </dl>
  );
}

export default function NumberInputDemo() {
  const [numberRaw, setNumberRaw] = useState("");
  const [numberAsNumber, setNumberAsNumber] = useState("(nothing typed yet)");
  const [telRaw, setTelRaw] = useState("");

  return (
    <>
      <section className="booking-card demo-card" aria-labelledby="number-title">
        <h2 className="type-title-large" id="number-title">1. type=&quot;number&quot; (the annoying one)</h2>
        <div className="field">
          <label className="field-label type-label-large" htmlFor="phone-number">Phone number</label>
          <input
            className="field-input type-body-large"
            id="phone-number"
            type="number"
            value={numberRaw}
            onChange={(event) => {
              setNumberRaw(event.target.value);
              setNumberAsNumber(event.target.value === "" ? "(empty)" : String(event.target.valueAsNumber));
            }}
          />
        </div>
        <Readout raw={numberRaw} asNumber={numberAsNumber} />
      </section>

      <section className="booking-card demo-card" aria-labelledby="tel-title">
        <h2 className="type-title-large" id="tel-title">2. type=&quot;tel&quot; (what CarePoint uses)</h2>
        <div className="field">
          <label className="field-label type-label-large" htmlFor="phone-tel">Phone number</label>
          <input
            className="field-input type-body-large"
            id="phone-tel"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={telRaw}
            onChange={(event) => setTelRaw(event.target.value)}
          />
        </div>
        <Readout raw={telRaw} asNumber={telRaw === "" ? "(nothing typed yet)" : String(Number(telRaw.replace(/[\s-]/g, "")))} />
      </section>
    </>
  );
}
