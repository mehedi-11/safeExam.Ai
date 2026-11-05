import React from 'react';

export default function TopMenu({ pageName, rightContent }) {
  return (
    <div className="hidden lg:flex items-center justify-between bg-white border border-gray-200 px-6 py-4 rounded-2xl shadow-sm mb-6">
      <h2 className="text-xl font-bold text-gray-900 capitalize tracking-tight">
        {pageName ? pageName.replace(/_/g, ' ') : 'Dashboard'}
      </h2>
      {rightContent && (
        <div className="flex items-center">
          {rightContent}
        </div>
      )}
    </div>
  );
}
