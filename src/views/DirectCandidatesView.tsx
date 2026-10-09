import React, { useEffect, useState } from "react";
import DirectCandidatesWorkspace from "./DirectCandidatesWorkspace";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function DirectCandidatesView() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("CANDIDATE");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsAdmin(false);
        setUserRole("GUEST");
        setIsLoading(false);
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult(true);
        const claims = tokenResult.claims;
        const role = (claims.role || "CANDIDATE") as string;
        setUserRole(role);

        const adminCheck = claims.admin === true || role === "GLOBAL_ADMIN" || role === "ADMIN" || role === "PLATFORM_AUTHORITY";
        if (adminCheck) {
          setIsAdmin(true);
        } else {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const uRole = data.role || role;
            setUserRole(uRole);
            setIsAdmin(data.isAdmin === true || uRole === "GLOBAL_ADMIN" || uRole === "ADMIN" || uRole === "PLATFORM_AUTHORITY");
          } else {
            setIsAdmin(false);
          }
        }
      } catch (err) {
        console.warn("Error checking admin status for direct candidates:", err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return <DirectCandidatesWorkspace isAdmin={isAdmin} userRole={userRole} />;
}
