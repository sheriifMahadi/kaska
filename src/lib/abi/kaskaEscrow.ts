export const escrowAbi = [
  {
    type: "function",
    name: "createTaskEscrow",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "taskId",
        type: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    outputs: [],
  },
] as const;
