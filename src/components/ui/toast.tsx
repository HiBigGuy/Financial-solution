import { Toaster as SonnerToaster, toast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={18}
      theme="system"
      toastOptions={{
        style: {
          background: "var(--surface)",
          color: "var(--fg)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          fontSize: "13px",
          boxShadow: "var(--shadow-pop)",
        },
      }}
    />
  );
}

export { toast };