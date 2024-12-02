"use client";

export const runtime = 'edge';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Statistics {
  zScore: number;
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
  totalSamples: number;
  variantASamples: number;
  variantBSamples: number;
}

interface Result {
  variant: string;
  response: string;
  count: number;
  percentage: number;
  conversion_rate: number;
}

interface ApiResponse {
  results: Result[];
  statistics: Statistics;
}

interface ChartData {
  variant: string;
  yes?: number;
  no?: number;
  conversion_rate: number;
}

export default function Dashboard() {
  const [data, setData] = useState<Result[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [period, setPeriod] = useState("7");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/track?period=${period}`);
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const data: ApiResponse = await response.json();
      setData(data.results);
      setStats(data.statistics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatData = (data: Result[]): ChartData[] => {
    return data.reduce((acc: ChartData[], curr) => {
      const existing = acc.find((item) => item.variant === curr.variant);
      if (existing) {
        existing[curr.response as "yes" | "no"] = curr.percentage;
        existing.conversion_rate = curr.conversion_rate;
      } else {
        acc.push({
          variant: curr.variant,
          [curr.response]: curr.percentage,
          conversion_rate: curr.conversion_rate,
        });
      }
      return acc;
    }, []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const formattedData = formatData(data);

  const Chart = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">{children}</CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">A/B Test Results</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalSamples || 0}
              </div>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Statistical Significance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={stats?.isSignificant ? "default" : "secondary"}>
                {stats?.isSignificant ? "Significant" : "Not Significant"}
              </Badge>
              <div className="mt-2 text-sm text-muted-foreground">
                {stats?.confidenceLevel.toFixed(2)}% confidence
              </div>
            </CardContent>
          </Card> */}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Variant A Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.variantASamples || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Variant B Samples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.variantBSamples || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Chart title="Conversion Rates">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variant" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="conversion_rate"
                  name="Conversion Rate %"
                  fill="#8884d8"
                />
              </BarChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="Response Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="variant" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="yes" name="Yes %" fill="#82ca9d" />
                <Bar dataKey="no" name="No %" fill="#ff7c7c" />
              </BarChart>
            </ResponsiveContainer>
          </Chart>
        </div>
      </div>
    </div>
  );
}
