"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type FormState } from "@/app/auth/actions";

const initial: FormState = {};
const input =
  "mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, initial);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-700">📚 Join the club</h1>
          <p className="mt-1 text-sm opacity-70">Signup is invite-only. Ask an admin for a code.</p>
        </div>

        <label className="block text-sm font-medium">
          Invite code
          <input name="invite_code" required maxLength={64} autoComplete="off" className={`${input} uppercase`} />
        </label>

        <label className="block text-sm font-medium">
          Display name
          <input name="display_name" required maxLength={50} autoComplete="name" className={input} />
        </label>

        <label className="block text-sm font-medium">
          Username
          <input name="username" required minLength={3} maxLength={24} autoComplete="username" className={input} />
        </label>

        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={input}
          />
        </label>

        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-center text-sm">
          Already a member?{" "}
          <Link href="/login" className="font-medium text-brand-600 underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
