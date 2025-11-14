'use client';

import { useWebSocket } from '@/contexts/WebSocketContext';

export function ConnectionStatus() {
  const { isConnected } = useWebSocket();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
      <div className="relative">
        <div className="w-2 h-2 rounded-full bg-red-500" />
      </div>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        Offline
      </span>
    </div>
  );
}
