import { RegisterSchema } from "C:/Users/USER/Desktop/CarePoint/src/lib/validation/schemas.ts";
const valid = { name: "  Padded Name  ", email: " MixedCase@Example.COM ", phone: "0803 123-4567", password: "correct horse battery", termsAccepted: true };
const invalid = { name: "a", email: "a@b", phone: "abc", password: "   " };
function time(label: string, input: unknown, runs: number) {
  for (let i = 0; i < 2000; i++) RegisterSchema.safeParse(input); // warm up
  const t = process.hrtime.bigint();
  for (let i = 0; i < runs; i++) RegisterSchema.safeParse(input);
  const perParseMicros = Number(process.hrtime.bigint() - t) / 1e3 / runs;
  console.log(`${label.padEnd(36)} ${perParseMicros.toFixed(1)} microseconds per parse (${runs} parses)`);
}
time("valid request (parse + normalise)", valid, 20000);
time("rejected request (all fields bad)", invalid, 20000);
