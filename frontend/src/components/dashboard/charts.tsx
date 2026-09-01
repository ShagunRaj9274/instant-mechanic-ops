'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dayLabel, money, moneyCompact, number } from '@/lib/format';
import { BOOKING_STATUS, CATEGORY_COLOR, CATEGORY_LABEL, type BookingStatus } from '@/lib/status';
import { Skeleton } from '@/components/ui/primitives';

const AXIS = { fontSize: 11, fill: 'rgb(var(--muted))' };
const GRID = 'rgb(var(--line))';

export function ChartFrame({ loading, children }: { loading?: boolean; children: React.ReactNode }) {
  if (loading) return <Skeleton className="h-[260px] w-full" />;
  return <div className="h-[260px] w-full">{children}</div>;
}

function TooltipCard({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2 shadow-pop">
      {label ? <p className="mb-1 text-xs font-medium">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} className="tabular flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}
          <span className="ml-auto font-medium text-ink">
            {formatter ? formatter(entry.value, entry.name) : number(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function BookingsTrend({
  data,
  loading,
}: {
  data: Array<{ date: string; bookings: number; completed: number }>;
  loading?: boolean;
}) {
  return (
    <ChartFrame loading={loading}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5a524" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f5a524" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={dayLabel}
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={28}
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip
            content={<TooltipCard />}
            labelFormatter={(value) => dayLabel(String(value))}
            cursor={{ stroke: GRID }}
          />
          <Area
            type="monotone"
            dataKey="bookings"
            name="Bookings"
            stroke="#f5a524"
            strokeWidth={2}
            fill="url(#bookingsFill)"
          />
          <Line
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="#2fbf71"
            strokeWidth={1.6}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RevenueTrend({
  data,
  loading,
}: {
  data: Array<{ date: string; revenue: number }>;
  loading?: boolean;
}) {
  return (
    <ChartFrame loading={loading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={dayLabel}
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            minTickGap={28}
          />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value) => moneyCompact(Number(value))}
          />
          <Tooltip
            content={<TooltipCard formatter={(value) => money(value)} />}
            labelFormatter={(value) => dayLabel(String(value))}
            cursor={{ fill: 'rgb(var(--raised))' }}
          />
          <Bar dataKey="revenue" name="Revenue" fill="#4c9aff" radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function StatusDonut({
  data,
  loading,
}: {
  data: Array<{ status: BookingStatus; count: number }>;
  loading?: boolean;
}) {
  const shaped = data.map((item) => ({
    name: BOOKING_STATUS[item.status].label,
    value: item.count,
    color: BOOKING_STATUS[item.status].chart,
  }));

  return (
    <ChartFrame loading={loading}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={shaped}
            dataKey="value"
            nameKey="name"
            innerRadius={54}
            outerRadius={82}
            paddingAngle={2}
            stroke="rgb(var(--surface))"
            strokeWidth={2}
          >
            {shaped.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipCard />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={7}
            formatter={(value) => <span className="text-xs text-muted">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function CategoryBars({
  data,
  loading,
}: {
  data: Array<{ category: string; bookings: number; revenue: number }>;
  loading?: boolean;
}) {
  const shaped = data.map((item) => ({
    name: CATEGORY_LABEL[item.category] ?? item.category,
    bookings: item.bookings,
    revenue: item.revenue,
    color: CATEGORY_COLOR[item.category] ?? '#8fa0b3',
  }));

  return (
    <ChartFrame loading={loading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={shaped} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={104}
          />
          <Tooltip
            content={
              <TooltipCard
                formatter={(value, name) => (name === 'Revenue' ? money(value) : number(value))}
              />
            }
            cursor={{ fill: 'rgb(var(--raised))' }}
          />
          <Bar dataKey="bookings" name="Bookings" radius={[0, 3, 3, 0]} maxBarSize={18}>
            {shaped.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function CityBars({
  data,
  loading,
}: {
  data: Array<{ city: string; bookings: number; revenue: number }>;
  loading?: boolean;
}) {
  return (
    <ChartFrame loading={loading}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="city" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value) => moneyCompact(Number(value))}
          />
          <Tooltip
            content={<TooltipCard formatter={(value, name) => (name === 'Revenue' ? money(value) : number(value))} />}
            cursor={{ fill: 'rgb(var(--raised))' }}
          />
          <Bar dataKey="revenue" name="Revenue" fill="#2fbf71" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
