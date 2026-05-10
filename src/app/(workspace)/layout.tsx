import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { WorkspaceProvider, WorkspaceShell } from "@/components/workspace";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  async function handleSignOut() {
    "use server";

    await signOut({
      redirectTo: "/sign-in",
    });
  }

  return (
    <WorkspaceProvider>
      <WorkspaceShell
        userLabel={session.user.name ?? session.user.email ?? "Account"}
        signOutAction={handleSignOut}
      >
        {children}
      </WorkspaceShell>
    </WorkspaceProvider>
  );
}
