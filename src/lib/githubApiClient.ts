import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Centralized GitHub API Response Interface
export interface GitHubFetchResponse<T = any> {
  data: T | null;
  status: number;
  rateLimitLimit: number;
  rateLimitRemaining: number;
  rateLimitReset: number;
  isRateLimited: boolean;
  error?: string;
}

/**
 * Server-side Centralized GitHub REST API Client
 * Uses server-only GITHUB_TOKEN environment variable with Bearer authorization header
 */
export async function githubApiClient<T = any>(endpoint: string): Promise<GitHubFetchResponse<T>> {
  const token = process.env.GITHUB_TOKEN;
  const isAuthenticated = Boolean(token);

  const headers: Record<string, string> = {
    "User-Agent": "Paperino-CareerDNA-App",
    "Accept": "application/vnd.github+json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `https://api.github.com${endpoint}`;

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 0 },
    });

    const rateLimitLimit = parseInt(res.headers.get("x-ratelimit-limit") || "60", 10);
    const rateLimitRemaining = parseInt(res.headers.get("x-ratelimit-remaining") || "0", 10);
    const rateLimitReset = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);

    if (res.status === 403 || rateLimitRemaining === 0) {
      console.warn(`[GitHub API Client Warning] Rate limit reached. Authenticated: ${isAuthenticated}, Limit: ${rateLimitLimit}, Remaining: ${rateLimitRemaining}`);
      return {
        data: null,
        status: 403,
        rateLimitLimit,
        rateLimitRemaining,
        rateLimitReset,
        isRateLimited: true,
        error: "GitHub analysis temporarily unavailable due to API rate limits. Please try again later.",
      };
    }

    if (!res.ok) {
      return {
        data: null,
        status: res.status,
        rateLimitLimit,
        rateLimitRemaining,
        rateLimitReset,
        isRateLimited: false,
        error: `GitHub API error (HTTP ${res.status}).`,
      };
    }

    const data = await res.json();
    return {
      data,
      status: res.status,
      rateLimitLimit,
      rateLimitRemaining,
      rateLimitReset,
      isRateLimited: false,
    };
  } catch (err: any) {
    return {
      data: null,
      status: 500,
      rateLimitLimit: 60,
      rateLimitRemaining: 0,
      rateLimitReset: 0,
      isRateLimited: false,
      error: err.message || "Failed to reach GitHub API",
    };
  }
}
