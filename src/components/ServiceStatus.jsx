import React from 'react';
import { CheckCircle, AlertCircle, RotateCw, Eye } from 'lucide-react';

export default function ServiceStatus({ name, info, onRestart }) {
  const humanName = name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg">{humanName}</h3>
          <p className="text-sm text-slate-400">Port {info.port}</p>
        </div>
        <div className="flex items-center gap-2">
          {info.healthy ? (
            <CheckCircle size={24} className="text-green-500" />
          ) : (
            <AlertCircle size={24} className="text-yellow-500" />
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-slate-400 mb-2">Status</div>
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          info.healthy
            ? 'bg-green-900 text-green-200'
            : 'bg-yellow-900 text-yellow-200'
        }`}>
          {info.healthy ? '✓ Healthy' : '⏳ Starting'}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition"
        >
          <RotateCw size={16} />
          Restart
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-900 hover:bg-blue-800 rounded-lg text-sm font-medium transition">
          <Eye size={16} />
          Logs
        </button>
      </div>
    </div>
  );
}
