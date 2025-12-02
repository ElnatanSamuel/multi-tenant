"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  MoreHorizontal,
} from "lucide-react";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import LogoutButton from "@/components/logout-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sectionTypes = [
  { value: "TABLE_OF_CONTENTS", label: "Table of Contents" },
  { value: "EXECUTIVE_SUMMARY", label: "Executive Summary" },
  { value: "TECHNICAL_APPROACH", label: "Technical Approach" },
  { value: "DESIGN", label: "Design" },
  { value: "CAPABILITIES", label: "Capabilities" },
  { value: "FOCUS_DOCUMENT", label: "Focus Document" },
  { value: "NARRATIVE", label: "Narrative" },
] as const;

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In-Progress" },
  { value: "COMPLETED", label: "Completed" },
] as const;

const reviewerOptions = [
  { value: "ASSIM", label: "Assim" },
  { value: "BINI", label: "Bini" },
  { value: "MAMI", label: "Mami" },
] as const;

type SectionType = (typeof sectionTypes)[number]["value"];
type Status = (typeof statusOptions)[number]["value"];
type Reviewer = (typeof reviewerOptions)[number]["value"];

type OutlineRow = {
  id: number;
  header: string;
  sectionType: SectionType;
  status: Status;
  target: number;
  limit: number;
  reviewer: Reviewer;
};

type OutlineFormState = Omit<OutlineRow, "id">;

const defaultForm: OutlineFormState = {
  header: "",
  sectionType: "TABLE_OF_CONTENTS",
  status: "PENDING",
  target: 0,
  limit: 0,
  reviewer: "ASSIM",
};

function getLabel<T extends { value: string; label: string }>(
  list: readonly T[],
  value: string
) {
  return list.find((item) => item.value === value)?.label ?? value;
}

type DashboardShellProps = {
  userName: string | null;
  userEmail: string | null;
  orgId: string;
  organizationName: string;
  organizations: { id: string; name: string }[];
};

type OutlineApiRow = {
  id: number;
  header: string;
  section_type: SectionType;
  status: Status;
  target: number;
  limit: number;
  reviewer: Reviewer;
};

export default function DashboardShell({
  userName,
  userEmail,
  orgId,
  organizationName,
  organizations,
}: DashboardShellProps) {
  const router = useRouter();
  const [activeOrgId, setActiveOrgId] = useState(orgId);
  const [rows, setRows] = useState<OutlineRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<OutlineFormState>(defaultForm);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [visibleColumns, setVisibleColumns] = useState({
    sectionType: true,
    status: true,
    target: true,
    limit: true,
    reviewer: true,
  });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const displayName = userName || userEmail || "User";

  const initials = useMemo(() => {
    const source = userName || userEmail || "";
    if (!source) return "U";
    const parts = source
      .split(/[ .@]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return "U";
    const first = parts[0]?.[0] ?? "U";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  }, [userName, userEmail]);

  const isEditing = editingId !== null;

  const sheetTitle = useMemo(
    () => (isEditing ? "Edit section" : "Add section"),
    [isEditing]
  );

  function openForCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setSheetOpen(true);
  }

  function openForEdit(row: OutlineRow) {
    setEditingId(row.id);
    setForm({
      header: row.header,
      sectionType: row.sectionType,
      status: row.status,
      target: row.target,
      limit: row.limit,
      reviewer: row.reviewer,
    });
    setSheetOpen(true);
  }

  function handleChange<K extends keyof OutlineFormState>(
    key: K,
    value: string
  ) {
    setForm((prev) => {
      if (key === "target" || key === "limit") {
        const numeric = Number(value.replace(/[^0-9]/g, ""));
        return {
          ...prev,
          [key]: Number.isNaN(numeric) ? 0 : numeric,
        } as OutlineFormState;
      }

      return { ...prev, [key]: value } as OutlineFormState;
    });
  }

  async function handleSave() {
    if (!form.header.trim()) {
      return;
    }

    if (isEditing && editingId !== null) {
      const response = await fetch(
        `/api/organizations/${activeOrgId}/outlines/${editingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { outline: OutlineApiRow };

      setRows((prev) =>
        prev.map((row) =>
          row.id === editingId
            ? {
                id: data.outline.id,
                header: data.outline.header,
                sectionType: data.outline.section_type,
                status: data.outline.status,
                target: data.outline.target,
                limit: data.outline.limit,
                reviewer: data.outline.reviewer,
              }
            : row
        )
      );
    } else {
      const response = await fetch(
        `/api/organizations/${activeOrgId}/outlines`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { outline: OutlineApiRow };

      setRows((prev) => [
        ...prev,
        {
          id: data.outline.id,
          header: data.outline.header,
          sectionType: data.outline.section_type,
          status: data.outline.status,
          target: data.outline.target,
          limit: data.outline.limit,
          reviewer: data.outline.reviewer,
        },
      ]);
    }

    setSheetOpen(false);
  }

  async function handleDelete(id: number) {
    const response = await fetch(
      `/api/organizations/${activeOrgId}/outlines/${id}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      return;
    }

    setRows((prev) => prev.filter((row) => row.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  }

  useEffect(() => {
    async function loadOutlines() {
      // Reset table state when switching organizations so we never show
      // stale rows from the previous org while loading or on error.
      setRows([]);
      setSelectedIds([]);

      const response = await fetch(
        `/api/organizations/${activeOrgId}/outlines`
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { outlines: OutlineApiRow[] };

      setRows(
        data.outlines.map((outline) => ({
          id: outline.id,
          header: outline.header,
          sectionType: outline.section_type,
          status: outline.status,
          target: outline.target,
          limit: outline.limit,
          reviewer: outline.reviewer,
        }))
      );
    }

    loadOutlines();
  }, [activeOrgId]);

  const totalRows = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  useEffect(() => {
    setPage((prev) => {
      if (prev < 1) return 1;
      if (prev > pageCount) return pageCount;
      return prev;
    });
  }, [pageCount]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return rows.slice(start, end);
  }, [rows, page, pageSize]);

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const selectedCount = selectedIds.length;
  const visibleColumnCount =
    4 +
    (visibleColumns.sectionType ? 1 : 0) +
    (visibleColumns.status ? 1 : 0) +
    (visibleColumns.target ? 1 : 0) +
    (visibleColumns.limit ? 1 : 0) +
    (visibleColumns.reviewer ? 1 : 0);

  useEffect(() => {
    setActiveOrgId(orgId);
  }, [orgId]);

  const activeOrgName = useMemo(() => {
    const found = organizations.find((org) => org.id === activeOrgId);
    return found?.name ?? organizationName;
  }, [organizations, activeOrgId, organizationName]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-64 flex-col border-r bg-sidebar">
        <div className="px-3 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                  AI
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold leading-tight">
                    {activeOrgName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Workspace
                  </span>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Teams
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={async () => {
                    if (!org.id || org.id === activeOrgId) return;
                    setActiveOrgId(org.id);
                    try {
                      await authClient.organization.setActive({
                        organizationId: org.id,
                      });
                    } catch {
                      // ignore client errors; URL param will still drive selection
                    }
                    router.push(`/?orgId=${org.id}`);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                    {org.name?.charAt(0)?.toUpperCase() ?? "O"}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="truncate text-sm">{org.name}</span>
                  </div>
                  {org.id === activeOrgId && (
                    <span className="text-[10px] text-muted-foreground">
                      Active
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/create-organization"
                  className="flex items-center gap-2"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border text-xs">
                    +
                  </div>
                  <span className="text-sm">Add organization</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/join-organization"
                  className="flex items-center gap-2"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border text-xs">
                    ↳
                  </div>
                  <span className="text-sm">Join organization</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator />
        <div className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Platform
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          <Link
            href={`/?orgId=${activeOrgId}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <span className="text-xs">▢</span>
            <span>Table</span>
          </Link>
          <Link
            href={`/team?orgId=${activeOrgId}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="text-xs">☰</span>
            <span>Team Info / Setup</span>
          </Link>
        </nav>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <Tabs defaultValue="outline" className="w-auto">
            <TabsList className="bg-muted">
              <TabsTrigger value="outline">Outline</TabsTrigger>
              <TabsTrigger value="past-performance">
                Past Performance
              </TabsTrigger>
              <TabsTrigger value="key-personnel">Key Personnel</TabsTrigger>
              <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="text-xs">▢</span>
                  <span>Customize Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.sectionType}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      sectionType: Boolean(checked),
                    }))
                  }
                >
                  Type
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.status}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      status: Boolean(checked),
                    }))
                  }
                >
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.target}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      target: Boolean(checked),
                    }))
                  }
                >
                  Target
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.limit}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      limit: Boolean(checked),
                    }))
                  }
                >
                  Limit
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.reviewer}
                  onCheckedChange={(checked) =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      reviewer: Boolean(checked),
                    }))
                  }
                >
                  Reviewer
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="text-xs" onClick={openForCreate}>
              Add Section
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <LogoutButton />
          </div>
        </header>

        <section className="flex-1 p-6">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Outline ·{" "}
              <span className="font-medium text-foreground">
                Capture Plan Alpha
              </span>
            </span>
            <span>{rows.length} sections</span>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all rows"
                      checked={allSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(rows.map((row) => row.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-6" />
                  <TableHead>Header</TableHead>
                  {visibleColumns.sectionType && (
                    <TableHead>Section type</TableHead>
                  )}
                  {visibleColumns.status && <TableHead>Status</TableHead>}
                  {visibleColumns.target && (
                    <TableHead className="text-right">Target</TableHead>
                  )}
                  {visibleColumns.limit && (
                    <TableHead className="text-right">Limit</TableHead>
                  )}
                  {visibleColumns.reviewer && <TableHead>Reviewer</TableHead>}
                  <TableHead className="w-12 text-right" aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((row) => {
                  const isSelected = selectedIds.includes(row.id);

                  return (
                    <TableRow
                      key={row.id}
                      data-state={isSelected ? "selected" : undefined}
                    >
                      <TableCell className="w-10">
                        <Checkbox
                          aria-label={`Select ${row.header}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedIds((prev) => {
                              if (checked) {
                                return [...new Set([...prev, row.id])];
                              }
                              return prev.filter((id) => id !== row.id);
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="w-6 text-muted-foreground">
                        <GripVertical className="h-3.5 w-3.5" />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openForEdit(row)}
                          className="line-clamp-1 text-left text-sm font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {row.header}
                        </button>
                      </TableCell>
                      {visibleColumns.sectionType && (
                        <TableCell className="text-xs text-muted-foreground">
                          {getLabel(sectionTypes, row.sectionType)}
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge
                            variant={
                              row.status === "COMPLETED"
                                ? "secondary"
                                : row.status === "IN_PROGRESS"
                                  ? "outline"
                                  : "outline"
                            }
                          >
                            {getLabel(statusOptions, row.status)}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.target && (
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {row.target}
                        </TableCell>
                      )}
                      {visibleColumns.limit && (
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {row.limit}
                        </TableCell>
                      )}
                      {visibleColumns.reviewer && (
                        <TableCell className="text-xs text-muted-foreground">
                          {getLabel(reviewerOptions, row.reviewer)}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open row menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={() => openForEdit(row)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(row.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnCount}
                      className="h-32 text-center text-sm text-muted-foreground"
                    >
                      No sections yet. Use “Add Section” to start your outline.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
              <span>
                {selectedCount} of {rows.length} row(s) selected.
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span>Rows per page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-16 px-2 py-0 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span>
                    Page{" "}
                    <span className="font-medium text-foreground">{page}</span>{" "}
                    of {pageCount}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      disabled={page === 1 || rows.length === 0}
                      onClick={() => setPage(1)}
                    >
                      <ChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      disabled={page === 1 || rows.length === 0}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      disabled={page === pageCount || rows.length === 0}
                      onClick={() =>
                        setPage((prev) => Math.min(pageCount, prev + 1))
                      }
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      disabled={page === pageCount || rows.length === 0}
                      onClick={() => setPage(pageCount)}
                    >
                      <ChevronsRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-md"
        >
          <SheetHeader className="pb-2">
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>
              Configure the details for this outline section.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2 text-sm">
            <div className="space-y-2">
              <Label htmlFor="header">Header</Label>
              <Input
                id="header"
                value={form.header}
                onChange={(event) => handleChange("header", event.target.value)}
                placeholder="e.g. Executive Summary"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sectionType">Section type</Label>
                <Select
                  value={form.sectionType}
                  onValueChange={(value) => handleChange("sectionType", value)}
                >
                  <SelectTrigger id="sectionType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target">Target</Label>
                <Input
                  id="target"
                  type="number"
                  inputMode="numeric"
                  value={form.target}
                  onChange={(event) =>
                    handleChange("target", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Limit</Label>
                <Input
                  id="limit"
                  type="number"
                  inputMode="numeric"
                  value={form.limit}
                  onChange={(event) =>
                    handleChange("limit", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewer">Reviewer</Label>
              <Select
                value={form.reviewer}
                onValueChange={(value) => handleChange("reviewer", value)}
              >
                <SelectTrigger id="reviewer" className="w-full">
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {reviewerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="flex flex-row justify-end gap-2 border-t bg-background px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="text-xs"
              onClick={() => setSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" className="text-xs" onClick={handleSave}>
              {isEditing ? "Save changes" : "Add section"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
