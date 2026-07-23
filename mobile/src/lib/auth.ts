import { createContext, useContext } from "react";

export const AuthContext = createContext<{ email: string } | null>(null);

export function useAuth(): { email: string } {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside the signed-in tabs layout");
  return ctx;
}
