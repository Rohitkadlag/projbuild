import fs from "fs-extra";
import path from "path";
import { ComposedApp } from "@app-builder/composer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasBucket(app: ComposedApp, name: string): boolean {
  return app.buckets.some((b) => b.name === name);
}

function getCrudConfig(app: ComposedApp): {
  entityName: string;
  entityNameLower: string;
  entityPlural: string;
  apiPath: string;
  fields: Array<{ name: string; type: string; label: string }>;
} {
  const crudBucket = app.buckets.find((b) => b.name === "crud");
  const rawConfig = crudBucket
    ? (app.configs?.["crud"] ?? crudBucket.configSchema ?? {})
    : {};

  // entityName from config or sensible default
  const entityName =
    typeof (rawConfig as Record<string, unknown>)["entityName"] === "string"
      ? ((rawConfig as Record<string, unknown>)["entityName"] as string)
      : "Item";

  const entityNameLower = entityName.toLowerCase();
  const entityPlural = entityNameLower + "s";
  const apiPath = `/api/${entityPlural}`;

  // fields: if config.fields is an array use it, otherwise empty
  const rawFields = (rawConfig as Record<string, unknown>)["fields"];
  const fields: Array<{ name: string; type: string; label: string }> =
    Array.isArray(rawFields)
      ? rawFields.map((f) => {
          const field = f as Record<string, unknown>;
          return {
            name: String(field["name"] ?? "field"),
            type: String(field["type"] ?? "string"),
            label:
              typeof field["label"] === "string"
                ? field["label"]
                : String(field["name"] ?? "Field"),
          };
        })
      : [];

  return { entityName, entityNameLower, entityPlural, apiPath, fields };
}

async function write(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
}

// ---------------------------------------------------------------------------
// Static config files
// ---------------------------------------------------------------------------

function packageJson(): string {
  return JSON.stringify(
    {
      name: "@generated/web",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: {
        next: "^14.2.3",
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        clsx: "^2.1.1",
      },
      devDependencies: {
        "@types/node": "^20.12.12",
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        autoprefixer: "^10.4.19",
        postcss: "^8.4.38",
        tailwindcss: "^3.4.3",
        typescript: "^5.4.5",
      },
    },
    null,
    2
  );
}

function nextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: false };
module.exports = nextConfig;
`;
}

function tsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        paths: { "@/*": ["./src/*"] },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"],
    },
    null,
    2
  );
}

function tailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
`;
}

function postcssConfig(): string {
  return `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
`;
}

function envLocal(apiPort: number): string {
  return `NEXT_PUBLIC_API_URL=http://localhost:${apiPort}\n`;
}

function globalsCss(): string {
  return `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Karla:wght@300;400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #F5F0E8;
  --surface: #FBF8F4;
  --surface-2: #F0EBE1;
  --border: #DDD6C8;
  --text: #1C1712;
  --text-muted: #7A6F62;
  --accent: #C4622D;
  --accent-hover: #A8501F;
  --accent-light: #F5E6DC;
  --success: #2D6A4F;
  --error: #B53A3A;
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-font-smoothing: antialiased; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Karla', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.6;
}

h1, h2, h3, h4 {
  font-family: 'Cormorant Garamond', Georgia, serif;
  letter-spacing: -0.02em;
}

::selection { background: var(--accent-light); color: var(--text); }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
`;
}

function libApiTs(): string {
  return `const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return fetch(\`\${BASE}\${path}\`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
      ...(init?.headers ?? {}),
    },
  });
}
`;
}

function libAuthTs(): string {
  return `export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function removeToken(): void {
  localStorage.removeItem("token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
`;
}

// ---------------------------------------------------------------------------
// Navbar component (dynamic)
// ---------------------------------------------------------------------------

function navbarTsx(app: ComposedApp): string {
  const hasAuth = hasBucket(app, "auth");
  const hasCrud = hasBucket(app, "crud");
  const hasCart = hasBucket(app, "cart");
  const hasDashboard = hasBucket(app, "dashboard");

  const { entityPlural, entityName } = hasCrud
    ? getCrudConfig(app)
    : { entityPlural: "", entityName: "" };

  const crudLink = hasCrud
    ? `        <Link href="/${entityPlural}" className="text-sm text-[#7A6F62] hover:text-[#1C1712] transition-colors font-medium">${entityName}s</Link>`
    : "";

  const cartLink = hasCart
    ? `        <Link href="/cart" className="text-sm text-[#7A6F62] hover:text-[#1C1712] transition-colors font-medium">Cart</Link>`
    : "";

  const dashboardLink = hasDashboard
    ? `        <Link href="/dashboard" className="text-sm text-[#7A6F62] hover:text-[#1C1712] transition-colors font-medium">Dashboard</Link>`
    : "";

  const navLinks = [crudLink, cartLink, dashboardLink]
    .filter(Boolean)
    .join("\n");

  const authSection = hasAuth
    ? `      {loggedIn ? (
          <button onClick={logout} className="text-sm text-[#7A6F62] hover:text-[#1C1712] transition-colors">Logout</button>
        ) : (
          <>
            <Link href="/login" className="text-sm text-[#7A6F62] hover:text-[#1C1712] transition-colors">Login</Link>
            <Link href="/signup" className="text-sm bg-[#C4622D] hover:bg-[#A8501F] text-white px-4 py-1.5 rounded-[8px] transition-colors font-medium">Sign up</Link>
          </>
        )}`
    : "";

  return `"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { removeToken, isLoggedIn } from "@/lib/auth";

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => { setLoggedIn(isLoggedIn()); }, []);

  function logout() { removeToken(); setLoggedIn(false); window.location.href = "/"; }

  return (
    <nav style={{ borderBottom: "1px solid #DDD6C8" }} className="bg-[#FBF8F4] px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-['Cormorant_Garamond',Georgia,serif] text-xl font-semibold text-[#1C1712] tracking-tight">
          ${app.appName}
        </Link>
${navLinks}
      </div>
      <div className="flex items-center gap-3">
${authSection}
      </div>
    </nav>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function layoutTsx(app: ComposedApp): string {
  return `import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = { title: "${app.appName}" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#F5F0E8] min-h-screen">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------

function homePageTsx(app: ComposedApp): string {
  const hasCrud = hasBucket(app, "crud");

  if (hasCrud) {
    const { entityName, entityPlural } = getCrudConfig(app);
    return `export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F5F0E8] px-6">
      <div className="text-center max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div style={{ background: "#DDD6C8", height: "1px" }} className="w-12" />
          <span className="text-xs tracking-[0.2em] text-[#7A6F62] uppercase font-medium">Welcome</span>
          <div style={{ background: "#DDD6C8", height: "1px" }} className="w-12" />
        </div>
        <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-6xl font-bold text-[#1C1712] mb-4 leading-tight">
          ${app.appName}
        </h1>
        <p className="text-[#7A6F62] text-lg mb-10 max-w-md mx-auto leading-relaxed">
          Browse our curated collection of ${entityName}s.
        </p>
        <a
          href="/${entityPlural}"
          className="inline-block bg-[#C4622D] hover:bg-[#A8501F] text-white px-8 py-3 rounded-[10px] text-sm font-semibold transition-colors duration-150"
        >
          Browse ${entityName}s
        </a>
      </div>
    </main>
  );
}
`;
  }

  return `export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F5F0E8] px-6">
      <div className="text-center max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div style={{ background: "#DDD6C8", height: "1px" }} className="w-12" />
          <span className="text-xs tracking-[0.2em] text-[#7A6F62] uppercase font-medium">Welcome</span>
          <div style={{ background: "#DDD6C8", height: "1px" }} className="w-12" />
        </div>
        <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-6xl font-bold text-[#1C1712] mb-4 leading-tight">
          ${app.appName}
        </h1>
        <p className="text-[#7A6F62] text-lg max-w-md mx-auto leading-relaxed">
          Welcome to your new application.
        </p>
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Auth pages
// ---------------------------------------------------------------------------

function loginPageTsx(): string {
  return `"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      setToken(data.token);
      router.push("/");
      router.refresh();
    } catch {
      setError("Connection failed — is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F5F0E8] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div style={{ background: "#DDD6C8", height: "1px" }} className="w-8" />
            <span className="text-xs tracking-[0.15em] text-[#7A6F62] uppercase">Sign in</span>
          </div>
          <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-4xl font-bold text-[#1C1712]">Welcome back</h1>
          <p className="text-[#7A6F62] text-sm mt-2">Demo: demo@example.com / password</p>
        </div>

        <div className="bg-[#FBF8F4] border border-[#DDD6C8] rounded-[12px] p-7 shadow-[0_1px_3px_rgba(28,23,18,0.08)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#7A6F62] uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#F5F0E8] border border-[#DDD6C8] rounded-[8px] px-4 py-2.5 text-sm text-[#1C1712] placeholder:text-[#7A6F62] focus:outline-none focus:border-[#C4622D] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#7A6F62] uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#F5F0E8] border border-[#DDD6C8] rounded-[8px] px-4 py-2.5 text-sm text-[#1C1712] placeholder:text-[#7A6F62] focus:outline-none focus:border-[#C4622D] transition-colors"
              />
            </div>
            {error && (
              <p className="text-xs text-[#B53A3A] bg-[#F5E6DC] px-3 py-2 rounded-[6px]">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C4622D] hover:bg-[#A8501F] text-white rounded-[8px] py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-sm text-[#7A6F62] text-center">
          No account?{" "}
          <Link href="/signup" className="text-[#C4622D] hover:underline font-medium">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
`;
}

function signupPageTsx(): string {
  return `"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Signup failed"); return; }
      router.push("/login");
    } catch {
      setError("Connection failed — is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F5F0E8] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div style={{ background: "#DDD6C8", height: "1px" }} className="w-8" />
            <span className="text-xs tracking-[0.15em] text-[#7A6F62] uppercase">Create account</span>
          </div>
          <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-4xl font-bold text-[#1C1712]">Get started</h1>
          <p className="text-[#7A6F62] text-sm mt-2">Create your free account</p>
        </div>

        <div className="bg-[#FBF8F4] border border-[#DDD6C8] rounded-[12px] p-7 shadow-[0_1px_3px_rgba(28,23,18,0.08)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-[#7A6F62] uppercase tracking-widest mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-[#F5F0E8] border border-[#DDD6C8] rounded-[8px] px-4 py-2.5 text-sm text-[#1C1712] placeholder:text-[#7A6F62] focus:outline-none focus:border-[#C4622D] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#7A6F62] uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#F5F0E8] border border-[#DDD6C8] rounded-[8px] px-4 py-2.5 text-sm text-[#1C1712] placeholder:text-[#7A6F62] focus:outline-none focus:border-[#C4622D] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#7A6F62] uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#F5F0E8] border border-[#DDD6C8] rounded-[8px] px-4 py-2.5 text-sm text-[#1C1712] placeholder:text-[#7A6F62] focus:outline-none focus:border-[#C4622D] transition-colors"
              />
            </div>
            {error && (
              <p className="text-xs text-[#B53A3A] bg-[#F5E6DC] px-3 py-2 rounded-[6px]">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C4622D] hover:bg-[#A8501F] text-white rounded-[8px] py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-sm text-[#7A6F62] text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-[#C4622D] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// CRUD listing page
// ---------------------------------------------------------------------------

function crudListPageTsx(
  app: ComposedApp,
  entityName: string,
  entityNameLower: string,
  entityPlural: string,
  apiPath: string,
  includeCart: boolean
): string {
  const addToCartImport = includeCart
    ? `import AddToCartButton from "@/components/AddToCartButton";\n`
    : "";

  const addToCartButton = includeCart
    ? `            <AddToCartButton productId={String(item.id)} />`
    : "";

  return `"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
${addToCartImport}
type EntityItem = { id: string; [key: string]: unknown };

export default function ${entityName}sPage() {
  const [items, setItems] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("${apiPath}")
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : (data as any).data ?? (data as any).items ?? []))
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8 pb-6 border-b border-[#DDD6C8]">
        <div>
          <span className="text-xs tracking-[0.15em] text-[#7A6F62] uppercase block mb-2">
            {!loading && \`\${items.length} item\${items.length !== 1 ? "s" : ""}\`}
          </span>
          <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-5xl font-bold text-[#1C1712]">${entityName}s</h1>
        </div>
        <Link
          href="/${entityPlural}/new"
          className="bg-[#C4622D] hover:bg-[#A8501F] text-white px-5 py-2.5 rounded-[10px] text-sm font-medium transition-colors"
        >
          + New ${entityName}
        </Link>
      </div>

      {loading && <p className="text-[#7A6F62] text-sm">Loading...</p>}
      {error && <p className="text-[#B53A3A] text-sm">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-20">
          <p className="font-['Cormorant_Garamond',Georgia,serif] text-3xl text-[#7A6F62] mb-3">Nothing here yet</p>
          <p className="text-[#7A6F62] text-sm mb-6">Add your first ${entityNameLower} to get started.</p>
          <Link href="/${entityPlural}/new" className="text-sm text-[#C4622D] hover:underline font-medium">Create one →</Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="group bg-[#FBF8F4] border border-[#DDD6C8] rounded-[10px] p-5 hover:border-[#C4622D]/40 hover:shadow-[0_4px_12px_rgba(28,23,18,0.10)] transition-all duration-200">
            <Link href={\`/${entityPlural}/\${item.id}\`} className="block">
              <h3 className="font-['Cormorant_Garamond',Georgia,serif] text-xl font-semibold text-[#1C1712] mb-1 truncate group-hover:text-[#C4622D] transition-colors">
                {String((item as any).name ?? (item as any).title ?? (item as any).id)}
              </h3>
              {(item as any).price != null && (
                <p className="text-lg font-semibold text-[#C4622D]">\${String((item as any).price)}</p>
              )}
              {(item as any).description && (
                <p className="text-sm text-[#7A6F62] mt-1 line-clamp-2">{String((item as any).description)}</p>
              )}
              <p className="text-xs text-[#7A6F62] mt-3 group-hover:text-[#C4622D]/60 transition-colors">View details →</p>
            </Link>
${addToCartButton ? `            <div className="mt-3">\n${addToCartButton}\n            </div>` : ""}
          </div>
        ))}
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// CRUD detail page
// ---------------------------------------------------------------------------

function crudDetailPageTsx(
  entityName: string,
  entityNameLower: string,
  entityPlural: string,
  apiPath: string
): string {
  return `"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ${entityName}DetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(\`${apiPath}/\${params.id}\`)
      .then(r => r.json())
      .then(setItem)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Delete this ${entityNameLower}?")) return;
    await apiFetch(\`${apiPath}/\${params.id}\`, { method: "DELETE" });
    router.push("/${entityPlural}");
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-[#7A6F62] text-sm">Loading...</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-[#7A6F62]">Not found.</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/${entityPlural}" className="inline-flex items-center gap-1.5 text-sm text-[#7A6F62] hover:text-[#C4622D] transition-colors mb-8">
        ← Back to ${entityName}s
      </Link>

      <div className="bg-[#FBF8F4] border border-[#DDD6C8] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(28,23,18,0.08)]">
        <div className="px-8 py-6 border-b border-[#DDD6C8]">
          <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-4xl font-bold text-[#1C1712]">
            {String(item.name ?? item.title ?? item.id)}
          </h1>
          {(item as any).price != null && (
            <p className="text-2xl font-semibold text-[#C4622D] mt-1">\${String((item as any).price)}</p>
          )}
        </div>

        <div className="px-8 py-6 divide-y divide-[#DDD6C8]">
          {Object.entries(item)
            .filter(([k]) => !["id", "createdAt", "updatedAt"].includes(k))
            .map(([k, v]) => (
              <div key={k} className="flex items-start gap-6 py-3.5">
                <span className="text-xs font-medium text-[#7A6F62] uppercase tracking-widest w-28 shrink-0 pt-0.5 capitalize">{k}</span>
                <span className="text-sm text-[#1C1712]">{String(v ?? "—")}</span>
              </div>
            ))}
        </div>

        <div className="px-8 py-5 bg-[#F5F0E8] border-t border-[#DDD6C8] flex gap-3">
          <Link
            href={\`/${entityPlural}/\${String(item.id)}/edit\`}
            className="bg-[#C4622D] hover:bg-[#A8501F] text-white px-5 py-2.5 rounded-[10px] text-sm font-medium transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="bg-transparent border border-[#DDD6C8] hover:bg-[#F0EBE1] text-[#1C1712] px-5 py-2.5 rounded-[10px] text-sm font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// CRUD create page
// ---------------------------------------------------------------------------

function crudNewPageTsx(
  entityName: string,
  entityPlural: string,
  apiPath: string,
  fields: Array<{ name: string; type: string; label: string }>
): string {
  // If no fields provided, use generic name/description/price defaults
  const resolvedFields =
    fields.length > 0
      ? fields
      : [
          { name: "name", type: "string", label: "Name" },
          { name: "description", type: "string", label: "Description" },
        ];

  const stateLines = resolvedFields
    .map((f) => {
      const defaultVal = f.type === "number" ? "0" : '""';
      return `  const [${f.name}, set${capitalize(f.name)}] = useState<${f.type === "number" ? "number" : "string"}>(${defaultVal});`;
    })
    .join("\n");

  const bodyFields = resolvedFields
    .map((f) => `        ${f.name},`)
    .join("\n");

  const inputElements = resolvedFields
    .map((f) => {
      const inputType =
        f.type === "number" ? "number" : f.type === "boolean" ? "checkbox" : "text";
      if (inputType === "checkbox") {
        return `          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="${f.name}"
              checked={Boolean(${f.name})}
              onChange={e => set${capitalize(f.name)}(e.target.checked ? "true" : "false")}
              className="rounded border-[#DDD6C8] accent-[#C4622D]"
            />
            <label htmlFor="${f.name}" className="text-sm text-[#1C1712]">${f.label}</label>
          </div>`;
      }
      return `          <div>
            <label className="block text-xs font-medium text-[#7A6F62] uppercase tracking-widest mb-1.5">${f.label}</label>
            <input
              type="${inputType}"
              value={${f.name}}
              onChange={e => set${capitalize(f.name)}(${f.type === "number" ? "Number(e.target.value)" : "e.target.value"})}
              required
              className="w-full bg-[#F5F0E8] border border-[#DDD6C8] rounded-[8px] px-4 py-2.5 text-sm text-[#1C1712] placeholder:text-[#7A6F62] focus:outline-none focus:border-[#C4622D] transition-colors"
            />
          </div>`;
    })
    .join("\n");

  return `"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function New${entityName}Page() {
${stateLines}
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("${apiPath}", {
        method: "POST",
        body: JSON.stringify({
${bodyFields}
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      router.push("/${entityPlural}");
    } catch {
      setError("Connection failed — is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/${entityPlural}" className="inline-flex items-center gap-1.5 text-sm text-[#7A6F62] hover:text-[#C4622D] transition-colors">
          ← Back to ${entityName}s
        </Link>
        <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-4xl font-bold text-[#1C1712] mt-3">New ${entityName}</h1>
      </div>

      <div className="bg-[#FBF8F4] border border-[#DDD6C8] rounded-[12px] p-8 shadow-[0_1px_3px_rgba(28,23,18,0.08)]">
        <form onSubmit={handleSubmit} className="space-y-6">
${inputElements}
          {error && (
            <p className="text-xs text-[#B53A3A] bg-[#F5E6DC] px-3 py-2 rounded-[6px]">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#C4622D] hover:bg-[#A8501F] text-white px-6 py-2.5 rounded-[10px] text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create ${entityName}"}
            </button>
            <Link
              href="/${entityPlural}"
              className="bg-transparent border border-[#DDD6C8] hover:bg-[#F0EBE1] text-[#1C1712] px-6 py-2.5 rounded-[10px] text-sm font-medium transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// CRUD edit page
// ---------------------------------------------------------------------------

function crudEditPageTsx(
  entityName: string,
  entityPlural: string,
  apiPath: string,
  fields: Array<{ name: string; type: string; label: string }>
): string {
  const resolvedFields =
    fields.length > 0
      ? fields
      : [
          { name: "name", type: "string", label: "Name" },
          { name: "description", type: "string", label: "Description" },
        ];

  const stateLines = resolvedFields
    .map((f) => {
      const defaultVal = f.type === "number" ? "0" : '""';
      return `  const [${f.name}, set${capitalize(f.name)}] = useState<${f.type === "number" ? "number" : "string"}>(${defaultVal});`;
    })
    .join("\n");

  const itemAssignments = resolvedFields
    .map((f) => {
      if (f.type === "number") {
        return `      set${capitalize(f.name)}(Number(data.${f.name} ?? 0));`;
      }
      return `      set${capitalize(f.name)}(String(data.${f.name} ?? ""));`;
    })
    .join("\n");

  const bodyFields = resolvedFields
    .map((f) => `        ${f.name},`)
    .join("\n");

  const inputElements = resolvedFields
    .map((f) => {
      const inputType =
        f.type === "number" ? "number" : f.type === "boolean" ? "checkbox" : "text";
      if (inputType === "checkbox") {
        return `          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="${f.name}"
              checked={Boolean(${f.name})}
              onChange={e => set${capitalize(f.name)}(e.target.checked ? "true" : "false")}
              className="rounded border-[#DDD6C8] accent-[#C4622D]"
            />
            <label htmlFor="${f.name}" className="text-sm text-[#1C1712]">${f.label}</label>
          </div>`;
      }
      return `          <div>
            <label className="block text-xs font-medium text-[#7A6F62] uppercase tracking-widest mb-1.5">${f.label}</label>
            <input
              type="${inputType}"
              value={${f.name}}
              onChange={e => set${capitalize(f.name)}(${f.type === "number" ? "Number(e.target.value)" : "e.target.value"})}
              required
              className="w-full bg-[#F5F0E8] border border-[#DDD6C8] rounded-[8px] px-4 py-2.5 text-sm text-[#1C1712] placeholder:text-[#7A6F62] focus:outline-none focus:border-[#C4622D] transition-colors"
            />
          </div>`;
    })
    .join("\n");

  return `"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function Edit${entityName}Page() {
  const params = useParams();
  const router = useRouter();
${stateLines}
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    apiFetch(\`${apiPath}/\${params.id}\`)
      .then(r => r.json())
      .then(data => {
${itemAssignments}
      })
      .finally(() => setFetching(false));
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(\`${apiPath}/\${params.id}\`, {
        method: "PUT",
        body: JSON.stringify({
${bodyFields}
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update"); return; }
      router.push(\`/${entityPlural}/\${params.id}\`);
    } catch {
      setError("Connection failed — is the API running?");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-[#7A6F62] text-sm">Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href={\`/${entityPlural}/\${params.id}\`} className="inline-flex items-center gap-1.5 text-sm text-[#7A6F62] hover:text-[#C4622D] transition-colors">
          ← Back
        </Link>
        <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-4xl font-bold text-[#1C1712] mt-3">Edit ${entityName}</h1>
      </div>

      <div className="bg-[#FBF8F4] border border-[#DDD6C8] rounded-[12px] p-8 shadow-[0_1px_3px_rgba(28,23,18,0.08)]">
        <form onSubmit={handleSubmit} className="space-y-6">
${inputElements}
          {error && (
            <p className="text-xs text-[#B53A3A] bg-[#F5E6DC] px-3 py-2 rounded-[6px]">{error}</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#C4622D] hover:bg-[#A8501F] text-white px-6 py-2.5 rounded-[10px] text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href={\`/${entityPlural}/\${params.id}\`}
              className="bg-transparent border border-[#DDD6C8] hover:bg-[#F0EBE1] text-[#1C1712] px-6 py-2.5 rounded-[10px] text-sm font-medium transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Cart pages & components
// ---------------------------------------------------------------------------

function cartPageTsx(): string {
  return `"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type CartItem = { id: string; quantity: number; product?: { name?: string; title?: string; price?: number } };
type Cart = { id: string; items: CartItem[]; total?: number };

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadCart() {
    try {
      const r = await apiFetch("/api/cart");
      if (r.ok) setCart(await r.json());
    } catch {
      // silently ignore — cart may not exist yet
    }
    setLoading(false);
  }

  useEffect(() => { loadCart(); }, []);

  async function removeItem(itemId: string) {
    await apiFetch(\`/api/cart/items/\${itemId}\`, { method: "DELETE" });
    loadCart();
  }

  const subtotal =
    cart?.items?.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0) ?? 0;

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-[#7A6F62] text-sm">Loading...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8 pb-6 border-b border-[#DDD6C8]">
        <span className="text-xs tracking-[0.15em] text-[#7A6F62] uppercase block mb-2">Shopping</span>
        <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-5xl font-bold text-[#1C1712]">Your Cart</h1>
      </div>

      {!cart?.items?.length ? (
        <div className="text-center py-20">
          <p className="font-['Cormorant_Garamond',Georgia,serif] text-3xl text-[#7A6F62] mb-3">Your cart is empty</p>
          <p className="text-[#7A6F62] text-sm">Add items to get started.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-[#DDD6C8]">
            {cart.items.map(item => (
              <div key={item.id} className="flex items-center gap-4 py-4">
                <div className="flex-1">
                  <p className="font-['Cormorant_Garamond',Georgia,serif] text-lg font-medium text-[#1C1712]">
                    {item.product?.name ?? item.product?.title ?? "Item"}
                  </p>
                  <p className="text-sm text-[#7A6F62]">Qty: {item.quantity}</p>
                </div>
                {item.product?.price != null && (
                  <p className="font-semibold text-[#C4622D]">\${(item.product.price * item.quantity).toFixed(2)}</p>
                )}
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-[#C4622D] hover:text-[#A8501F] transition-colors font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-[#DDD6C8] flex items-center justify-between">
            <span className="font-['Cormorant_Garamond',Georgia,serif] text-2xl font-semibold text-[#1C1712]">Subtotal</span>
            <span className="font-['Cormorant_Garamond',Georgia,serif] text-3xl font-bold text-[#C4622D]">\${subtotal.toFixed(2)}</span>
          </div>
        </>
      )}
    </main>
  );
}
`;
}

function addToCartButtonTsx(): string {
  return `"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function addToCart() {
    setLoading(true);
    try {
      await apiFetch("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={addToCart}
      disabled={loading}
      className={\`px-4 py-2 rounded-[8px] text-sm font-medium transition-all duration-150 \${
        added
          ? "bg-[#2D6A4F] text-white"
          : "bg-[#C4622D] hover:bg-[#A8501F] text-white"
      } disabled:opacity-50\`}
    >
      {added ? "✓ Added" : loading ? "Adding..." : "Add to Cart"}
    </button>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

function dashboardPageTsx(): string {
  return `"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    apiFetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(data => setStats((data as Record<string, number>) ?? {}))
      .catch(() => {});
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-10 pb-6 border-b border-[#DDD6C8]">
        <span className="text-xs tracking-[0.15em] text-[#7A6F62] uppercase block mb-2">Overview</span>
        <h1 className="font-['Cormorant_Garamond',Georgia,serif] text-5xl font-bold text-[#1C1712]">Dashboard</h1>
      </div>

      {Object.keys(stats).length === 0 ? (
        <div className="text-center py-20">
          <p className="font-['Cormorant_Garamond',Georgia,serif] text-3xl text-[#7A6F62] mb-3">No data yet</p>
          <p className="text-[#7A6F62] text-sm">Stats will appear here once your data is ready.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="bg-[#FBF8F4] border border-[#DDD6C8] rounded-[10px] p-6">
              <p className="text-xs font-medium text-[#7A6F62] uppercase tracking-widest mb-3 capitalize">{k}</p>
              <p className="font-['Cormorant_Garamond',Georgia,serif] text-5xl font-bold text-[#1C1712]">{String(v)}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateWebApp(
  app: ComposedApp,
  outDir: string,
  apiPort: number
): Promise<void> {
  const webDir = path.join(outDir, "apps/web");

  // Detect feature flags
  const hasAuth = hasBucket(app, "auth");
  const hasCrud = hasBucket(app, "crud");
  const hasCart = hasBucket(app, "cart");
  const hasDashboard = hasBucket(app, "dashboard");

  // Resolve CRUD config once
  const crudConfig = hasCrud ? getCrudConfig(app) : null;
  const { entityName, entityNameLower, entityPlural, apiPath, fields } =
    crudConfig ?? {
      entityName: "Item",
      entityNameLower: "item",
      entityPlural: "items",
      apiPath: "/api/items",
      fields: [],
    };

  // ── Static config files ─────────────────────────────────────────────────
  await write(path.join(webDir, "package.json"), packageJson());
  await write(path.join(webDir, "next.config.js"), nextConfig());
  await write(path.join(webDir, "tsconfig.json"), tsConfig());
  await write(path.join(webDir, "tailwind.config.js"), tailwindConfig());
  await write(path.join(webDir, "postcss.config.js"), postcssConfig());
  await write(path.join(webDir, ".env.local"), envLocal(apiPort));

  // ── Styles ───────────────────────────────────────────────────────────────
  await write(path.join(webDir, "src/app/globals.css"), globalsCss());

  // ── Lib utilities ────────────────────────────────────────────────────────
  await write(path.join(webDir, "src/lib/api.ts"), libApiTs());
  await write(path.join(webDir, "src/lib/auth.ts"), libAuthTs());

  // ── Components ───────────────────────────────────────────────────────────
  await write(path.join(webDir, "src/components/Navbar.tsx"), navbarTsx(app));

  if (hasCart) {
    await write(
      path.join(webDir, "src/components/AddToCartButton.tsx"),
      addToCartButtonTsx()
    );
  }

  // ── App shell ────────────────────────────────────────────────────────────
  await write(path.join(webDir, "src/app/layout.tsx"), layoutTsx(app));
  await write(path.join(webDir, "src/app/page.tsx"), homePageTsx(app));

  // ── Auth pages ───────────────────────────────────────────────────────────
  if (hasAuth) {
    await write(path.join(webDir, "src/app/login/page.tsx"), loginPageTsx());
    await write(path.join(webDir, "src/app/signup/page.tsx"), signupPageTsx());
  }

  // ── CRUD pages ───────────────────────────────────────────────────────────
  if (hasCrud) {
    await write(
      path.join(webDir, `src/app/${entityPlural}/page.tsx`),
      crudListPageTsx(
        app,
        entityName,
        entityNameLower,
        entityPlural,
        apiPath,
        hasCart
      )
    );

    await write(
      path.join(webDir, `src/app/${entityPlural}/[id]/page.tsx`),
      crudDetailPageTsx(entityName, entityNameLower, entityPlural, apiPath)
    );

    await write(
      path.join(webDir, `src/app/${entityPlural}/new/page.tsx`),
      crudNewPageTsx(entityName, entityPlural, apiPath, fields)
    );

    await write(
      path.join(webDir, `src/app/${entityPlural}/[id]/edit/page.tsx`),
      crudEditPageTsx(entityName, entityPlural, apiPath, fields)
    );
  }

  // ── Cart page ────────────────────────────────────────────────────────────
  if (hasCart) {
    await write(path.join(webDir, "src/app/cart/page.tsx"), cartPageTsx());
  }

  // ── Dashboard page ───────────────────────────────────────────────────────
  if (hasDashboard) {
    await write(
      path.join(webDir, "src/app/dashboard/page.tsx"),
      dashboardPageTsx()
    );
  }
}
