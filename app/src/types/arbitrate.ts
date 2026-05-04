export interface ArbitrateRequest {
  escrowId: string;
  amount: string;
  description: string;
  buyerEvidence: string;
  sellerEvidence: string;
}

export interface ArbitrateResponse {
  verdict: "buyer" | "seller" | "neither";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  keyFactors: string[];
  recommendedAction: string;
}
