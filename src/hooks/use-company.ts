"use client";

import { useState, useEffect, useCallback } from "react";

export interface CompanyInfo {
  id: string;
  name: string;
  tradeName: string | null;
  document: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: string;
  trialEndsAt: string | null;
  planName: string | null;
  monthlyPrice: number | null;
}

interface UseCompanyReturn {
  company: CompanyInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCompany(companyId?: string): UseCompanyReturn {
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/empresas/${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setCompany({
          id: data.id,
          name: data.name,
          tradeName: data.tradeName,
          document: data.document,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          status: data.status,
          trialEndsAt: data.trialEndsAt,
          planName: data.planName,
          monthlyPrice: data.monthlyPrice ? Number(data.monthlyPrice) : null,
        });
      } else {
        setError("Erro ao carregar dados da empresa");
      }
    } catch {
      setError("Erro ao carregar dados da empresa");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  return { company, loading, error, refresh: load };
}