import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{
    agent?: string;
  }>;
};

export default async function NewTaskPage({
  searchParams,
}: Props) {
  const { agent } = await searchParams;

  redirect(agent ? `/jobs/new?agent=${encodeURIComponent(agent)}` : "/jobs/new");
}
