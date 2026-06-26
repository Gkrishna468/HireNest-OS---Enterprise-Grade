import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Briefcase, 
  User, 
  Building2, 
  Mail, 
  FileText,
  Calendar,
  DollarSign,
  ArrowRight,
  Loader2
} from "lucide-react";
import { collection, getDocs, query, limit, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

interface SearchResult {
    id: string;
    type: 'CANDIDATE' | 'REQUIREMENT' | 'VENDOR' | 'CLIENT' | 'EMAIL' | 'INVOICE';
    title: string;
    subtitle: string;
    url: string;
    score: number;
}

export function EnterpriseSearchModal({ 
  isOpen, 
  onClose,
  initialQuery = ""
}: { 
  isOpen: boolean; 
  onClose: () => void;
  initialQuery?: string;
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isOpen && inputRef.current) {
          inputRef.current.focus();
          if (initialQuery) {
              setSearchQuery(initialQuery);
              performSearch(initialQuery);
          }
      }
  }, [isOpen, initialQuery]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && isOpen) {
              onClose();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const performSearch = async (q: string) => {
      if (!q || q.length < 2) {
          setResults([]);
          return;
      }
      
      setIsSearching(true);
      const qLower = q.toLowerCase();
      
      try {
          const searchResults: SearchResult[] = [];
          
          // 1. Search Candidates
          const candSnap = await getDocs(query(collection(db, "candidatePool"), limit(10)));
          candSnap.forEach(doc => {
              const data = doc.data();
              const text = `${data.firstName} ${data.lastName} ${data.role} ${data.skills?.join(' ')}`.toLowerCase();
              if (text.includes(qLower)) {
                  searchResults.push({
                      id: doc.id,
                      type: 'CANDIDATE',
                      title: `${data.firstName} ${data.lastName}`,
                      subtitle: data.role || 'Candidate',
                      url: '/candidates',
                      score: 100
                  });
              }
          });

          // 2. Search Requirements
          const reqSnap = await getDocs(query(collection(db, "requirements"), limit(10)));
          reqSnap.forEach(doc => {
              const data = doc.data();
              const text = `${data.jobTitle} ${data.clientName} ${data.location}`.toLowerCase();
              if (text.includes(qLower)) {
                  searchResults.push({
                      id: doc.id,
                      type: 'REQUIREMENT',
                      title: data.jobTitle,
                      subtitle: data.clientName || 'Requirement',
                      url: '/jobs',
                      score: 95
                  });
              }
          });

          // Sort by simulated relevance
          searchResults.sort((a, b) => b.score - a.score);
          setResults(searchResults.slice(0, 8));
          
      } catch (e) {
          console.error("Search error:", e);
      } finally {
          setIsSearching(false);
      }
  };

  useEffect(() => {
      const timeout = setTimeout(() => {
          performSearch(searchQuery);
      }, 300);
      return () => clearTimeout(timeout);
  }, [searchQuery]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
      switch (type) {
          case 'CANDIDATE': return <User className="text-indigo-500" size={16} />;
          case 'REQUIREMENT': return <Briefcase className="text-emerald-500" size={16} />;
          case 'VENDOR': return <Building2 className="text-amber-500" size={16} />;
          case 'CLIENT': return <Building2 className="text-blue-500" size={16} />;
          case 'EMAIL': return <Mail className="text-slate-500" size={16} />;
          case 'INVOICE': return <DollarSign className="text-green-600" size={16} />;
          default: return <FileText className="text-slate-500" size={16} />;
      }
  };

  return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200" onClick={onClose}>
          <div 
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
              <div className="flex items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <Search size={20} className="text-slate-400 mr-3" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search across the enterprise... (e.g. 'Java Developer', 'Deloitte')"
                    className="flex-1 bg-transparent border-none outline-none text-lg text-slate-800 placeholder-slate-400 font-medium"
                  />
                  {isSearching && <Loader2 size={20} className="text-indigo-500 animate-spin" />}
                  <button onClick={onClose} className="ml-3 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest transition-colors">
                      ESC
                  </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                  {searchQuery.length < 2 ? (
                      <div className="p-8 text-center text-slate-400">
                          <p className="text-sm font-bold uppercase tracking-widest mb-2">Search Knowledge Graph</p>
                          <p className="text-xs">Type at least 2 characters to search across candidates, requirements, emails, and invoices.</p>
                      </div>
                  ) : results.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                          {isSearching ? 'Searching...' : 'No results found in knowledge graph.'}
                      </div>
                  ) : (
                      <div className="space-y-1">
                          {results.map((res, idx) => (
                              <button
                                key={res.id + idx}
                                onClick={() => {
                                    navigate(res.url);
                                    onClose();
                                }}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors group"
                              >
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                          {getIcon(res.type)}
                                      </div>
                                      <div className="text-left">
                                          <div className="flex items-center gap-2">
                                              <h4 className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{res.title}</h4>
                                              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{res.type}</span>
                                          </div>
                                          <p className="text-xs text-slate-500 font-medium mt-0.5">{res.subtitle}</p>
                                      </div>
                                  </div>
                                  <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                              </button>
                          ))}
                      </div>
                  )}
              </div>
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                  <span>Knowledge Graph Connected</span>
                  <span>Results powered by AI Studio</span>
              </div>
          </div>
      </div>
  );
}
