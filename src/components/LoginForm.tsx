"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client";

const DEMO_ACCOUNTS = [
  { email: "alice@ajaia.dev", label: "Alice — owns & shares docs" },
  { email: "bob@ajaia.dev", label: "Bob — editor on a shared doc" },
  { email: "carol@ajaia.dev", label: "Carol — commenter on a shared doc" },
  { email: "dana@ajaia.dev", label: "Dana — view-only on a shared doc" },
];
const DEMO_PASSWORD = "password123";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("alice@ajaia.dev");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", json: { email, password } });
      router.push("/documents");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          Demo accounts (password: {DEMO_PASSWORD})
        </p>
        <div className="space-y-1">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword(DEMO_PASSWORD);
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-600 transition hover:bg-gray-50"
            >
              <span className="font-medium text-gray-800">{a.email}</span>
              <span className="ml-1 text-gray-400">— {a.label.split("—")[1]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
