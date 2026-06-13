"use client";

import { useState, useEffect, useCallback } from "react";

export interface ModuleInfo {
  key: string;
  name: string;
  description: string | null;
  basePrice: string;
  active: boolean;
  sortOrder: number;
}

interface ActiveModule {
  moduleKey: string;
}

interface UseModulesReturn {
  modules: ModuleInfo[];
  activeModules: string[];
  isModuleActive: (key: string) => boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useModules(companyId?: string): UseModulesReturn {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/modulos");
      if (res.ok) {
        const data = await res.json();
        setModules(data);
      }
    } catch {
      setError("Erro ao carregar modulos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!companyId) return;
    async function loadActiveModules() {
      try {
        const res = await fetch(`/api/empresas/${companyId}`);
        if (res.ok) {
          const data = await res.json();
          const active = (data.companyModules || [])
            .filter((cm: ActiveModule) => cm.moduleKey)
            .map((cm: ActiveModule) => cm.moduleKey);
          setActiveModules(active);
        }
      } catch {
        // silent
      }
    }
    loadActiveModules();
  }, [companyId]);

  function isModuleActive(key: string): boolean {
    return activeModules.includes(key);
  }

  return { modules, activeModules, isModuleActive, loading, error, refresh: load };
}