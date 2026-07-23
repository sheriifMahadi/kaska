import DashboardLayout from "@/components/layout/dashboard-layout";
import WalletClient from "@/components/wallet/wallet-client";

export default function WalletPage() {
  return (
    <DashboardLayout>
      <WalletClient />
    </DashboardLayout>
  );
}