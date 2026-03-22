import { useState } from "react";
import { useWebHaptics } from "../lib/haptics";
import { auth as authApi } from "../lib/api";
import { setToken } from "../lib/auth";
import { router } from "../router";
import { branding } from "../theme.config";
import { Button, Input } from "../components/ui";

export function LoginPage() {
  const { trigger } = useWebHaptics();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = isSignup
        ? await authApi.signup({ email, password, name: name || undefined })
        : await authApi.login({ email, password });
      setToken(res.access_token);
      trigger("success");
      router.navigate({ to: "/chat" });
    } catch (err) {
      trigger("error");
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 pb-20 md:pb-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">{branding.appName}</h1>
          <p className="text-gray-400 mt-2">{branding.tagline}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">
            {isSignup ? "Create Account" : "Sign In"}
          </h2>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {isSignup && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? "Loading..." : isSignup ? "Sign Up" : "Sign In"}
          </Button>

          <Button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            variant="ghost"
            className="w-full"
          >
            {isSignup
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Want to create your own instance?{" "}
          <a
            href="https://github.com/Slaymish/GPUShare/blob/main/docs/SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            See the setup guide
          </a>
        </p>
      </div>
    </div>
  );
}
