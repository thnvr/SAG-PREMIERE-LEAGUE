import React from 'react';

export default function StatsCard({ icon: Icon, label, value, subValue, color = 'electric', className = '' }) {
  const colorMap = {
    electric: 'text-electric bg-electric/10',
    gold: 'text-gold bg-gold/10',
    blue: 'text-blue-400 bg-blue-400/10',
    red: 'text-red-400 bg-red-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    slate: 'text-slate-300 bg-slate-600/30',
  };

  const iconColor = colorMap[color] || colorMap.electric;

  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {subValue && (
            <p className="text-xs text-slate-500 mt-1">{subValue}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
