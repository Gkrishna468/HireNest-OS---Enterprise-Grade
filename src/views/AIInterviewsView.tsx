import React, { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AIInterviewsDashboardTab from "./AIInterviewsDashboardTab";
import { BrainCircuit } from "lucide-react";

export default function AIInterviewsView() {
  const [userRole, setUserRole] = useState<string>("recruiter");
  const [orgId, setOrgId] = useState<string>("GLOBAL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role || "recruiter");
            setOrgId(data.organizationId || "GLOBAL");
          }
        } catch (e) {
          console.error("[AIInterviewsView] Failed to load user profile:", e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4">
        <BrainCircuit className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
        <p className="text-slate-500 text-sm font-semibold">Configuring secure AI control gateway...</p>
      </div>
    );
  }

  return (
    <AIInterviewsDashboardTab userRole={userRole} orgId={orgId} />
  );
}
