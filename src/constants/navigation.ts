import {
  LayoutDashboard,
  Bot,
  ListTodo,
  Wallet,
  ReceiptText,
  CalendarClock,
} from "lucide-react";

export const dashboardNav = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Marketplace",
    href: "/agents",
    icon: Bot,
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: ListTodo,
  },
  {
    title: "Schedules",
    href: "/schedules",
    icon: CalendarClock,
  },
  {
    title: "Wallet",
    href: "/wallet",
    icon: Wallet,
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ReceiptText,
  },
];
