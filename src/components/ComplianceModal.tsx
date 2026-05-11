import React, { useState } from "react";
import { db, storage } from "../lib/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "../lib/Button";

export function ComplianceModal({ 
  isOpen, 
  onClose, 
  orgId, 
  userId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  orgId: string; 
  userId: string;
}) {
  const [ndaFile, setNdaFile] = useState<File | null>(null);
  const [msaFile, setMsaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmitCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      if (!ndaFile || !msaFile) {
        setError("Please upload both required documents.");
        setLoading(false);
        return;
      }
      
      // Upload NDA
      const ndaRef = ref(storage, `compliance/${orgId}/NDA.pdf`);
      await uploadBytes(ndaRef, ndaFile);
      const ndaUrl = await getDownloadURL(ndaRef);

      // Upload MSA
      const msaRef = ref(storage, `compliance/${orgId}/MSA.pdf`);
      await uploadBytes(msaRef, msaFile);
      const msaUrl = await getDownloadURL(msaRef);

      // Update Org
      await updateDoc(doc(db, "organizations", orgId), {
        ndaUploaded: true,
        msaUploaded: true,
        status: "pending_review",
        documentsUploadedAt: new Date().toISOString()
      });

      // Create Compliance Docs
      await setDoc(doc(db, "compliance_documents", orgId + "_NDA"), {
        organizationId: orgId,
        documentType: "NDA",
        fileUrl: ndaUrl,
        uploadedAt: new Date().toISOString(),
        status: "pending",
        ownerId: userId,
      });

      await setDoc(doc(db, "compliance_documents", orgId + "_MSA"), {
        organizationId: orgId,
        documentType: "MSA",
        fileUrl: msaUrl,
        uploadedAt: new Date().toISOString(),
        status: "pending",
        ownerId: userId,
      });

      onClose();
      // Optionally reload the page to refresh auth state or pass a state up
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Compliance Verification</h2>
            <p className="text-xs text-slate-500">Upload NDA & MSA</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmitCompliance} className="p-6 space-y-6">
          <div className="bg-amber-50 text-amber-800 border border-amber-200 p-4 rounded-lg text-sm">
            Please upload your signed Non-Disclosure Agreement (NDA) and Master Service Agreement (MSA) to complete your platform verification.
          </div>

          <div className="bg-slate-50 p-6 border border-slate-200 rounded-lg space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Signed NDA (PDF/Doc)</label>
              <input 
                type="file" 
                required
                accept=".pdf,.doc,.docx"
                onChange={(e) => setNdaFile(e.target.files?.[0] || null)}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            
            <div className="pt-2">
              <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Signed MSA (PDF/Doc)</label>
              <input 
                type="file" 
                required
                accept=".pdf,.doc,.docx"
                onChange={(e) => setMsaFile(e.target.files?.[0] || null)}
                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 p-3 rounded">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? "Uploading..." : "Submit Documents"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
