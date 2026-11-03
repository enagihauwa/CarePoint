"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import LoginForm from "./LoginForm";
import type { Mode } from "./ModeLink";
import ResetForm from "./ResetForm";
import SignupForm from "./SignupForm";

const TITLES: Record<Mode, string> = {
  signup: "Sign up",
  login: "Log in",
  reset: "Reset password",
};

// One route, /auth, shows the sign-up, log-in or reset form depending on ?mode=. A missing
// or unknown mode shows the log-in form.
function parseMode(value: string | null): Mode {
  return value === "signup" || value === "reset" ? value : "login";
}

export default function AuthSwitcher() {
  const mode = parseMode(useSearchParams().get("mode"));
  const previous = useRef(mode);
  // After the patient switches forms, move focus to the new heading so a keyboard or
  // screen-reader user knows the form changed. Not done on the first load.
  const switched = previous.current !== mode;

  useEffect(() => {
    document.title = `${TITLES[mode]} | CarePoint Clinic`;
    previous.current = mode;
  }, [mode]);

  // key={mode} gives each form its own fresh state when it appears.
  if (mode === "signup") return <SignupForm key={mode} focusHeading={switched} />;
  if (mode === "reset") return <ResetForm key={mode} focusHeading={switched} />;
  return <LoginForm key={mode} focusHeading={switched} />;
}
