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

  const entityName =
    typeof (rawConfig as Record<string, unknown>)["entityName"] === "string"
      ? ((rawConfig as Record<string, unknown>)["entityName"] as string)
      : "Item";

  const entityNameLower = entityName.toLowerCase();
  const entityPlural = entityNameLower + "s";
  const apiPath = `/api/${entityPlural}`;

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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

// ---------------------------------------------------------------------------
// globals.css — Apple minimal
// ---------------------------------------------------------------------------

function globalsCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background-color: #0071E3;
  color: #fff;
}
`;
}

// ---------------------------------------------------------------------------
// lib/api.ts
// ---------------------------------------------------------------------------

function libApiTs(): string {
  return `const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(\`\${API_BASE}\${path}\`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || (err as any).message || 'Request failed');
  }
  return res.json();
}
`;
}

// ---------------------------------------------------------------------------
// lib/auth.ts
// ---------------------------------------------------------------------------

function libAuthTs(): string {
  return `'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from './api';

interface User { id: string; name: string; email: string; role?: string; }
interface AuthContext { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; }
const Ctx = createContext<AuthContext>({ user: null, loading: true, login: async () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    apiFetch('/api/auth/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
`;
}

// ---------------------------------------------------------------------------
// Navbar component
// ---------------------------------------------------------------------------

function navbarTsx(app: ComposedApp): string {
  const hasAuth = hasBucket(app, "auth");
  const hasCrud = hasBucket(app, "crud");
  const hasCart = hasBucket(app, "cart");
  const hasDashboard = hasBucket(app, "dashboard");
  const hasBlog = hasBucket(app, "blog");
  const hasTeam = hasBucket(app, "team");
  const hasBookings = hasBucket(app, "bookings");
  const hasPayments = hasBucket(app, "payments");

  const { entityPlural, entityName } = hasCrud
    ? getCrudConfig(app)
    : { entityPlural: "", entityName: "" };

  const navLinks: string[] = [];
  if (hasCrud) {
    navLinks.push(
      `        <Link href="/${entityPlural}" className="text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">${entityName}s</Link>`
    );
  }
  if (hasCart) {
    navLinks.push(
      `        <Link href="/cart" className="text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">Cart</Link>`
    );
  }
  if (hasDashboard) {
    navLinks.push(
      `        <Link href="/dashboard" className="text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">Dashboard</Link>`
    );
  }
  if (hasBlog) {
    navLinks.push(
      `        <Link href="/posts" className="text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">Blog</Link>`
    );
  }
  if (hasTeam) {
    navLinks.push(
      `        <Link href="/team" className="text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">Team</Link>`
    );
  }
  if (hasBookings) {
    navLinks.push(
      `        <Link href="/bookings" className="text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">Bookings</Link>`
    );
  }
  if (hasPayments) {
    navLinks.push(
      `        <Link href="/payments" className="text-sm text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">Payments</Link>`
    );
  }

  const authSection = hasAuth
    ? `      {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#1D1D1F] font-medium">{user.name}</span>
            <button
              onClick={logout}
              className="bg-transparent border border-[#D2D2D7] text-[#1D1D1F] text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#1D1D1F] hover:text-[#6E6E73] transition-colors font-medium">Login</Link>
            <Link href="/signup" className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer">Sign Up</Link>
          </div>
        )}`
    : "";

  return `'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
      className="bg-white/80 backdrop-blur-xl border-b border-[#D2D2D7] sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-base font-semibold text-[#1D1D1F] tracking-tight">
            ${app.appName}
          </Link>
          <div className="hidden md:flex items-center gap-6">
${navLinks.join("\n")}
          </div>
        </div>
        <div className="flex items-center gap-3">
${authSection}
        </div>
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
  return `import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = { title: '${app.appName}' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="bg-[#FBFBFD] min-h-screen"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
      >
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
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
  const hasAuth = hasBucket(app, "auth");
  const hasCart = hasBucket(app, "cart");

  const { entityName, entityPlural } = hasCrud
    ? getCrudConfig(app)
    : { entityName: "Item", entityPlural: "items" };

  const primaryHref = hasCrud ? `/${entityPlural}` : hasAuth ? "/signup" : "#";
  const primaryLabel = hasCrud ? `Browse ${entityName}s` : "Get Started";
  const secondaryHref = hasAuth ? "/login" : "#";
  const secondaryLabel = hasAuth ? "Sign In" : "Learn More";

  const subtext = hasCrud
    ? `Discover and manage your ${entityName}s with ease.`
    : `Welcome to ${app.appName}. Everything you need, beautifully designed.`;

  const features = [
    {
      icon: "✦",
      title: hasCrud ? `Manage ${entityName}s` : "Powerful Features",
      desc: hasCrud
        ? `Create, edit, and organize your ${entityName}s in one place.`
        : "Built with modern tools for a fast, reliable experience.",
    },
    {
      icon: "◈",
      title: hasCart ? "Seamless Cart" : "Easy to Use",
      desc: hasCart
        ? "Add items to your cart and checkout with confidence."
        : "Intuitive interface designed to get things done quickly.",
    },
    {
      icon: "◉",
      title: hasAuth ? "Secure Access" : "Always Available",
      desc: hasAuth
        ? "Your account is protected with secure authentication."
        : "Access your data anytime, anywhere, on any device.",
    },
  ];

  const featureCards = features
    .map(
      (f) => `
        <div className="bg-white rounded-2xl border border-[#D2D2D7] p-6">
          <div className="text-2xl mb-4 text-[#0071E3]">${f.icon}</div>
          <h3 className="text-base font-semibold text-[#1D1D1F] mb-2">${f.title}</h3>
          <p className="text-sm text-[#6E6E73] leading-relaxed">${f.desc}</p>
        </div>`
    )
    .join("");

  return `export default function HomePage() {
  return (
    <main
      className="bg-[#FBFBFD]"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-[#F5F5F7] text-[#6E6E73] text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] inline-block"></span>
            Live Preview
          </div>
          <h1 className="text-6xl font-semibold tracking-tight text-[#1D1D1F] mb-6 leading-[1.05]">${app.appName}</h1>
          <p className="text-xl text-[#6E6E73] mb-10 leading-relaxed max-w-xl mx-auto">
            ${subtext}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="${primaryHref}"
              className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer"
            >
              ${primaryLabel}
            </a>
            <a
              href="${secondaryHref}"
              className="bg-transparent border border-[#D2D2D7] text-[#1D1D1F] text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer"
            >
              ${secondaryLabel}
            </a>
          </div>
        </div>
        <div className="mt-20 w-full max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
${featureCards}
          </div>
        </div>
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

function loginPageTsx(appName: string): string {
  return `'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6 py-12 bg-[#FBFBFD]"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#0071E3] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="7" y="12" width="14" height="11" rx="2" stroke="white" strokeWidth="1.8" />
              <path d="M10 12V9a4 4 0 018 0v3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="14" cy="17.5" r="1.5" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">Sign in</h1>
          <p className="text-sm text-[#6E6E73] mt-1">Welcome back to ${appName}</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#D2D2D7] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all"
              />
            </div>
            {error && (
              <div className="bg-[#FFF5F5] border border-[#FFD0CC] text-[#FF3B30] text-sm px-4 py-3 rounded-xl">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-sm text-[#6E6E73] text-center">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#0071E3] hover:text-[#0077ED] font-medium transition-colors">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Signup page
// ---------------------------------------------------------------------------

function signupPageTsx(appName: string): string {
  return `'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6 py-12 bg-[#FBFBFD]"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#0071E3] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="10" r="5" fill="white" />
              <path d="M4 24c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">Create your account</h1>
          <p className="text-sm text-[#6E6E73] mt-1">Join ${appName} today</p>
        </div>

        <div className="bg-white rounded-3xl border border-[#D2D2D7] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Your Name"
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all"
              />
            </div>
            {error && (
              <div className="bg-[#FFF5F5] border border-[#FFD0CC] text-[#FF3B30] text-sm px-4 py-3 rounded-xl">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-sm text-[#6E6E73] text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-[#0071E3] hover:text-[#0077ED] font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
`;
}

// ---------------------------------------------------------------------------
// CRUD list page
// ---------------------------------------------------------------------------

function crudListPageTsx(
  entityName: string,
  entityNameLower: string,
  entityPlural: string,
  apiPath: string,
  includeCart: boolean
): string {
  const addToCartImport = includeCart
    ? `import AddToCartButton from '@/components/AddToCartButton';\n`
    : "";

  const addToCartSection = includeCart
    ? `              <div className="mt-4">
                <AddToCartButton productId={String(item.id)} />
              </div>`
    : "";

  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
${addToCartImport}
type EntityItem = { id: string; [key: string]: unknown };

export default function ${entityName}sPage() {
  const [items, setItems] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('${apiPath}')
      .then(data => setItems(Array.isArray(data) ? data : (data as any).data ?? (data as any).items ?? []))
      .catch(() => setError('Failed to load ${entityNameLower}s'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this ${entityNameLower}?')) return;
    try {
      await apiFetch(\`${apiPath}/\${id}\`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
      alert('Failed to delete');
    }
  }

  return (
    <main
      className="max-w-6xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">${entityName}s</h1>
          {!loading && (
            <p className="text-sm text-[#6E6E73] mt-1">{items.length} {items.length === 1 ? '${entityNameLower}' : '${entityNameLower}s'}</p>
          )}
        </div>
        <Link
          href="/${entityPlural}/new"
          className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer"
        >
          New ${entityName}
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FFF5F5] border border-[#FFD0CC] text-[#FF3B30] text-sm px-4 py-3 rounded-xl mb-6">{error}</div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-[#D2D2D7] p-6 animate-pulse">
              <div className="h-5 bg-[#F5F5F7] rounded-lg w-3/4 mb-3" />
              <div className="h-4 bg-[#F5F5F7] rounded-lg w-full mb-2" />
              <div className="h-4 bg-[#F5F5F7] rounded-lg w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="20" height="20" rx="4" stroke="#6E6E73" strokeWidth="1.5" />
              <path d="M10 14h8M14 10v8" stroke="#6E6E73" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No ${entityNameLower}s yet</h3>
          <p className="text-sm text-[#6E6E73] mb-6">Get started by creating your first ${entityNameLower}.</p>
          <Link
            href="/${entityPlural}/new"
            className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Create ${entityName}
          </Link>
        </div>
      )}

      {/* Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-[#D2D2D7] p-6 hover:border-[#0071E3]/30 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-[#1D1D1F] leading-snug">
                  {String((item as any).name ?? (item as any).title ?? item.id)}
                </h3>
                {(item as any).price != null && (
                  <span className="bg-[#F5F5F7] text-[#6E6E73] text-xs px-3 py-1 rounded-full ml-2 shrink-0">
                    \${String((item as any).price)}
                  </span>
                )}
              </div>
              {(item as any).description && (
                <p className="text-sm text-[#6E6E73] line-clamp-2 mb-3">
                  {String((item as any).description)}
                </p>
              )}
              {(item as any).createdAt && (
                <p className="text-xs text-[#6E6E73] mb-4">
                  {new Date(String((item as any).createdAt)).toLocaleDateString()}
                </p>
              )}
${addToCartSection}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F5F5F7]">
                <Link
                  href={\`/${entityPlural}/\${item.id}/edit\`}
                  className="bg-transparent border border-[#D2D2D7] text-[#1D1D1F] text-sm font-medium px-4 py-2 rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(String(item.id))}
                  className="bg-transparent border border-[#D2D2D7] text-[#FF3B30] text-sm font-medium px-4 py-2 rounded-full hover:bg-[#FFF5F5] transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
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
// CRUD new page
// ---------------------------------------------------------------------------

function crudNewPageTsx(
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

  const bodyFields = resolvedFields.map((f) => `        ${f.name},`).join("\n");

  const inputElements = resolvedFields
    .map((f) => {
      const inputType =
        f.type === "number" ? "number" : f.type === "boolean" ? "checkbox" : "text";
      if (inputType === "checkbox") {
        return `            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="${f.name}"
                checked={Boolean(${f.name})}
                onChange={e => set${capitalize(f.name)}(e.target.checked ? "true" : "false")}
                className="w-4 h-4 rounded border-[#D2D2D7] accent-[#0071E3]"
              />
              <label htmlFor="${f.name}" className="text-sm font-medium text-[#1D1D1F]">${f.label}</label>
            </div>`;
      }
      return `            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">${f.label}</label>
              <input
                type="${inputType}"
                value={${f.name}}
                onChange={e => set${capitalize(f.name)}(${f.type === "number" ? "Number(e.target.value)" : "e.target.value"})}
                required
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all"
              />
            </div>`;
    })
    .join("\n");

  return `'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function New${entityName}Page() {
${stateLines}
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('${apiPath}', {
        method: 'POST',
        body: JSON.stringify({
${bodyFields}
        }),
      });
      router.push('/${entityPlural}');
    } catch (err: any) {
      setError(err.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="max-w-2xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="mb-8">
        <Link href="/${entityPlural}" className="inline-flex items-center gap-1 text-sm text-[#0071E3] hover:underline mb-4">
          ← Back to ${entityName}s
        </Link>
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">New ${entityName}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#D2D2D7] p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
${inputElements}
          {error && (
            <div className="bg-[#FFF5F5] border border-[#FFD0CC] text-[#FF3B30] text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create ${entityName}'}
            </button>
            <Link
              href="/${entityPlural}"
              className="bg-transparent border border-[#D2D2D7] text-[#1D1D1F] text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer"
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
      return `      set${capitalize(f.name)}(String(data.${f.name} ?? ''));`;
    })
    .join("\n");

  const bodyFields = resolvedFields.map((f) => `        ${f.name},`).join("\n");

  const inputElements = resolvedFields
    .map((f) => {
      const inputType =
        f.type === "number" ? "number" : f.type === "boolean" ? "checkbox" : "text";
      if (inputType === "checkbox") {
        return `            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="${f.name}"
                checked={Boolean(${f.name})}
                onChange={e => set${capitalize(f.name)}(e.target.checked ? "true" : "false")}
                className="w-4 h-4 rounded border-[#D2D2D7] accent-[#0071E3]"
              />
              <label htmlFor="${f.name}" className="text-sm font-medium text-[#1D1D1F]">${f.label}</label>
            </div>`;
      }
      return `            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">${f.label}</label>
              <input
                type="${inputType}"
                value={${f.name}}
                onChange={e => set${capitalize(f.name)}(${f.type === "number" ? "Number(e.target.value)" : "e.target.value"})}
                required
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all"
              />
            </div>`;
    })
    .join("\n");

  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Edit${entityName}Page() {
  const params = useParams();
  const router = useRouter();
${stateLines}
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    apiFetch(\`${apiPath}/\${params.id}\`)
      .then(data => {
${itemAssignments}
      })
      .finally(() => setFetching(false));
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch(\`${apiPath}/\${params.id}\`, {
        method: 'PUT',
        body: JSON.stringify({
${bodyFields}
        }),
      });
      router.push(\`/${entityPlural}/\${params.id}\`);
    } catch (err: any) {
      setError(err.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#F5F5F7] rounded-xl w-1/3" />
          <div className="h-64 bg-[#F5F5F7] rounded-2xl" />
        </div>
      </main>
    );
  }

  return (
    <main
      className="max-w-2xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="mb-8">
        <Link href={\`/${entityPlural}/\${params.id}\`} className="inline-flex items-center gap-1 text-sm text-[#0071E3] hover:underline mb-4">
          ← Back
        </Link>
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Edit ${entityName}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#D2D2D7] p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
${inputElements}
          {error && (
            <div className="bg-[#FFF5F5] border border-[#FFD0CC] text-[#FF3B30] text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={\`/${entityPlural}/\${params.id}\`}
              className="bg-transparent border border-[#D2D2D7] text-[#1D1D1F] text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer"
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
// Cart page
// ---------------------------------------------------------------------------

function cartPageTsx(): string {
  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type CartItem = { id: string; quantity: number; product?: { name?: string; title?: string; price?: number } };
type Cart = { id: string; items: CartItem[]; total?: number };

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadCart() {
    try {
      const data = await apiFetch('/api/cart');
      setCart(data);
    } catch {
      // cart may not exist yet
    }
    setLoading(false);
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQuantity(itemId: string, delta: number, current: number) {
    const newQty = current + delta;
    if (newQty < 1) {
      await removeItem(itemId);
      return;
    }
    try {
      await apiFetch(\`/api/cart/items/\${itemId}\`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty }),
      });
      loadCart();
    } catch { /* ignore */ }
  }

  async function removeItem(itemId: string) {
    try {
      await apiFetch(\`/api/cart/items/\${itemId}\`, { method: 'DELETE' });
      loadCart();
    } catch { /* ignore */ }
  }

  const subtotal = cart?.items?.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0) ?? 0;
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <main
      className="max-w-5xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight mb-8">Your Cart</h1>

      {loading && (
        <div className="animate-pulse space-y-3">
          {[1, 2].map(n => <div key={n} className="h-20 bg-[#F5F5F7] rounded-2xl" />)}
        </div>
      )}

      {!loading && (!cart?.items?.length) && (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h2.5l3.5 14h10l3-9H9" stroke="#6E6E73" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="13" cy="22" r="1.5" fill="#6E6E73" />
              <circle cx="20" cy="22" r="1.5" fill="#6E6E73" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">Your cart is empty</h3>
          <p className="text-sm text-[#6E6E73]">Add some items to get started.</p>
        </div>
      )}

      {!loading && cart?.items?.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Line items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-[#D2D2D7] p-5 flex gap-4">
                {/* Image placeholder */}
                <div className="w-16 h-16 bg-[#F5F5F7] rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1D1D1F] truncate">
                    {item.product?.name ?? item.product?.title ?? 'Item'}
                  </p>
                  {item.product?.price != null && (
                    <p className="text-sm text-[#6E6E73] mt-0.5">\${item.product.price.toFixed(2)} each</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1, item.quantity)}
                      className="w-7 h-7 rounded-full border border-[#D2D2D7] flex items-center justify-center text-[#1D1D1F] text-sm hover:bg-[#F5F5F7] transition-colors"
                    >
                      −
                    </button>
                    <span className="text-sm font-medium text-[#1D1D1F] w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1, item.quantity)}
                      className="w-7 h-7 rounded-full border border-[#D2D2D7] flex items-center justify-center text-[#1D1D1F] text-sm hover:bg-[#F5F5F7] transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  {item.product?.price != null && (
                    <p className="text-sm font-semibold text-[#1D1D1F]">
                      \${(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  )}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="bg-transparent border border-[#D2D2D7] text-[#FF3B30] text-sm font-medium px-4 py-2 rounded-full hover:bg-[#FFF5F5] transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-white rounded-2xl border border-[#D2D2D7] p-6 sticky top-20">
              <h2 className="text-base font-semibold text-[#1D1D1F] mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">Subtotal</span>
                  <span className="text-[#1D1D1F] font-medium">\${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">Tax (10%)</span>
                  <span className="text-[#1D1D1F] font-medium">\${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-[#D2D2D7] pt-3 flex justify-between">
                  <span className="font-semibold text-[#1D1D1F]">Total</span>
                  <span className="font-semibold text-[#1D1D1F]">\${total.toFixed(2)}</span>
                </div>
              </div>
              <button className="w-full mt-6 bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer">
                Checkout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// AddToCart button component
// ---------------------------------------------------------------------------

function addToCartButtonTsx(): string {
  return `'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function AddToCartButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function addToCart() {
    setLoading(true);
    try {
      await apiFetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={addToCart}
      disabled={loading}
      className={\`rounded-full px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 \${
        added
          ? 'bg-[#34C759] text-white'
          : 'bg-[#0071E3] hover:bg-[#0077ED] text-white'
      }\`}
    >
      {added ? 'Added to Cart' : loading ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

function dashboardPageTsx(): string {
  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return \`\${diff}s ago\`;
  if (diff < 3600) return \`\${Math.floor(diff / 60)}m ago\`;
  if (diff < 86400) return \`\${Math.floor(diff / 3600)}h ago\`;
  return \`\${Math.floor(diff / 86400)}d ago\`;
}

const METRIC_ICONS: Record<string, string> = {
  users: '👤', entities: '📦', revenue: '💰', today: '📅',
  orders: '🛒', products: '🏷️', total: '📊',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/dashboard/stats')
      .then(data => setStats((data as Record<string, number>) ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const metricCards = [
    { key: 'users', label: 'Users', value: stats.users ?? stats.userCount ?? 0, icon: '👤' },
    { key: 'entities', label: 'Entities', value: stats.entities ?? stats.itemCount ?? stats.productCount ?? 0, icon: '📦' },
    { key: 'revenue', label: 'Revenue', value: stats.revenue ?? stats.totalRevenue ?? 0, icon: '💰', prefix: '$' },
    { key: 'today', label: 'Today', value: stats.today ?? stats.todayCount ?? 0, icon: '📅' },
  ];

  return (
    <main
      className="max-w-5xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Dashboard</h1>
        <p className="text-sm text-[#6E6E73] mt-1">Overview of your application metrics</p>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-[#D2D2D7] p-6 animate-pulse">
              <div className="h-4 bg-[#F5F5F7] rounded w-2/3 mb-4" />
              <div className="h-8 bg-[#F5F5F7] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metricCards.map(card => (
            <div key={card.key} className="bg-white rounded-2xl border border-[#D2D2D7] p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#6E6E73] font-medium">{card.label}</p>
                <span className="text-lg">{card.icon}</span>
              </div>
              <p className="text-3xl font-semibold text-[#1D1D1F]">
                {card.prefix ?? ''}{typeof card.value === 'number' && card.prefix === '$' ? card.value.toLocaleString('en-US', { minimumFractionDigits: 0 }) : card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-[#D2D2D7] p-6">
        <h2 className="text-base font-semibold text-[#1D1D1F] mb-5">Recent Activity</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-[#F5F5F7] rounded-full shrink-0" />
                <div className="flex-1 h-4 bg-[#F5F5F7] rounded" />
                <div className="w-12 h-4 bg-[#F5F5F7] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'New user registered', time: new Date(Date.now() - 120000) },
              { label: 'Item created', time: new Date(Date.now() - 600000) },
              { label: 'Order placed', time: new Date(Date.now() - 3600000) },
              { label: 'Dashboard viewed', time: new Date(Date.now() - 7200000) },
            ].map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#F5F5F7] rounded-full flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 bg-[#0071E3] rounded-full" />
                </div>
                <p className="text-sm text-[#1D1D1F] flex-1">{entry.label}</p>
                <span className="text-xs text-[#6E6E73]">{timeAgo(entry.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts placeholder */}
      <div className="mt-6 bg-white rounded-2xl border border-[#D2D2D7] p-6">
        <h2 className="text-base font-semibold text-[#1D1D1F] mb-5">Analytics</h2>
        <div className="h-48 bg-[#F5F5F7] rounded-xl flex items-center justify-center">
          <p className="text-sm text-[#6E6E73]">Charts coming soon</p>
        </div>
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Blog pages
// ---------------------------------------------------------------------------

function blogListPageTsx(): string {
  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

type Post = { id: string; title?: string; body?: string; content?: string; createdAt?: string; author?: string; [key: string]: unknown };

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/posts')
      .then(data => setPosts(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main
      className="max-w-4xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Blog</h1>
        <Link
          href="/posts/new"
          className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer"
        >
          New Post
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-[#D2D2D7] p-6 animate-pulse">
              <div className="h-5 bg-[#F5F5F7] rounded w-2/3 mb-3" />
              <div className="h-4 bg-[#F5F5F7] rounded w-full mb-2" />
              <div className="h-4 bg-[#F5F5F7] rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-24">
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No posts yet</h3>
          <p className="text-sm text-[#6E6E73] mb-6">Write your first blog post.</p>
          <Link href="/posts/new" className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer">
            Write Post
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {posts.map(post => (
          <Link key={post.id} href={\`/posts/\${post.id}\`} className="block">
            <div className="bg-white rounded-2xl border border-[#D2D2D7] p-6 hover:border-[#0071E3]/30 hover:shadow-sm transition-all">
              <h2 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                {String(post.title ?? post.id)}
              </h2>
              {(post.body || post.content) && (
                <p className="text-sm text-[#6E6E73] line-clamp-2 mb-3">
                  {String(post.body ?? post.content)}
                </p>
              )}
              <div className="flex items-center gap-4">
                {post.author && (
                  <span className="bg-[#F5F5F7] text-[#6E6E73] text-xs px-3 py-1 rounded-full">{String(post.author)}</span>
                )}
                {post.createdAt && (
                  <span className="text-xs text-[#6E6E73]">
                    {new Date(String(post.createdAt)).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
`;
}

function blogNewPageTsx(): string {
  return `'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/posts', { method: 'POST', body: JSON.stringify({ title, content }) });
      router.push('/posts');
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="max-w-2xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="mb-8">
        <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-[#0071E3] hover:underline mb-4">
          ← Back to Blog
        </Link>
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">New Post</h1>
      </div>
      <div className="bg-white rounded-2xl border border-[#D2D2D7] p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="Post title"
              className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={8}
              placeholder="Write your post..."
              className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all resize-none"
            />
          </div>
          {error && (
            <div className="bg-[#FFF5F5] border border-[#FFD0CC] text-[#FF3B30] text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
            <Link href="/posts" className="bg-transparent border border-[#D2D2D7] text-[#1D1D1F] text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer">
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

function blogDetailPageTsx(): string {
  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Post = { id: string; title?: string; body?: string; content?: string; author?: string; createdAt?: string; [key: string]: unknown };

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(\`/api/posts/\${params.id}\`)
      .then(data => setPost(data))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDelete() {
    if (!confirm('Delete this post?')) return;
    await apiFetch(\`/api/posts/\${params.id}\`, { method: 'DELETE' });
    router.push('/posts');
  }

  if (loading) return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#F5F5F7] rounded w-2/3" />
        <div className="h-64 bg-[#F5F5F7] rounded-2xl" />
      </div>
    </main>
  );

  if (!post) return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-[#6E6E73]">Post not found.</p>
    </main>
  );

  return (
    <main
      className="max-w-3xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-[#0071E3] hover:underline mb-8">
        ← Back to Blog
      </Link>
      <div className="bg-white rounded-2xl border border-[#D2D2D7] p-8">
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight mb-3">
          {String(post.title ?? post.id)}
        </h1>
        <div className="flex items-center gap-3 mb-6">
          {post.author && <span className="bg-[#F5F5F7] text-[#6E6E73] text-xs px-3 py-1 rounded-full">{String(post.author)}</span>}
          {post.createdAt && <span className="text-xs text-[#6E6E73]">{new Date(String(post.createdAt)).toLocaleDateString()}</span>}
        </div>
        <div className="text-sm text-[#1D1D1F] leading-relaxed whitespace-pre-wrap">
          {String(post.body ?? post.content ?? '')}
        </div>
        <div className="flex gap-3 mt-8 pt-6 border-t border-[#D2D2D7]">
          <button
            onClick={handleDelete}
            className="bg-transparent border border-[#D2D2D7] text-[#FF3B30] text-sm font-medium px-4 py-2 rounded-full hover:bg-[#FFF5F5] transition-colors cursor-pointer"
          >
            Delete Post
          </button>
        </div>
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Team page
// ---------------------------------------------------------------------------

function teamPageTsx(): string {
  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Member = { id: string; name?: string; role?: string; email?: string; avatar?: string; [key: string]: unknown };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/team')
      .then(data => setMembers(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main
      className="max-w-5xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight mb-2">Our Team</h1>
        <p className="text-sm text-[#6E6E73]">Meet the people behind the product.</p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-[#D2D2D7] p-6 animate-pulse text-center">
              <div className="w-16 h-16 bg-[#F5F5F7] rounded-full mx-auto mb-4" />
              <div className="h-4 bg-[#F5F5F7] rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-[#F5F5F7] rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      )}

      {!loading && members.length === 0 && (
        <div className="text-center py-24">
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No team members yet</h3>
          <p className="text-sm text-[#6E6E73]">Add members via the API.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {members.map(member => (
          <div key={member.id} className="bg-white rounded-2xl border border-[#D2D2D7] p-6 text-center hover:shadow-sm transition-shadow">
            <div className="w-16 h-16 bg-[#F5F5F7] rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
              {member.avatar ? (
                <img src={String(member.avatar)} alt={String(member.name ?? '')} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[#6E6E73] text-xl font-semibold">
                  {String(member.name ?? '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#1D1D1F]">{String(member.name ?? 'Member')}</p>
            {member.role && (
              <p className="text-xs text-[#6E6E73] mt-1">{String(member.role)}</p>
            )}
            {member.email && (
              <p className="text-xs text-[#0071E3] mt-2 truncate">{String(member.email)}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Bookings pages
// ---------------------------------------------------------------------------

function bookingsListPageTsx(): string {
  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

type Booking = { id: string; title?: string; date?: string; time?: string; status?: string; notes?: string; [key: string]: unknown };

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/bookings')
      .then(data => setBookings(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    confirmed: 'bg-[#34C759]/10 text-[#34C759]',
    pending: 'bg-[#FF9F0A]/10 text-[#FF9F0A]',
    cancelled: 'bg-[#FF3B30]/10 text-[#FF3B30]',
  };

  return (
    <main
      className="max-w-4xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Bookings</h1>
          {!loading && <p className="text-sm text-[#6E6E73] mt-1">{bookings.length} bookings</p>}
        </div>
        <Link href="/bookings/new" className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer">
          New Booking
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-[#D2D2D7] p-5 animate-pulse">
              <div className="h-5 bg-[#F5F5F7] rounded w-1/3 mb-2" />
              <div className="h-4 bg-[#F5F5F7] rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && bookings.length === 0 && (
        <div className="text-center py-24">
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No bookings yet</h3>
          <p className="text-sm text-[#6E6E73] mb-6">Create your first booking.</p>
          <Link href="/bookings/new" className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer">
            Book Now
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map(booking => (
          <div key={booking.id} className="bg-white rounded-2xl border border-[#D2D2D7] p-5 hover:border-[#0071E3]/30 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#1D1D1F]">
                  {String(booking.title ?? \`Booking #\${booking.id}\`)}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {booking.date && <span className="text-sm text-[#6E6E73]">{String(booking.date)}</span>}
                  {booking.time && <span className="text-sm text-[#6E6E73]">{String(booking.time)}</span>}
                </div>
              </div>
              {booking.status && (
                <span className={\`text-xs px-3 py-1 rounded-full font-medium \${statusColor[String(booking.status).toLowerCase()] ?? 'bg-[#F5F5F7] text-[#6E6E73]'}\`}>
                  {String(booking.status)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
`;
}

function bookingsNewPageTsx(): string {
  return `'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewBookingPage() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify({ title, date, time, notes }) });
      router.push('/bookings');
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="max-w-2xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="mb-8">
        <Link href="/bookings" className="inline-flex items-center gap-1 text-sm text-[#0071E3] hover:underline mb-4">
          ← Back to Bookings
        </Link>
        <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">New Booking</h1>
      </div>
      <div className="bg-white rounded-2xl border border-[#D2D2D7] p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Booking title"
              className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Any additional notes..."
              className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all resize-none" />
          </div>
          {error && (
            <div className="bg-[#FFF5F5] border border-[#FFD0CC] text-[#FF3B30] text-sm px-4 py-3 rounded-xl">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50">
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
            <Link href="/bookings" className="bg-transparent border border-[#D2D2D7] text-[#1D1D1F] text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer">
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
// Payments page
// ---------------------------------------------------------------------------

function paymentsPageTsx(): string {
  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Payment = { id: string; amount?: number; status?: string; description?: string; createdAt?: string; [key: string]: unknown };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/payments')
      .then(data => setPayments(Array.isArray(data) ? data : (data as any).data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const statusColor: Record<string, string> = {
    paid: 'bg-[#34C759]/10 text-[#34C759]',
    pending: 'bg-[#FF9F0A]/10 text-[#FF9F0A]',
    failed: 'bg-[#FF3B30]/10 text-[#FF3B30]',
    refunded: 'bg-[#6E6E73]/10 text-[#6E6E73]',
  };

  return (
    <main
      className="max-w-4xl mx-auto px-6 py-10"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] tracking-tight">Payments</h1>
          {!loading && <p className="text-sm text-[#6E6E73] mt-1">{payments.length} transactions</p>}
        </div>
        {!loading && payments.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#D2D2D7] px-5 py-3 text-right">
            <p className="text-xs text-[#6E6E73]">Total</p>
            <p className="text-lg font-semibold text-[#1D1D1F]">\${total.toFixed(2)}</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-[#D2D2D7] p-5 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 bg-[#F5F5F7] rounded w-1/3" />
                <div className="h-5 bg-[#F5F5F7] rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="text-center py-24">
          <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No payments yet</h3>
          <p className="text-sm text-[#6E6E73]">Transactions will appear here once payments are processed.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#D2D2D7] overflow-hidden">
        {payments.map((payment, i) => (
          <div key={payment.id} className={\`p-5 flex items-center justify-between \${i < payments.length - 1 ? 'border-b border-[#F5F5F7]' : ''}\`}>
            <div>
              <p className="text-sm font-semibold text-[#1D1D1F]">
                {String(payment.description ?? \`Invoice #\${payment.id}\`)}
              </p>
              {payment.createdAt && (
                <p className="text-xs text-[#6E6E73] mt-0.5">
                  {new Date(String(payment.createdAt)).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {payment.status && (
                <span className={\`text-xs px-3 py-1 rounded-full font-medium \${statusColor[String(payment.status).toLowerCase()] ?? 'bg-[#F5F5F7] text-[#6E6E73]'}\`}>
                  {String(payment.status)}
                </span>
              )}
              {payment.amount != null && (
                <p className="text-sm font-semibold text-[#1D1D1F]">\${Number(payment.amount).toFixed(2)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
`;
}

// ---------------------------------------------------------------------------
// Reviews component (injected into entity detail pages)
// ---------------------------------------------------------------------------

function reviewsSectionTsx(entityPlural: string): string {
  return `'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Review = { id: string; rating?: number; comment?: string; author?: string; createdAt?: string };

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} width="14" height="14" viewBox="0 0 14 14" fill={n <= rating ? '#FF9F0A' : '#D2D2D7'} xmlns="http://www.w3.org/2000/svg">
          <path d="M7 1l1.545 3.13 3.455.502-2.5 2.436.59 3.437L7 8.885l-3.09 1.62.59-3.437L2 4.632l3.455-.502L7 1z" />
        </svg>
      ))}
    </div>
  );
}

export default function ReviewsSection({ entityId }: { entityId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch(\`/api/${entityPlural}/\${entityId}/reviews\`)
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [entityId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await apiFetch(\`/api/${entityPlural}/\${entityId}/reviews\`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      setReviews(prev => [r, ...prev]);
      setComment('');
      setRating(5);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length : 0;

  return (
    <div
      className="mt-8"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-[#1D1D1F]">Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-sm text-[#6E6E73]">{avgRating.toFixed(1)} ({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Submit review */}
      <div className="bg-white rounded-2xl border border-[#D2D2D7] p-6 mb-5">
        <h3 className="text-sm font-semibold text-[#1D1D1F] mb-4">Write a Review</h3>
        <form onSubmit={submitReview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)} className="p-0.5">
                  <svg width="24" height="24" viewBox="0 0 14 14" fill={n <= rating ? '#FF9F0A' : '#D2D2D7'} xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 1l1.545 3.13 3.455.502-2.5 2.436.59 3.437L7 8.885l-3.09 1.62.59-3.437L2 4.632l3.455-.502L7 1z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Comment</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Share your thoughts..."
              className="w-full border border-[#D2D2D7] rounded-xl px-4 py-3 text-[#1D1D1F] text-sm focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] bg-white transition-all resize-none"
            />
          </div>
          <button type="submit" disabled={loading}
            className="bg-[#0071E3] hover:bg-[#0077ED] text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.map(review => (
          <div key={review.id} className="bg-white rounded-2xl border border-[#D2D2D7] p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-[#1D1D1F]">{review.author ?? 'Anonymous'}</p>
                {review.rating != null && <StarRating rating={review.rating} />}
              </div>
              {review.createdAt && (
                <span className="text-xs text-[#6E6E73]">
                  {new Date(String(review.createdAt)).toLocaleDateString()}
                </span>
              )}
            </div>
            {review.comment && <p className="text-sm text-[#6E6E73] leading-relaxed">{review.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
`;
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
  const hasBlog = hasBucket(app, "blog");
  const hasTeam = hasBucket(app, "team");
  const hasReviews = hasBucket(app, "reviews");
  const hasBookings = hasBucket(app, "bookings");
  const hasPayments = hasBucket(app, "payments");

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
  await write(path.join(webDir, "src/lib/auth.tsx"), libAuthTs());

  // ── Components ───────────────────────────────────────────────────────────
  await write(path.join(webDir, "src/components/Navbar.tsx"), navbarTsx(app));

  if (hasCart) {
    await write(
      path.join(webDir, "src/components/AddToCartButton.tsx"),
      addToCartButtonTsx()
    );
  }

  if (hasReviews && hasCrud) {
    await write(
      path.join(webDir, "src/components/ReviewsSection.tsx"),
      reviewsSectionTsx(entityPlural)
    );
  }

  // ── App shell ────────────────────────────────────────────────────────────
  await write(path.join(webDir, "src/app/layout.tsx"), layoutTsx(app));
  await write(path.join(webDir, "src/app/page.tsx"), homePageTsx(app));

  // ── Auth pages ───────────────────────────────────────────────────────────
  if (hasAuth) {
    await write(
      path.join(webDir, "src/app/login/page.tsx"),
      loginPageTsx(app.appName)
    );
    await write(
      path.join(webDir, "src/app/signup/page.tsx"),
      signupPageTsx(app.appName)
    );
  }

  // ── CRUD pages ───────────────────────────────────────────────────────────
  if (hasCrud) {
    await write(
      path.join(webDir, `src/app/${entityPlural}/page.tsx`),
      crudListPageTsx(entityName, entityNameLower, entityPlural, apiPath, hasCart)
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

  // ── Blog pages ───────────────────────────────────────────────────────────
  if (hasBlog) {
    await write(path.join(webDir, "src/app/posts/page.tsx"), blogListPageTsx());
    await write(path.join(webDir, "src/app/posts/new/page.tsx"), blogNewPageTsx());
    await write(
      path.join(webDir, "src/app/posts/[id]/page.tsx"),
      blogDetailPageTsx()
    );
  }

  // ── Team page ────────────────────────────────────────────────────────────
  if (hasTeam) {
    await write(path.join(webDir, "src/app/team/page.tsx"), teamPageTsx());
  }

  // ── Bookings pages ───────────────────────────────────────────────────────
  if (hasBookings) {
    await write(
      path.join(webDir, "src/app/bookings/page.tsx"),
      bookingsListPageTsx()
    );
    await write(
      path.join(webDir, "src/app/bookings/new/page.tsx"),
      bookingsNewPageTsx()
    );
  }

  // ── Payments page ────────────────────────────────────────────────────────
  if (hasPayments) {
    await write(
      path.join(webDir, "src/app/payments/page.tsx"),
      paymentsPageTsx()
    );
  }
}
