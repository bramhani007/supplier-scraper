import React, { useState, useMemo } from 'react';

// Only allow http/https URLs in any rendered href to prevent javascript:/data: XSS
function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:' ? url : undefined;
  } catch {
    return undefined;
  }
}

import {
  Building2, MapPin, Phone, Mail, Globe, FileText,
  Building, Users, IndianRupee, Award, ExternalLink,
  Search, ChevronDown, ChevronUp, Copy, CheckCircle, Trash2
} from 'lucide-react';
import { Supplier } from '../types';

interface ResultsTableProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onDelete: (id: number) => Promise<void>;
}

type SortField = 'name' | 'location' | 'created_at' | 'source_type';
type SortOrder = 'asc' | 'desc';

export function ResultsTable({ suppliers, isLoading, onDelete }: ResultsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSuppliers = useMemo(() => {
    const filtered = suppliers.filter(supplier => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        supplier.name.toLowerCase().includes(term) ||
        (supplier.location?.toLowerCase().includes(term)) ||
        (supplier.gst_number?.toLowerCase().includes(term)) ||
        (supplier.phone?.toLowerCase().includes(term)) ||
        (supplier.email?.toLowerCase().includes(term)) ||
        (supplier.products?.toLowerCase().includes(term))
      );
    });

    return filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (sortField === 'created_at') {
        aVal = new Date(a.created_at).getTime().toString();
        bVal = new Date(b.created_at).getTime().toString();
      }

      const comparison = aVal.toString().localeCompare(bVal.toString());
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [suppliers, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ?
      <ChevronUp className="w-4 h-4" /> :
      <ChevronDown className="w-4 h-4" />;
  };

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading suppliers...</p>
        </div>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <Building2 className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">No suppliers found</p>
          <p className="text-sm mt-1">Start a new scraping job to collect supplier data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Results</h3>
            <p className="text-sm text-gray-500">
              {filteredSuppliers.length} of {suppliers.length} suppliers
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search suppliers..."
              className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Supplier <SortIcon field="name" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('location')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Location <SortIcon field="location" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">GST</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('source_type')}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Source <SortIcon field="source_type" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider width-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSuppliers.map((supplier) => (
              <React.Fragment key={supplier.id}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{supplier.name}</div>
                        {supplier.nature_of_business && (
                          <div className="text-sm text-gray-500">{supplier.nature_of_business}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {supplier.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {supplier.location}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {supplier.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{supplier.phone.split(',')[0]}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate max-w-[150px]">{supplier.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {supplier.gst_number && (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {supplier.gst_number}
                      </code>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      supplier.source_type === 'indiamart'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {supplier.source_type === 'indiamart' ? 'IndiaMART' : 'External'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      {safeHref(supplier.indiamart_url) && (
                        <a
                          href={safeHref(supplier.indiamart_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        </a>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, supplier.id)}
                        disabled={deletingId === supplier.id}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50"
                        title="Delete supplier"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedId === supplier.id && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Products Section */}
                        {supplier.products && (
                          <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-600" />
                              Products
                            </h4>
                            <div className="text-sm text-gray-600 whitespace-pre-line">
                              {supplier.products}
                            </div>
                          </div>
                        )}

                        {/* Business Details */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Building className="w-4 h-4 text-blue-600" />
                            Business Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            {supplier.nature_of_business && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Nature:</span>
                                <span className="text-gray-700">{supplier.nature_of_business}</span>
                              </div>
                            )}
                            {supplier.total_employees && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" /> Employees:</span>
                                <span className="text-gray-700">{supplier.total_employees}</span>
                              </div>
                            )}
                            {supplier.annual_turnover && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Turnover:</span>
                                <span className="text-gray-700">{supplier.annual_turnover}</span>
                              </div>
                            )}
                            {supplier.iec && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">IEC:</span>
                                <code className="text-xs bg-gray-100 px-1 rounded">{supplier.iec}</code>
                              </div>
                            )}
                            {supplier.cin_no && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">CIN:</span>
                                <code className="text-xs bg-gray-100 px-1 rounded">{supplier.cin_no}</code>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contact Section */}
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-teal-600" />
                            Contact Information
                          </h4>
                          <div className="space-y-2">
                            {supplier.phone && (
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  {supplier.phone}
                                </div>
                                <button
                                  onClick={() => copyToClipboard(supplier.phone, `phone-${supplier.id}`)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  {copiedField === `phone-${supplier.id}` ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            )}
                            {supplier.email && (
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  {supplier.email}
                                </div>
                                <button
                                  onClick={() => copyToClipboard(supplier.email!, `email-${supplier.id}`)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  {copiedField === `email-${supplier.id}` ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </div>
                            )}
                            {safeHref(supplier.website) && (
                              <a
                                href={safeHref(supplier.website)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                              >
                                <Globe className="w-4 h-4" />
                                {supplier.website}
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Trust Seal */}
                        {Object.keys(supplier.trust_seal_data || {}).length > 0 && (
                          <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Award className="w-4 h-4 text-amber-600" />
                              Trust Seal Data
                            </h4>
                            <div className="space-y-2 text-sm">
                              {supplier.trust_seal_data.director && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Director:</span>
                                  <span className="text-gray-700">{supplier.trust_seal_data.director}</span>
                                </div>
                              )}
                              {supplier.trust_seal_data.gstin && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">GSTIN:</span>
                                  <code className="text-xs bg-gray-100 px-1 rounded">{supplier.trust_seal_data.gstin}</code>
                                </div>
                              )}
                              {supplier.trust_seal_data.business_address && (
                                <div className="text-gray-600 text-xs">{supplier.trust_seal_data.business_address}</div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* About Section */}
                        {supplier.about_us && (
                          <div className="bg-white p-4 rounded-xl border shadow-sm md:col-span-2 lg:col-span-3">
                            <h4 className="font-semibold text-gray-900 mb-3">About</h4>
                            <p className="text-sm text-gray-600">{supplier.about_us}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
