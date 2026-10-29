"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type FormState } from "@/app/auth/actions";

const initial: FormState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-brand-700">📚 BookClub</h1>
          <p className="mt-1 text-sm opacity-70">Welcome back. Log in to continue.</p>
        </div>

        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
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
          {pending ? "Logging in…" : "Log in"}
        </button>

        <p className="text-center text-sm">
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand-600 underline">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
