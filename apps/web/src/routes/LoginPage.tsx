import * as React from "react";
import { Button, Surface } from "@synanton/ui-primitives";

export interface LoginPageProps {
  onLogin: (username: string) => Promise<void>;
  error?: string | null;
  /** Client-side prefill hint from VITE_DEMO_AUTH_USER; never a password. */
  initialUsername?: string;
}

export function LoginPage({ onLogin, error = null, initialUsername = "" }: LoginPageProps) {
  const [username, setUsername] = React.useState(initialUsername);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onLogin(username);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface>
      <h1>Sign in</h1>
      <form onSubmit={submit}>
        <label htmlFor="username">Username</label>
        <input id="username" value={username} autoComplete="username"
          onChange={(event) => setUsername(event.target.value)} />
        <Button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </Surface>
  );
}
