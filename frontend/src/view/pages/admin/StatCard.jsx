import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, color = 'bg-gray-500', trend, trendValue }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className="w-4 h-4 mr-1" />
              {trendValue}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {Icon ? <Icon className="w-6 h-6 text-white" /> : null}
        </div>
      </div>
    </div>
  );
}
