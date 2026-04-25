import type { ReactNode } from "react";

import { WorkspaceProvider, WorkspaceShell } from "@/components/workspace";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
