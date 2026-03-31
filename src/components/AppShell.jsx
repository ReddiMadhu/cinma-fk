import { Link, useLocation, useNavigate } from "react-router-dom";
import { WizardProgress } from "./WizardProgress";
import { usePipelineStore } from "@/store/pipeline";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, History, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppShell({ children, showWizard = false, running = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { uploadId, resetSession } = usePipelineStore();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 border-b border-border glass">
        <div className="mx-auto max-w-screen-xl px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-sm tracking-tight">
              <span className="gradient-text">CAT</span>
              <span className="text-foreground"> Pipeline</span>
            </span>
          </Link>

          {/* Wizard steps (center) */}
          {showWizard && (
            <div className="flex-1 flex justify-center">
              <WizardProgress running={running} />
            </div>
          )}

          {/* Nav actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={cn(isActive("/") && "bg-accent/20")}
              onClick={() => navigate("/")}
            >
              <LayoutDashboard className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:block">Dashboard</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(isActive("/sessions") && "bg-accent/20")}
              onClick={() => navigate("/sessions")}
            >
              <History className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:block">Sessions</span>
            </Button>
            <Button
              size="sm"
              className="btn-glow"
              onClick={() => {
                resetSession();
                navigate("/upload");
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Session
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
