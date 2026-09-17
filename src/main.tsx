import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@/styles/global.css";
import { App } from "@/App";
import { ThemeProvider } from "@/components/layout/theme";
import { AuthProvider } from "@/features/auth/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";

const base = import.meta.env.BASE_URL;

// Restaura rota salva pelo 404.html (fallback SPA do GitHub Pages)
const redirect = sessionStorage.getItem("redirect");
if (redirect) {
  sessionStorage.removeItem("redirect");
  history.replaceState(null, "", redirect);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter basename={base}>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <App />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);