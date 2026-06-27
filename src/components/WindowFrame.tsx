"use client";

import type { ReactNode } from "react";

type WindowFrameProps = {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function WindowFrame({ title, children, className = "", bodyClassName = "" }: WindowFrameProps) {
  return (
    <section className={`overflow-hidden border border-black bg-white shadow-window ${className}`}>
      <div className="snow-cap flex h-8 items-center justify-center border-b border-black px-3 font-pixel text-sm font-bold">
        <span className="truncate">{title}</span>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
