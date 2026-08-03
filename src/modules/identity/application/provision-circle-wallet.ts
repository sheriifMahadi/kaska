export type ProvisioningCircleWallet = {
  id?: string;
  walletSetId?: string;
  address?: string;
  blockchain?: string;
  refId?: string;
};

type CircleProvisioningClient = {
  listWallets(input: {
    blockchain: "ARC-TESTNET";
    refId: string;
    pageSize: number;
    xRequestId: string;
  }): Promise<{
    data?: { wallets?: ProvisioningCircleWallet[] };
  }>;
  createWalletSet(input: {
    name: string;
    idempotencyKey: string;
    xRequestId: string;
  }): Promise<{
    data?: { walletSet?: { id?: string } };
  }>;
  createWallets(input: {
    walletSetId: string;
    blockchains: ["ARC-TESTNET"];
    count: 1;
    accountType: "EOA";
    metadata: [{ name: string; refId: string }];
    idempotencyKey: string;
    xRequestId: string;
  }): Promise<{
    data?: { wallets?: ProvisioningCircleWallet[] };
  }>;
};

export type ProvisionCircleWalletInput = {
  userId: string;
  walletSetId: string | null;
  walletSetIdempotencyKey: string;
  walletIdempotencyKey: string;
  circle: CircleProvisioningClient;
  createRequestId: () => string;
  recordRequestId: (requestId: string) => Promise<void>;
  persistWalletSetId: (walletSetId: string) => Promise<void>;
};

async function requestId(input: ProvisionCircleWalletInput) {
  const value = input.createRequestId();
  await input.recordRequestId(value);
  return value;
}

function requireUsableWallet(
  wallet: ProvisioningCircleWallet | undefined
): Required<
  Pick<ProvisioningCircleWallet, "id" | "walletSetId" | "address">
> &
  ProvisioningCircleWallet {
  if (!wallet?.id || !wallet.walletSetId || !wallet.address) {
    throw new Error("Circle returned an incomplete wallet");
  }

  return wallet as Required<
    Pick<ProvisioningCircleWallet, "id" | "walletSetId" | "address">
  > &
    ProvisioningCircleWallet;
}

export async function provisionCircleWallet(
  input: ProvisionCircleWalletInput
) {
  // Reconciliation always runs first. If Circle created the wallet but
  // Kaska failed to save it, refId lets us adopt the intended wallet.
  const listResponse = await input.circle.listWallets({
    blockchain: "ARC-TESTNET",
    refId: input.userId,
    pageSize: 10,
    xRequestId: await requestId(input),
  });
  const matchingWallets =
    listResponse.data?.wallets?.filter(
      (wallet) =>
        wallet.refId === input.userId &&
        (!wallet.blockchain || wallet.blockchain === "ARC-TESTNET")
    ) ?? [];

  if (matchingWallets.length > 1) {
    throw new Error(
      "Multiple Circle wallets found for the same Kaska user"
    );
  }

  if (matchingWallets[0]) {
    return {
      wallet: requireUsableWallet(matchingWallets[0]),
      reconciled: true,
    };
  }

  let walletSetId = input.walletSetId;

  if (!walletSetId) {
    const walletSetResponse = await input.circle.createWalletSet({
      name: `kaska-${input.userId}`,
      idempotencyKey: input.walletSetIdempotencyKey,
      xRequestId: await requestId(input),
    });
    walletSetId = walletSetResponse.data?.walletSet?.id ?? null;

    if (!walletSetId) {
      throw new Error("Circle wallet-set creation returned no ID");
    }

    await input.persistWalletSetId(walletSetId);
  }

  const walletResponse = await input.circle.createWallets({
    walletSetId,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA",
    metadata: [
      {
        name: `Kaska wallet ${input.userId}`,
        refId: input.userId,
      },
    ],
    idempotencyKey: input.walletIdempotencyKey,
    xRequestId: await requestId(input),
  });

  return {
    wallet: requireUsableWallet(walletResponse.data?.wallets?.[0]),
    reconciled: false,
  };
}
