import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, DollarSign, Activity, Users, FileCheck, Briefcase, Award, ShieldCheck, Zap } from "lucide-react";

export const ROICommandCenter: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/roi/summary')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSummary(data.summary);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center p-16"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
  if (!summary) return <div className="p-8 text-center text-slate-500">Failed to load ROI executive telemetry data.</div>;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
            <TrendingUp className="text-emerald-600 h-8 w-8" /> Executive ROI Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Continuous Economic Value Chain: Match → Submission → Interview → Offer → Placement → Billing → Payment → ROI.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 font-semibold text-sm">
          <ShieldCheck size={18} /> AI Economic Efficiency: {summary.agentEconomicEfficiency || 1.0}x
        </div>
      </div>

      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">Realized Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
              ₹{(summary.realizedRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">Booked: ₹{(summary.bookedRevenue || 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">Total Operating Cost</CardTitle>
            <Activity className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              ₹{(summary.totalOperatingCost || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">AI & Human Ops Combined</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 shadow-sm bg-gradient-to-br from-indigo-50/40 to-white dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">Gross Margin</CardTitle>
            <TrendingUp className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-400">
              ₹{(summary.attributedGrossMargin || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">Attributed Margin</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm dark:bg-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">AEE Multiplier</CardTitle>
            <Zap className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary.agentEconomicEfficiency || 1.0}x
            </div>
            <p className="text-xs text-slate-500 mt-1">Value / Cost Ratio</p>
          </CardContent>
        </Card>
      </div>

      {/* Continuous Value Chain Pipeline Funnel */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="h-5 text-indigo-600" /> Continuous Value Chain Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Candidates Processed</span>
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1 block">{summary.totalCandidatesProcessed || 0}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Submissions (P4)</span>
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">{summary.totalSubmissions || 0}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Interviews</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">{summary.totalInterviews || 0}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Offers Extended</span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">{summary.totalOffers || 0}</span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center col-span-2 md:col-span-1">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block uppercase">Placements</span>
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">{summary.totalPlacements || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
