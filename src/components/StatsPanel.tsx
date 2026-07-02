import React from 'react';
import { Building2, CheckCircle2, ExternalLink, Database } from 'lucide-react';
import { Supplier } from '../types';

interface StatsPanelProps {
  suppliers: Supplier[];
}

export function StatsPanel({ suppliers }: StatsPanelProps) {
  const stats = {
    total: suppliers.length,
    indiamart: suppliers.filter(s => s.source_type === 'indiamart').length,
    external: suppliers.filter(s => s.source_type === 'external').length,
    withGst: suppliers.filter(s => s.gst_number).length,
    withEmail: suppliers.filter(s => s.email).length,
    withPhone: suppliers.filter(s => s.phone).length,
    withTrustSeal: suppliers.filter(s => s.trust_seal_url).length,
  };

  const statCards = [
    {
      label: 'Total Suppliers',
      value: stats.total,
      icon: Database,
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      textColor: 'text-white'
    },
    {
      label: 'IndiaMART',
      value: stats.indiamart,
      icon: Building2,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      textColor: 'text-white'
    },
    {
      label: 'External Sites',
      value: stats.external,
      icon: ExternalLink,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      textColor: 'text-white'
    },
    {
      label: 'With GST',
      value: stats.withGst,
      icon: CheckCircle2,
      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
      textColor: 'text-white'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`${stat.color} rounded-xl p-4 shadow-lg`}
        >
          <stat.icon className={`w-6 h-6 ${stat.textColor} opacity-80 mb-2`} />
          <div className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</div>
          <div className={`text-sm ${stat.textColor} opacity-80`}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
