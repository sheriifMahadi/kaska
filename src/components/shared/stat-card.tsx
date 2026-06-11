import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
}

export function StatCard({
  title,
  value,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">
          {title}
        </p>

        <h3 className="mt-2 text-2xl font-semibold">
          {value}
        </h3>
      </CardContent>
    </Card>
  );
}