import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer({
  children,
}: PageContainerProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      {children}
    </div>
  );
}