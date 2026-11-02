"use client";

import { useEffect, useRef } from "react";

/** Fades its children in the first time they scroll into view. */
export function Reveal({ as: Tag = "section", className = "", children, ...rest }: {
  as?: "section" | "div";
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as React.Ref<HTMLDivElement>} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
