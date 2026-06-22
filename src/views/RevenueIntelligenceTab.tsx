import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Briefcase,
  Users,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Activity,
} from "lucide-react";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";

export default function RevenueIntelligenceTab({
  userRole,
  orgId,
}: {
  userRole: string;
  orgId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    sales: { openOpps: 0, pipelineValue: 0, wonValue: 0, lostValue: 0 },
    delivery: {
      openReqs: 0,
      matchedCandidates: 0,
      submissions: 0,
      interviews: 0,
      placements: 0,
    },
    financials: {
      projectedRevenue: 0,
      expectedRevenue: 0,
      actualRevenue: 0,
      platformMargin: 0,
      vendorSpend: 0,
    },
  });

  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(
    userRole,
  );

  useEffect(() => {
    let active = true;
    const fetchMetrics = async () => {
      try {
        const reqsSnap = await getDocs(collection(db, "requirements_public"));
        const reqs = reqsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const revSnap = await getDocs(collection(db, "revenue_pipeline"));
        const revPipeline = revSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const oppsSnap = await getDocs(collection(db, "match_opportunities"));
        const opps = oppsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const subsSnap = await getDocs(collection(db, "submissions"));
        const subs = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const dealRoomsSnap = await getDocs(collection(db, "dealRooms"));
        const dealRooms = dealRoomsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        if (!active) return;

        // Sales Metrics
        let pipelineValue = 0;
        let expectedRev = 0;
        revPipeline.forEach((o: any) => {
          pipelineValue += o.forecastRevenue || 0;
          expectedRev += o.expectedRevenue || 0;
        });

        let matchedCount = opps.length;

        // Delivery Metrics
        let openReqs = 0;
        reqs.forEach((r: any) => {
          if (r.status === "OPEN" || r.status === "PUBLISHED" || !r.status) {
            openReqs++;
          }
        });

        let interviews = 0;
        let placements = 0;
        let actualRevenue = 0;
        let margin = 0;
        let vendorSpend = 0;

        dealRooms.forEach((d: any) => {
          if (d.currentStage === "Interview" || d.currentStage === "Offer") {
            interviews++;
          }
          if (d.currentStage === "Hired" || d.status === "WON") {
            placements++;
            // Mock Actual Revenue
            actualRevenue += 25000;
            margin += 5000;
            vendorSpend += 20000;
          }
        });

        subs.forEach((s: any) => {
          if (s.status === "INTERVIEWING") interviews++;
          if (s.status === "HIRED" || s.status === "SELECTED") placements++;
        });

        setMetrics({
          sales: {
            openOpps: matchedCount, // Approx
            pipelineValue,
            wonValue: actualRevenue,
            lostValue: 0,
          },
          delivery: {
            openReqs,
            matchedCandidates: matchedCount,
            submissions: subs.length,
            interviews,
            placements,
          },
          financials: {
            projectedRevenue: pipelineValue,
            expectedRevenue: expectedRev,
            actualRevenue,
            platformMargin: margin || actualRevenue * 0.15,
            vendorSpend: vendorSpend || actualRevenue * 0.85,
          },
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchMetrics();
    return () => {
      active = false;
    };
  }, [isAdmin, orgId]);

  if (!isAdmin && userRole !== "hq") {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Access Restricted to HQ
      </div>
    );
  }

  const formatCurrency = (val: number) => "₹" + val.toLocaleString("en-IN");

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">
        Loading Revenue Intelligence...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="bg-white border-b border-slate-200 px-8 py-6 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="text-indigo-600" size={28} />
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            Revenue Intelligence
          </h1>
        </div>
        <p className="text-slate-500 font-medium text-sm">
          Real-time commercial OS pipeline visibility and financial forecasting.
        </p>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
        {/* CEO HIGHLIGHTS */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-slate-900 text-white rounded-2xl p-6 col-span-2">
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
              Pipeline Revenue
            </p>
            <p className="text-4xl font-black mt-2 text-indigo-400">
              {formatCurrency(metrics.financials.projectedRevenue)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
              Expected Revenue
            </p>
            <p className="text-3xl font-black mt-2 text-amber-500">
              {formatCurrency(metrics.financials.expectedRevenue)}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
              Placements YTD
            </p>
            <p className="text-3xl font-black mt-2 text-emerald-600">
              {metrics.delivery.placements}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
              Vendor Fill Rate
            </p>
            <p className="text-3xl font-black mt-2 text-purple-500">
              {metrics.delivery.openReqs > 0
                ? Math.round(
                    (metrics.delivery.placements / metrics.delivery.openReqs) *
                      100,
                  )
                : 0}
              %
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
              Interview Conv
            </p>
            <p className="text-3xl font-black mt-2 text-blue-500">
              {metrics.delivery.submissions > 0
                ? Math.round(
                    (metrics.delivery.interviews /
                      metrics.delivery.submissions) *
                      100,
                  )
                : 0}
              %
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SALES */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <Target className="text-rose-500" size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">
                Sales (CRM)
              </h2>
            </div>
            <div className="space-y-4 flex-1">
              <MetricRow
                label="Open Opportunities"
                value={metrics.sales.openOpps}
              />
              <MetricRow
                label="Pipeline Value"
                value={formatCurrency(metrics.sales.pipelineValue)}
                highlight
              />
              <MetricRow
                label="Won Value"
                value={formatCurrency(metrics.sales.wonValue)}
                textClass="text-emerald-600"
              />
              <MetricRow
                label="Lost Value"
                value={formatCurrency(metrics.sales.lostValue)}
                textClass="text-rose-500"
              />
            </div>
          </div>

          {/* DELIVERY */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <Users className="text-sky-500" size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">
                Delivery (OS)
              </h2>
            </div>
            <div className="space-y-4 flex-1">
              <MetricRow
                label="Open Requirements"
                value={metrics.delivery.openReqs}
              />
              <MetricRow
                label="Matched Candidates"
                value={metrics.delivery.matchedCandidates}
              />
              <MetricRow
                label="Submissions"
                value={metrics.delivery.submissions}
              />
              <MetricRow
                label="Interviews"
                value={metrics.delivery.interviews}
                highlight
              />
              <MetricRow
                label="Placements"
                value={metrics.delivery.placements}
                textClass="text-emerald-600"
              />
            </div>
          </div>

          {/* FINANCIALS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="text-emerald-500" size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">
                Financials
              </h2>
            </div>
            <div className="space-y-4 flex-1">
              <MetricRow
                label="Projected Revenue"
                value={formatCurrency(metrics.financials.projectedRevenue)}
              />
              <MetricRow
                label="Expected Revenue"
                value={formatCurrency(metrics.financials.expectedRevenue)}
                highlight
              />
              <MetricRow
                label="Actual Revenue"
                value={formatCurrency(metrics.financials.actualRevenue)}
                textClass="text-emerald-600"
              />
              <MetricRow
                label="Platform Margin"
                value={formatCurrency(metrics.financials.platformMargin)}
              />
              <MetricRow
                label="Vendor Spend"
                value={formatCurrency(metrics.financials.vendorSpend)}
                textClass="text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight,
  textClass,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  textClass?: string;
}) {
  return (
    <div
      className={cn(
        "flex justify-between items-center py-2 border-b border-slate-50 border-dotted last:border-0",
        highlight ? "bg-slate-50 -mx-2 px-2 rounded-lg" : "",
      )}
    >
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          "font-black",
          highlight ? "text-lg text-slate-900" : "text-sm",
          textClass || "text-slate-800",
        )}
      >
        {value}
      </span>
    </div>
  );
}
