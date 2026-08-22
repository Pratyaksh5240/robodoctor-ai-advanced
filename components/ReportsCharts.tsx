"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function HealthTrendChart({
  data,
}: {
  data: Array<{ date: string; score: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.55} />
            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#cbd5e1" />
        <YAxis stroke="#cbd5e1" domain={[0, 100]} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#22d3ee"
          fillOpacity={1}
          fill="url(#healthFill)"
          strokeWidth={3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SkinTrendChart({
  data,
}: {
  data: Array<{ date: string; score: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#cbd5e1" />
        <YAxis stroke="#cbd5e1" domain={[0, 100]} />
        <Tooltip />
        <Bar dataKey="score" fill="#f59e0b" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
