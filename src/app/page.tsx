"use client";

export const runtime = 'edge';

import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import Script from "next/script";
import { analytics } from "@/lib/analytics";
import { type Response, type Variant } from "@/types";
import { v4 as uuidv4 } from "uuid";

const RESPONSE_COOKIE = "has-responded";
const VARIANT_COOKIE = "ab-test-variant";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export default function Home() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const [sessionId] = useState(() => uuidv4());
  const [hasResponded, setHasResponded] = useState(false);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);

  const getCookie = useCallback((name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  }, []);

  const setCookie = useCallback((name: string, value: string) => {
    document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }, []);

  const clearCookie = useCallback((name: string) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }, []);

  const getRandomVariant = useCallback(async (): Promise<Variant> => {
    try {
      const response = await fetch("/api/random", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch random variant");

      const data: {
        variant: Variant;
        source: "random.org" | "fallback";
        timestamp: string;
      } = await response.json();
      return data.variant;
    } catch (error) {
      console.error("Failed to get random variant:", error);
      return crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0 ? "A" : "B";
    }
  }, []);

  const initializeTest = useCallback(async () => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    try {
      const hasRespondedCookie = getCookie(RESPONSE_COOKIE);

      if (hasRespondedCookie) {
        setHasResponded(true);
        setLoading(false);
        return;
      }

      const existingVariant = getCookie(VARIANT_COOKIE) as Variant | null;
      if (existingVariant && ["A", "B"].includes(existingVariant)) {
        setVariant(existingVariant);
        setLoading(false);
        return;
      }

      const newVariant = await getRandomVariant();
      setVariant(newVariant);
      setCookie(VARIANT_COOKIE, newVariant);
    } catch (error) {
      console.error("Failed to initialize test:", error);
    } finally {
      setLoading(false);
    }
  }, [getRandomVariant, setCookie, getCookie]);

  useEffect(() => {
    initializeTest();
    analytics.loadPersistedEvents();
  }, [initializeTest]);

  const handleClick = useCallback(
    async (response: Response) => {
      if (!variant) return;

      analytics.trackEvent({
        variant,
        response,
        timestamp: new Date().toISOString(),
        sessionId,
      });

      setCookie(RESPONSE_COOKIE, "true");
      clearCookie(VARIANT_COOKIE);
      setHasResponded(true);
    },
    [variant, sessionId, setCookie, clearCookie],
  );

  const handleRetry = useCallback(async () => {
    setLoading(true);
    try {
      clearCookie(RESPONSE_COOKIE);
      clearCookie(VARIANT_COOKIE);

      const newVariant = await getRandomVariant();
      setVariant(newVariant);
      setCookie(VARIANT_COOKIE, newVariant);
      setHasResponded(false);
    } catch (error) {
      console.error("Failed to retry test:", error);
    } finally {
      setLoading(false);
    }
  }, [getRandomVariant, clearCookie, setCookie]);

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center">
        <div className="text-center animate-pulse">Loading...</div>
      </main>
    );
  }

  if (hasResponded) {
    return (
      <main className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Thank You!</h1>
          <h2 className="text-xl mb-4">For assisting us with the 2110233 course project</h2>
          <p className="text-gray-600 mb-2">Your response has been recorded.</p>
          <p className="text-gray-600">
            For another test, please contact the tester.
          </p>
          <div
            className="fixed top-0 left-0 w-16 h-16 cursor-default opacity-0"
            onClick={handleRetry}
            role="button"
            tabIndex={0}
            aria-label="Retry test (hidden)"
          />
          <div
            className="fixed top-0 right-0 w-16 h-16 cursor-default opacity-0"
            onClick={handleRetry}
            role="button"
            tabIndex={0}
            aria-label="Retry test (hidden)"
          />
        </div>
      </main>
    );
  }

  if (!variant) return null;

  return (
    <>
      <Script
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "81af223ca9244a19abae3026e9c6c345"}'
        strategy="afterInteractive"
      />
      <main className="flex h-screen items-center justify-center p-6 sm:p-24">
        <div className="flex flex-row gap-6 sm:gap-12 md:gap-24 lg:gap-48">
          <Button
            className="px-8 md:px-10 md:py-6 md:text-lg lg:px-12 lg:py-8 lg:text-xl"
            variant={variant === "A" ? "default" : "secondary"}
            onClick={() => handleClick("yes")}
          >
            Yes
          </Button>
          <Button
            variant="secondary"
            className="px-8 md:px-10 md:py-6 md:text-lg lg:px-12 lg:py-8 lg:text-xl"
            onClick={() => handleClick("no")}
          >
            No
          </Button>
        </div>
      </main>
    </>
  );
}
