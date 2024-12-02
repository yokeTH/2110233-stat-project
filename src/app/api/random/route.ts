import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

interface RandomOrgResponse {
  result: {
    random: {
      data: number[];
    };
  };
}

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { env } = getRequestContext();

    const response = await fetch("https://api.random.org/json-rpc/4/invoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "generateIntegers",
        params: {
          apiKey: env.RANDOM_ORG_API_KEY,
          n: 1,
          min: 0,
          max: 1,
          replacement: true,
        },
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error("Random.org API failed");
    }

    const data = (await response.json()) as RandomOrgResponse;
    const variant = data.result.random.data[0] === 0 ? "A" : "B";

    return NextResponse.json({
      variant,
      source: "random.org",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Random API error:", error);
    const array = new Uint8Array(1);
    crypto.getRandomValues(array);
    const fallbackVariant = array[0] % 2 === 0 ? "A" : "B";

    return NextResponse.json({
      variant: fallbackVariant,
      source: "fallback",
      timestamp: new Date().toISOString(),
    });
  }
}
