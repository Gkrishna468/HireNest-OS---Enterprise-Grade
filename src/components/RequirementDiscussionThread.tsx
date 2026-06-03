import React, { useState, useEffect } from 'react';
import { MessageSquare, Check, AlertCircle } from 'lucide-react';
import { Button } from '../lib/Button';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { publishEvent } from '../lib/eventEngine';

export function RequirementDiscussionThread({ requirementId, requirementTitle }: { requirementId: string, requirementTitle: string }) {
   const [comments, setComments] = useState<any[]>([]);
   const [newComment, setNewComment] = useState("");
   const [userRole, setUserRole] = useState("User");

   useEffect(() => {
      const fetchRole = async () => {
         if (auth.currentUser) {
            const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (snap.exists()) {
               setUserRole(snap.data().role || 'User');
            }
         }
      };
      fetchRole();
   }, []);

   useEffect(() => {
      const q = query(
         collection(db, "requirements_public", requirementId, "comments"),
         orderBy("timestamp", "asc")
      );
      const unsub = onSnapshot(q, snap => {
         setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
   }, [requirementId]);

   const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;

      try {
         await addDoc(collection(db, "requirements_public", requirementId, "comments"), {
            text: newComment,
            author: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "User",
            role: userRole,
            timestamp: serverTimestamp()
         });

         const mentions = newComment.match(/@\w+/g);
         if (mentions) {
             mentions.forEach(m => publishEvent({
                 type: 'info',
                 title: 'You were mentioned',
                 message: `You were mentioned in Requirement ${requirementTitle}`,
                 recipients: [m.substring(1).toUpperCase()]
             }));
         }
         
         setNewComment("");
      } catch (err) {
         console.error(err);
      }
   };

   return (
      <div className="bg-slate-900 p-6 rounded-3xl mt-8 shadow-2xl relative overflow-hidden group">
         <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
             <MessageSquare size={14} className="text-indigo-400"/> Context & Discussion
         </h4>
         
         <div className="space-y-4 max-h-80 overflow-y-auto mb-4 custom-scrollbar pr-2">
            {comments.length > 0 ? comments.map((c, i) => (
               <div key={i} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="font-bold text-xs text-slate-200">{c.author}</span>
                     <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">{c.role}</span>
                     <span className="text-[9px] text-slate-500 font-mono ml-auto">
                        {c.timestamp?.toDate ? c.timestamp.toDate().toLocaleString() : 'recently'}
                     </span>
                  </div>
                  <div className="text-sm text-slate-300 font-medium">
                     {c.text.split(/(@\w+)/g).map((part: string, i: number) => 
                        part.startsWith('@') ? <span key={i} className="text-indigo-400 font-bold bg-indigo-900/50 px-1 rounded mx-0.5">{part}</span> : part
                     )}
                  </div>
               </div>
            )) : (
               <div className="flex flex-col items-center justify-center py-10 bg-slate-800/50 rounded-xl border border-slate-800 border-dashed">
                  <AlertCircle size={24} className="text-slate-600 mb-2"/>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">No context available.</p>
                  <p className="text-xs text-slate-600 mt-1">Start requirement collaboration.</p>
               </div>
            )}
         </div>

         <form onSubmit={handleSend} className="flex gap-2">
            <input 
               type="text" 
               value={newComment}
               onChange={e => setNewComment(e.target.value)}
               placeholder="Add context or use @mention..." 
               className="flex-1 bg-slate-800 border-none rounded-xl text-sm px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 font-bold flex gap-2">
               Send
            </Button>
         </form>
      </div>
   );
}
