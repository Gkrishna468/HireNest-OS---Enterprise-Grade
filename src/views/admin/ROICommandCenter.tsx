import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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
      .catch(console.error);
  }, []);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
  if (!summary) return <div>Failed to load ROI data</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">ROI Command Center</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader><CardTitle>Realized Revenue</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">₹{summary.realizedRevenue.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Operating Cost</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">₹{summary.totalOperatingCost.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Gross Margin</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">₹{summary.attributedGrossMargin.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>AEE</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary.agentEconomicEfficiency}x</CardContent>
        </Card>
      </div>
    </div>
  );
};
