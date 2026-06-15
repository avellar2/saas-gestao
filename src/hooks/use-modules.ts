"use client";

import { useState, useEffect, useCallback } from "react";
import { MODULES, isCoreModule, type ModuleConfig } from "@/lib/modules";

interface ActiveModule {
  moduleKey: string;
}

interface UseModulesReturn {
  modules: ModuleConfig[];
  activeModules: string[];
  isModuleActive: (key: string) => boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useModules(companyId?: string): UseModulesReturn {
  // Módulos vêm da config central, não da API
  const [modules] = useState<ModuleConfig[]>(MODULES);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Módulos já estão disponíveis via config, não precisa buscar da API
    setLoading(false);
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

          // Garantir que módulos core sempre estejam ativos
          for (const mod of MODULES) {
            if (mod.type === "core" && !active.includes(mod.key)) {
              active.push(mod.key);
            }
          }

          setActiveModules(active);
        }
      } catch {
        // silent
      }
    }
    loadActiveModules();
  }, [companyId]);

  function isModuleActive(key: string): boolean {
    if (isCoreModule(key)) return true;
    return activeModules.includes(key);
  }

  return { modules, activeModules, isModuleActive, loading, error, refresh: load };
}