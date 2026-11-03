# Number input or text input for a phone number

Drafted by Claude at my request from my screenshots, so the wording is not all mine. Evidence: `evidence/09a-number-zero.png`, `09b-number-leading-zero.png`, `09c-number-arrow-changes-it.png` and `10-text-input-working.png`, from the demo page `/demo/number-input`.

## What CarePoint's numeric field is

The phone number. Nigerian numbers start with `0` (for example `08031234567`), and an international number starts with `+` (`+2348031234567`).

## What `type="number"` did to it

All of this is from my own screenshots, in Chrome.

- **`09a`:** typing `0` is fine. The form receives `"0"`.
- **`09b`:** typing `08031234567` looks fine in the box, but as a number it is `8031234567`. The leading zero is gone.
- **`09c`:** pressing the Up arrow key once changed the box from `08031234567` to **`8031234568`**. That is a different phone number, and it also lost its leading zero. The scroll wheel can do the same thing silently.
- Claude also checked, in a real browser, that typing `+2348031234567` into a number input drops the `+`, and that `0803e12` is accepted as scientific notation. I did not take screenshots of those two.

A patient could end up with the wrong phone number saved without ever seeing an error, and the front desk would call a number that is not theirs.

## What I use instead

A text-type input with `type="tel"` and `inputMode="tel"` (`10-text-input-working.png`). It keeps `+2348031234567` exactly as typed, shows no up and down arrows, and the Up key and the wheel do nothing. The phone keyboard still appears on a phone. My own rules (`docs/validation-rules.md`) then check the text.

I do **not** convert the phone number to a number with `Number()`. Even in the `tel` field, the demo's second readout shows that `Number("+2348031234567")` becomes `2348031234567`: the `+` and any leading zero disappear. A phone number is a label, not a quantity, so it stays text from the form all the way to the database.

## Where `type="number"` is the right choice

It is right for a real quantity that the patient might step up or down and where leading zeros mean nothing, for example how many people a booking is for or a number of days. There, the arrow keys help, `10` and `010` mean the same thing, and a wrong number is easy to see. I should still keep the minimum and maximum limits, and the number should never be something like a phone or card number that is really an identifier.
