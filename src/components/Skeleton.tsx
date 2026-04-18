"use client";

import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({ 
  width = "100%", 
  height = "20px", 
  borderRadius = "4px",
  style 
}: SkeletonProps) {
  return (
    <div 
      className="skeleton-pulse"
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "#e2e8f0",
        ...style
      }}
    >
      <style jsx>{`
        .skeleton-pulse {
          background: linear-gradient(
            90deg,
            #f1f5f9 25%,
            #e2e8f0 50%,
            #f1f5f9 75%
          );
          background-size: 200% 100%;
          animation: pulse 1.5s infinite ease-in-out;
        }

        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <Skeleton width="150px" height="32px" />
        <Skeleton width="100px" height="32px" />
      </div>
      <Skeleton height="600px" borderRadius="12px" />
    </div>
  );
}
