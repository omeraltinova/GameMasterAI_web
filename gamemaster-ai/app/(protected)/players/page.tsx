"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Input,
  Badge,
  Avatar,
  Spinner,
  Button,
} from "@/components/ui";
import {
  Search,
  Users,
  User,
  Swords,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserCard {
  id: string;
  username: string;
  avatar: string | null;
  role: string;
  createdAt: string;
  characterCount: number;
  campaignCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function PlayersPage() {
  const [users, setUsers] = useState<UserCard[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", currentPage.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Oyuncular
        </h1>
        <p className="text-foreground-secondary mt-1">
          Diğer oyuncuları keşfet ve profillerini incele
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kullanıcı adı ile ara..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background-elevated border border-border focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all text-foreground placeholder:text-foreground-muted"
        />
      </div>

      {/* Results info */}
      {pagination && !loading && (
        <p className="text-sm text-foreground-muted">
          {pagination.total} oyuncu bulundu
          {debouncedSearch && ` "${debouncedSearch}" araması için`}
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Users className="h-12 w-12 text-foreground-muted" />
          <p className="text-foreground-muted">
            {debouncedSearch ? "Arama sonucu bulunamadı" : "Henüz kullanıcı yok"}
          </p>
        </div>
      ) : (
        <>
          {/* User Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {users.map((user) => (
              <Link key={user.id} href={`/players/${user.id}`}>
                <Card className="h-full hover:border-primary/50 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={user.avatar}
                        fallback={user.username}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {user.username}
                          </h3>
                          {user.role === "ADMIN" && (
                            <Shield className="h-3.5 w-3.5 text-danger shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-foreground-muted flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {user.characterCount}
                          </span>
                          <span className="text-xs text-foreground-muted flex items-center gap-1">
                            <Swords className="h-3 w-3" />
                            {user.campaignCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 3) {
                    pageNum = pagination.totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded text-sm font-medium transition-colors",
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-background-elevated text-foreground-secondary"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasMore}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
