"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertCircle, Download, Search, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"

interface TableRendererProps {
  artifact: {
    content: string
    title?: string
  }
}

interface TableData {
  title?: string
  subtitle?: string
  columns: Array<{
    key: string
    label: string
    type?: "string" | "number" | "date" | "boolean" | "currency"
    sortable?: boolean
    filterable?: boolean
    width?: string
  }>
  data: Array<Record<string, any>>
  pagination?: {
    page: number
    pageSize: number
    total: number
  }
  summary?: {
    totalRows: number
    totalColumns: number
    lastUpdated?: string
  }
  actions?: Array<{
    label: string
    action: string
    icon?: string
  }>
}

type SortDirection = "asc" | "desc" | null

export function TableRenderer({ artifact }: TableRendererProps) {
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Table state
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  useEffect(() => {
    const parseTableData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        await new Promise((resolve) => setTimeout(resolve, 100))
        const parsed = JSON.parse(artifact.content)
        setTableData(parsed)
      } catch (error) {
        console.error("Failed to parse table JSON:", error)
        setError("Invalid Table Data - The provided data is not valid JSON.")
      } finally {
        setIsLoading(false)
      }
    }

    parseTableData()
  }, [artifact.content])

  // Filter and sort data
  const processedData = tableData?.data
    ? tableData.data
        .filter((row) => {
          if (!searchTerm) return true
          return Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
        })
        .sort((a, b) => {
          if (!sortColumn || !sortDirection) return 0

          const aVal = a[sortColumn]
          const bVal = b[sortColumn]

          if (aVal === bVal) return 0

          const comparison = aVal < bVal ? -1 : 1
          return sortDirection === "asc" ? comparison : -comparison
        })
    : []

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize)
  const paginatedData = processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc")
      if (sortDirection === "desc") {
        setSortColumn(null)
      }
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedRows(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedData.map((_, index) => index)))
    }
  }

  const formatCellValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return "-"

    switch (type) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(value))
      case "number":
        return new Intl.NumberFormat("en-US").format(Number(value))
      case "date":
        return new Date(value).toLocaleDateString()
      case "boolean":
        return value ? "✅" : "❌"
      default:
        return String(value)
    }
  }

  const exportToCSV = () => {
    if (!tableData) return

    const headers = tableData.columns.map((col) => col.label).join(",")
    const rows = processedData
      .map((row) => tableData.columns.map((col) => `"${row[col.key] || ""}"`).join(","))
      .join("\n")

    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${tableData.title || "table"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span className="text-sm font-medium">Loading table data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          <p className="font-semibold">{error}</p>
        </div>
        <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-auto font-mono">
          {artifact.content}
        </pre>
      </div>
    )
  }

  if (!tableData) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          <p className="font-semibold">Invalid Table Configuration</p>
        </div>
        <p>Table must have 'columns' and 'data' properties.</p>
      </div>
    )
  }

  return (
    <Card className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {tableData.title || artifact.title || "Data Table"}
            </CardTitle>
            {tableData.subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tableData.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && (
              <Badge variant="secondary" className="text-sm">
                {selectedRows.size} selected
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {paginatedData.length} of {processedData.length} rows
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Table */}
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                {tableData.columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={`font-semibold text-gray-900 dark:text-gray-100 ${
                      column.sortable !== false ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" : ""
                    }`}
                    style={{ width: column.width }}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable !== false && (
                        <div className="flex flex-col">
                          {sortColumn === column.key ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-accent" />
                            ) : sortDirection === "desc" ? (
                              <ArrowDown className="w-3 h-3 text-accent" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow
                  key={index}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedRows.has(index) ? "bg-accent/10 dark:bg-accent/10" : ""
                  }`}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(index)}
                      onChange={() => handleRowSelect(index)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  {tableData.columns.map((column) => (
                    <TableCell key={column.key} className="text-sm">
                      {formatCellValue(row[column.key], column.type)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View details">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Summary Footer */}
      {tableData.summary && (
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {tableData.summary.totalRows} rows × {tableData.summary.totalColumns} columns
            </span>
            {tableData.summary.lastUpdated && (
              <span>Last updated: {new Date(tableData.summary.lastUpdated).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
