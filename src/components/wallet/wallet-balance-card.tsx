type Props = {
  title: string;
  value: string;
};

export default function WalletBalanceCard({
  title,
  value,
}: Props) {
  return (
    <div className="rounded-xl bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value} USDC
      </p>
    </div>
  );
}