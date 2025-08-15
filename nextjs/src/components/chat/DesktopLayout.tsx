"use client";

import React from "react";

interface DesktopLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * DesktopLayout - AI Desktop style layout component
 * Implements the specified layout with:
 * - Flex row direction
 * - 1440px width (min 1140px, max 1440px)
 * - 1216px height
 * - #FCFCFC background
 * - Proper positioning and alignment
 */
export function DesktopLayout({ children, className = "" }: DesktopLayoutProps): React.JSX.Element {
  return (
    <div
      className={`
        flex flex-row items-start p-0
        relative w-[1440px] min-w-[1140px] max-w-[1440px] h-[1216px]
        bg-[#FCFCFC]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
