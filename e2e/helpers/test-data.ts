export const E2E_PREFIX = "E2E ";

export const E2E_TIMESTAMP = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

export const e2eName = (kind: string): string => {
  return `${E2E_PREFIX}${kind} ${E2E_TIMESTAMP()}`;
};

export const e2eEmail = (tag = "user"): string => {
  return `e2e.${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@test.local`;
};

export const e2ePhone = (): string => {
  const n = Math.floor(10000000 + Math.random() * 89999999);
  const s = String(n);
  return `(11) 9${s.slice(0, 4)}-${s.slice(4, 8)}`;
};

export const e2eDocument = (): string => {
  const a = Math.floor(100000000 + Math.random() * 899999999);
  const b = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const c = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  const d = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${a}.${b}.${c}-${d}`;
};

export const e2eAmount = (min = 50, max = 500): number => {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
};
