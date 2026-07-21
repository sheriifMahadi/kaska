// // src/app/dashboard/page.tsx
// import { DashboardLayout } from "@/components/layout/dashboard-layout";
// import { DashboardClient } from "@/components/dashboard/dashboard-client";
// import { auth } from "@clerk/nextjs/server";
// import { redirect } from "next/navigation";

// export default async function DashboardPage() {
//   const { userId } = await auth();

//   // 🔒 server-side protection (correct place)
//   if (!userId) {
//     redirect("/sign-in");
//   }

//   return (
//     <DashboardLayout>
//       <DashboardClient />
//     </DashboardLayout>
//   );
// }

import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardClient from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardClient />
    </DashboardLayout>
  );
}