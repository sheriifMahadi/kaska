import {
  LayoutDashboard,
  Bot,
  ListTodo,
  Wallet,
  UserRound,
} from "lucide-react";

export const dashboardNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Agents",
    href: "/agents",
    icon: Bot,
  },
  {
    title: "Jobs",
    href: "/jobs",
    icon: ListTodo,
  },
  {
    title: "Wallet",
    href: "/wallet",
    icon: Wallet,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: UserRound,
    disabled: true,
  },
];
