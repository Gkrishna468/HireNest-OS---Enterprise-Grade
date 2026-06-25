import React, { useEffect, useState } from 'react';
import { useIdentityStore } from '../stores/IdentityStore';
import { useCandidateStore } from '../stores/CandidateStore';

interface EntityNameProps {
  id: string;
  type: 'client' | 'vendor' | 'recruiter' | 'candidate';
  fallback?: string;
  className?: string;
}

export function EntityName({ id, type, fallback = 'Unknown', className = '' }: EntityNameProps) {
  const { getClient, getVendor, getRecruiter, clients, vendors, recruiters } = useIdentityStore();
  const { getCandidate } = useCandidateStore();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;

    const fetchName = async () => {
      if (type === 'client') {
        const cached = clients.find(c => c.id === id);
        if (cached) {
            setName((cached as any).companyName || cached.name || id);
            return;
        }
        const client = await getClient(id);
        if (isMounted && client) setName((client as any).companyName || client.name || id);
      } else if (type === 'vendor') {
        const cached = vendors.find(v => v.id === id);
        if (cached) {
            setName((cached as any).companyName || (cached as any).name || id);
            return;
        }
        const vendor = await getVendor(id);
        if (isMounted && vendor) setName((vendor as any).companyName || (vendor as any).name || id);
      } else if (type === 'recruiter') {
        const cached = recruiters.find(r => r.id === id);
        if (cached) {
            setName(cached.name || id);
            return;
        }
        const recruiter = await getRecruiter(id);
        if (isMounted && recruiter) setName(recruiter.name || id);
      } else if (type === 'candidate') {
        const candidate = await getCandidate(id);
        if (isMounted && candidate) setName((candidate as any).name || (candidate as any).fullName || id);
      }
    };

    fetchName();

    return () => {
        isMounted = false;
    };
  }, [id, type, getClient, getVendor, getRecruiter, getCandidate, clients, vendors, recruiters, fallback]);

  return <span className={className}>{name || fallback || id}</span>;
}
