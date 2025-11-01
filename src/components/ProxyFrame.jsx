import React, { useState } from 'react';
import { Loader, ExternalLink } from 'lucide-react';

export default function ProxyFrame({ title, subtitle, url, loading }) {
  const [isLoading, setIsLoading] = useState(loading);
  const [error, setError] = useState(null);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-8 py-4 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
        >
          <ExternalLink size={16} />
          Open Full View
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-slate-900">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-slate-300">
              <Loader size={24} className="animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 mb-4">Failed to load component</p>
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <iframe
          src={url}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          onError={() => setError('Failed to load')}
          title={title}
        />
      </div>
    </div>
  );
}
