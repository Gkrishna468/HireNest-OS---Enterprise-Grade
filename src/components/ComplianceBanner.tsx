import React, { useState } from "react";
import { ComplianceModal } from "./ComplianceModal";
import { Button } from "../lib/Button";

export function ComplianceBanner({ orgData, userId }: { orgData: any, userId: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (orgData.type === 'admin') return null;
  if (orgData.ndaUploaded && orgData.msaUploaded) return null;

  const createdTime = new Date(orgData.createdAt).getTime();
  const now = Date.now();
  const daysSince = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24));
  
  let urgency = "bg-amber-50 text-amber-800 border-amber-200";
  let message = `Welcome to HireNest OS! Please upload your signed NDA and MSA to complete compliance. You have ${15 - daysSince} days remaining before restrictions apply.`;

  if (daysSince > 5 && daysSince <= 10) {
    urgency = "bg-orange-50 text-orange-800 border-orange-200";
    message = `Reminder: Your compliance documents are due. You have ${15 - daysSince} days remaining. How is the OS working for you? We welcome any suggestions!`;
  } else if (daysSince > 10 && daysSince <= 15) {
    urgency = "bg-red-50 text-red-800 border-red-200";
    message = `URGENT: Your compliance documents are overdue in ${15 - daysSince} days. Please upload them to prevent account restrictions.`;
  } else if (daysSince > 15) {
     urgency = "bg-red-100 text-red-900 border-red-300 font-bold";
     message = "Account Action Required: Compliance period expired. Please upload documents immediately.";
  }

  return (
    <>
      <div className={`p-3 border-b text-sm flex items-center justify-between ${urgency}`}>
        <div>
          <strong>Compliance Notice:</strong> {message}
        </div>
        <Button variant="outline" size="sm" className="bg-white text-xs border-current" onClick={() => setIsModalOpen(true)}>Upload Documents</Button>
      </div>

      <ComplianceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        orgId={orgData.organizationId} 
        userId={userId} 
      />
    </>
  );
}
