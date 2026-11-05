"use client";

import { useState } from "react";

// FIRST VERSION, NAIVE ON PURPOSE (Task 5, piece 2). It says "logged out" the moment the button is pressed
// and only then asks the server. With the network blocked, the page claims a logout that never happened.
// That is the bug to reproduce for the evidence; the fix follows in the next commit.
export default function LogoutButton() {
  const [loggedOut, setLoggedOut] = useState(false);

  function handleClick() {
    setLoggedOut(true);
    void fetch("/api/logout", { method: "POST" }).catch(() => undefined);
  }

  if (loggedOut) {
    return (
      <p className="message type-body-large" role="status">You are logged out.</p>
    );
  }

  return (
    <button className="button submit-button type-label-large" type="button" onClick={handleClick}>
      Log out
    </button>
  );
}
