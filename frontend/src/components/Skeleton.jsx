import React from 'react';

export default function Skeleton({ className = 'h-6 w-full' }) {
  return (
    <div className={`bg-gray-800/80 animate-pulse rounded-lg ${className}`}></div>
  );
}
