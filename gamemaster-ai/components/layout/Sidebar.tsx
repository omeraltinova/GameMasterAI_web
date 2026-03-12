"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Swords,
  Map,
  User,
  UserSearch,
  Shield,
  Flag,
  Settings,
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/characters", label: "Karakterler", icon: Users },
  { href: "/campaigns", label: "Oturumlar", icon: Swords },
  { href: "/scenarios", label: "Senaryolar", icon: Map },
  { href: "/players", label: "Oyuncular", icon: UserSearch },
  { href: "/profile", label: "Profil", icon: User },
];

const adminItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/characters", label: "Karakterler", icon: User },
  { href: "/admin/campaigns", label: "Oturumlar", icon: Swords },
  { href: "/admin/scenarios", label: "Senaryolar", icon: Map },
  { href: "/admin/moderation", label: "Moderasyon", icon: Flag },
  { href: "/admin/active-sessions", label: "Aktif Oturumlar", icon: Activity },
  { href: "/admin/stats", label: "İstatistikler", icon: BarChart3 },
  { href: "/admin/settings", label: "Sistem Ayarları", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isPlayPage = /^\/campaigns\/[^/]+\/play(?:\/|$)/.test(pathname || "");
  const [collapsedByContext, setCollapsedByContext] = useState({
    play: true,
    app: false,
  });
  const collapsed = isPlayPage ? collapsedByContext.play : collapsedByContext.app;

  // DÜZELTME: 'any' yerine inline tip tanımı kullandık
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";

  return (
    <aside
      className={cn(
        "sticky top-16 h-[calc(100vh-4rem)] border-r border-border bg-background-secondary",
        "transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center py-2.5 rounded-lg transition-colors",
                  collapsed ? "justify-center px-2" : "gap-3 px-3",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground-secondary hover:text-foreground hover:bg-background-elevated"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className={cn("my-4", collapsed ? "mx-2" : "mx-3")}>
                <div className="border-t-2 border-primary/30" />
              </div>
              {!collapsed && (
                <div className="px-3 mb-2">
                  <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Yönetim
                  </span>
                </div>
              )}
              <div className={cn(
                collapsed ? "mx-0.5 p-1 rounded-lg" : "mx-1 p-1 rounded-xl",
                "bg-gradient-to-b from-primary/5 to-transparent",
                "border border-primary/10"
              )}>
                {adminItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center py-2.5 rounded-lg transition-colors",
                        collapsed ? "justify-center px-2" : "gap-3 px-3",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground-secondary hover:text-foreground hover:bg-background-elevated"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() =>
              setCollapsedByContext((prev) =>
                isPlayPage
                  ? { ...prev, play: !prev.play }
                  : { ...prev, app: !prev.app }
              )
            }
            className={cn(
              "flex items-center w-full py-2 rounded-lg",
              collapsed ? "justify-center px-2" : "gap-3 px-3",
              "text-foreground-secondary hover:text-foreground hover:bg-background-elevated",
              "transition-colors"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Daralt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
