import React from 'react';
import { Bell } from 'lucide-react';

export default function TopMenu({ pageName, rightContent }) {
  return (
    <div className="hidden lg:flex items-center justify-between bg-white border border-gray-200 px-6 py-4 rounded-2xl shadow-md shadow-gray-200/50 mb-6">
      <h2 className="text-xl font-bold text-gray-900 capitalize tracking-tight">
        {pageName ? pageName.replace(/_/g, ' ') : 'Dashboard'}
      </h2>
      <div className="flex items-center">
        {rightContent ? (
          rightContent
        ) : (
          <button className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-white relative transition-colors cursor-pointer">
            <Bell size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
