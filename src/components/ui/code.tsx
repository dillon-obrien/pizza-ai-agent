import React from "react";
import { cn } from "@/lib/utils";

interface CodeProps extends React.HTMLAttributes<HTMLPreElement> {
  children: React.ReactNode;
}

export function Code({ className, children, ...props }: CodeProps) {
  return (
    <pre
      className={cn("rounded bg-muted px-2 py-1 font-mono text-sm", className)}
      {...props}
    >
      <code>{children}</code>
    </pre>
  );
}
