import React from 'react';
import './Loader.css';

export function Skeleton({ className = "" }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

export function CardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="w-10 h-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-36 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-9 w-full rounded-lg" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Skeleton className="h-8 w-64 rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

export default function Loader({ fullScreen = true, variant = "dashboard" }) {
  if (variant === "table") {
    return <TableSkeleton />;
  }
  if (variant === "cards") {
    return <CardsSkeleton />;
  }
  if (variant === "details") {
    return <DetailsSkeleton />;
  }

  const skeletonDashboard = (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row">
      {/* Mobile Header Skeleton */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>

      {/* Desktop Sidebar Skeleton */}
      <div className="hidden lg:flex flex-col justify-between w-64 border-r border-gray-200 bg-white p-6 shrink-0 h-screen sticky top-0">
        <div className="space-y-6">
          {/* Logo / Brand Skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>

          <div className="h-[1px] bg-gray-100" />

          {/* Navigation Links Skeleton */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-transparent"
              >
                <Skeleton className="w-5 h-5 rounded-md shrink-0" />
                <Skeleton className={`h-4 rounded-md ${i === 1 ? 'w-24 bg-gray-300' : 'w-28'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Card Skeleton */}
        <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-2.5 w-28 rounded" />
            </div>
          </div>
          <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50/40 min-h-screen overflow-y-auto">
        {/* Welcome Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200/70">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 sm:w-72 rounded-xl" />
            <Skeleton className="h-4 w-72 sm:w-96 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-44 rounded-xl hidden sm:block" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        {/* Stats Metric Cards Skeleton */}
        <CardsSkeleton count={4} />

        {/* Main Content Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Table / List Skeleton */}
          <div className="lg:col-span-2">
            <TableSkeleton rows={4} />
          </div>

          {/* Side Card / Recent Activity Skeleton */}
          <div className="lg:col-span-1 bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32 rounded-md" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="p-3.5 border border-gray-100 rounded-xl bg-gray-50/60 flex items-center gap-3"
                >
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="h-2.5 w-1/2 rounded" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Skeleton */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around items-center z-50">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-1">
            <Skeleton className="w-6 h-6 rounded-md" />
            <Skeleton className="h-2 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fullscreen-skeleton-overlay">
        {skeletonDashboard}
      </div>
    );
  }

  return skeletonDashboard;
}
