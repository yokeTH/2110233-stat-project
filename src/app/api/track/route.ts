import { NextRequest, NextResponse } from "next/server";
import type { TestEvent } from "@/types";
import { nanoid } from "nanoid";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const event: TestEvent = await request.json();
    const eventId = nanoid();
    const { env } = getRequestContext();

    await env.DB.prepare(
      `
      INSERT INTO ab_test_events (
        id,
        variant,
        response,
        session_id,
        timestamp,
        created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `,
    )
      .bind(
        eventId,
        event.variant,
        event.response,
        event.sessionId,
        event.timestamp,
      )
      .run();

    return NextResponse.json({ success: true, eventId });
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "7";
    const { env } = getRequestContext();

    const results = await env.DB.prepare(
      `
      WITH stats AS (
        SELECT 
          variant,
          response,
          COUNT(*) as count,
          CAST(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY variant) as REAL) as percentage
        FROM ab_test_events
        WHERE date(created_at) >= date('now', '-' || ? || ' days')
        GROUP BY variant, response
      )
      SELECT 
        variant,
        response,
        count,
        percentage,
        (
          SELECT CAST(SUM(CASE WHEN response = 'yes' THEN count ELSE 0 END) * 100.0 / SUM(count) as REAL)
          FROM stats s2
          WHERE s2.variant = s1.variant
        ) as conversion_rate
      FROM stats s1
      ORDER BY variant, response;
    `,
    )
      .bind(period)
      .all();

    const stats = calculateStatistics(results.results || []);

    return NextResponse.json({
      results: results.results || [],
      statistics: stats,
    });
  } catch (error) {
    console.error("Error fetching analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch analysis" },
      { status: 500 },
    );
  }
}

function calculateStatistics(data: any[]) {
  const variantA = data.filter((d) => d.variant === "A");
  const variantB = data.filter((d) => d.variant === "B");

  if (!variantA.length || !variantB.length) {
    return {
      zScore: 0,
      pValue: 1,
      isSignificant: false,
      confidenceLevel: 0,
      totalSamples: 0,
      variantASamples: 0,
      variantBSamples: 0,
    };
  }

  const pA = variantA.find((d) => d.response === "yes")?.percentage / 100 || 0;
  const pB = variantB.find((d) => d.response === "yes")?.percentage / 100 || 0;
  const nA = variantA.reduce((sum: number, d: any) => sum + d.count, 0);
  const nB = variantB.reduce((sum: number, d: any) => sum + d.count, 0);

  const p = (pA * nA + pB * nB) / (nA + nB);
  const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
  const zScore = se === 0 ? 0 : Math.abs(pA - pB) / se;
  const pValue = 2 * (1 - normalCDF(zScore));

  return {
    zScore,
    pValue,
    isSignificant: pValue < 0.05,
    confidenceLevel: (1 - pValue) * 100,
    totalSamples: nA + nB,
    variantASamples: nA,
    variantBSamples: nB,
  };
}

function normalCDF(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}
