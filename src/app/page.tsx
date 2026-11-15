import { Suspense } from "react";
import { connection } from "next/server";
import { Workspace } from "@/components/Workspace";
import { getServerConfig } from "@/lib/config";

/** Reads configuration per request, so the mode shown always reflects the server. */
async function ConfiguredWorkspace() {
  await connection();
  // Only the mode crosses to the browser — never the key or model.
  return <Workspace mode={getServerConfig().mode} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <ConfiguredWorkspace />
    </Suspense>
  );
}
