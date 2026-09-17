import { useContext } from "react";
import { AuthCtx } from "./AuthContext";

export function useAuth() {
  return useContext(AuthCtx);
}