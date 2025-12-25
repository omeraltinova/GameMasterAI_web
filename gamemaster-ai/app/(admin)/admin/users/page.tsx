"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Input, Avatar } from "@/components/ui";
import { mockUsers } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { Users, Search, Filter, MoreVertical, Shield, Trash2, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";

const roleColors = {
  ADMIN: "danger",
  MEMBER: "primary",
  VISITOR: "default",
} as const;

const roleLabels = {
  ADMIN: "Admin",
  MEMBER: "Üye",
  VISITOR: "Ziyaretçi",
};

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const filteredUsers = mockUsers.filter(
    (user) =>
      (user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!roleFilter || user.role === roleFilter)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Kullanıcı Yönetimi</h1>
          <p className="text-foreground-secondary">
            {mockUsers.length} kayıtlı kullanıcı
          </p>
        </div>
        <Button className="gap-2">
          <Users className="h-4 w-4" />
          Kullanıcı Ekle
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-input border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={!roleFilter ? "primary" : "outline"}
            size="sm"
            onClick={() => setRoleFilter("")}
          >
            Tümü
          </Button>
          {["ADMIN", "MEMBER", "VISITOR"].map((role) => (
            <Button
              key={role}
              variant={roleFilter === role ? "primary" : "outline"}
              size="sm"
              onClick={() => setRoleFilter(role)}
            >
              {roleLabels[role as keyof typeof roleLabels]}
            </Button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background-secondary">
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Kullanıcı
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    E-posta
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Rol
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Kayıt Tarihi
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-foreground-secondary">
                    Son Güncelleme
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-foreground-secondary">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-background-elevated transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.avatar}
                          fallback={user.username}
                          size="sm"
                        />
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-foreground-secondary">
                      {user.email}
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-foreground-secondary">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-4 px-6 text-foreground-secondary">
                      {formatDate(user.updatedAt)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Shield className="h-4 w-4 mr-2" />
                              Rol Değiştir
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-danger">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-foreground-muted mx-auto mb-4" />
              <p className="text-foreground-secondary">Kullanıcı bulunamadı</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


