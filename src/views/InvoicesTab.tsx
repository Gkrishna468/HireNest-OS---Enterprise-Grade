import React, { useState, useEffect } from 'react';
import { Receipt, Search, Download, CreditCard, ExternalLink, Filter } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';

export default function InvoicesTab() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
         const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
         const snap = await getDocs(q);
         const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
         setInvoices(fetched);
      } catch (err) {
         console.error("No invoices collection yet or permission denied", err);
         setInvoices([]);
      } finally {
         setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Receipt className="text-indigo-600" /> Invoices & Collections
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Full revenue recognition lifecycle, aging reports, and settlements.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by invoice ID..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
            Generate Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uncollected Revenue (AR)</p>
           <p className="text-2xl font-black text-slate-800 mt-1">
             {formatCurrency(invoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE').reduce((acc, i) => acc + (i.amount || 0), 0))}
           </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue Net45</p>
           <p className="text-2xl font-black text-rose-600 mt-1">
             {formatCurrency(invoices.filter(i => i.status === 'OVERDUE').reduce((acc, i) => acc + (i.amount || 0), 0))}
           </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Vendor Settlements</p>
           <p className="text-2xl font-black text-amber-600 mt-1">
             {formatCurrency(invoices.filter(i => i.type === 'PAYABLE' && i.status === 'PENDING').reduce((acc, i) => acc + (i.amount || 0), 0))}
           </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collected YTD</p>
           <p className="text-2xl font-black text-emerald-600 mt-1">
             {formatCurrency(invoices.filter(i => i.status === 'PAID').reduce((acc, i) => acc + (i.amount || 0), 0))}
           </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex gap-6">
             <button className="text-sm font-black text-indigo-600 uppercase tracking-widest border-b-2 border-indigo-600 pb-1">Client Invoices (AR)</button>
             <button className="text-sm font-black text-slate-400 uppercase tracking-widest border-b-2 border-transparent pb-1 hover:text-slate-600">Vendor Settlements (AP)</button>
          </div>
          <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-widest">
             <Filter size={14} /> Filter
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
               <p className="text-xs font-bold uppercase tracking-widest">Loading ledgers...</p>
             </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <Receipt size={48} className="text-slate-200" />
              <p className="text-sm font-medium">No invoice data found in the real database.</p>
              <button className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
                Create Manual Invoice
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Issued Date</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-xs font-bold text-indigo-600">{inv.invoiceId}</td>
                    <td className="p-3 font-bold text-sm text-slate-700">{inv.clientName}</td>
                    <td className="p-3 text-xs text-slate-500">{inv.issueDate}</td>
                    <td className="p-3 text-xs text-slate-500 font-bold">{inv.dueDate}</td>
                    <td className="p-3 text-right font-mono text-sm font-bold text-slate-800">{formatCurrency(inv.amount)}</td>
                    <td className="p-3 text-right">
                       <span className={`px-2 py-1 font-bold text-[10px] uppercase tracking-widest rounded ${
                          inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                          inv.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                       }`}>
                         {inv.status}
                       </span>
                    </td>
                    <td className="p-3 text-center flex justify-center gap-2">
                       <button className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded shadow-sm">
                          <ExternalLink size={14} />
                       </button>
                       {inv.status !== 'PAID' && (
                          <button className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded shadow-sm">
                             <CreditCard size={14} />
                          </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
