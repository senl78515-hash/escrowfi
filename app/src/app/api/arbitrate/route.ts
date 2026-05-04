import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

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

export async function POST(req: NextRequest) {
  try {
    const body: ArbitrateRequest = await req.json();
    const { escrowId, amount, description, buyerEvidence, sellerEvidence } = body;

    if (!buyerEvidence.trim() && !sellerEvidence.trim()) {
      return NextResponse.json({ error: "At least one party must provide evidence." }, { status: 400 });
    }

    const systemPrompt = `You are an impartial AI arbitrator for EscrowFi, a decentralized USDC escrow platform on Solana. Your role is to analyze disputes between buyers and sellers objectively and provide a fair, reasoned verdict recommendation.

You must respond ONLY with a valid JSON object in this exact format:
{
  "verdict": "buyer" | "seller" | "neither",
  "confidence": "high" | "medium" | "low",
  "reasoning": "2-3 sentence explanation of your analysis",
  "keyFactors": ["factor 1", "factor 2", "factor 3"],
  "recommendedAction": "One sentence on what the arbitrator should do"
}

Guidelines:
- "buyer" verdict means the buyer's claim is valid and funds should be returned to the buyer
- "seller" verdict means the seller fulfilled their obligations and funds should be released to the seller
- "neither" means evidence is insufficient or contradictory — request more information
- Be objective, impartial, and base your verdict on the evidence provided
- Consider standard e-commerce norms and reasonable expectations
- If evidence is one-sided (only one party provided), lower your confidence level`;

    const userMessage = `Escrow Dispute Analysis Request:

**Escrow ID:** ${escrowId}
**Transaction Amount:** ${amount} USDC
**Transaction Description:** ${description}

**Buyer's Evidence:**
${buyerEvidence.trim() || "(No evidence provided by buyer)"}

**Seller's Evidence:**
${sellerEvidence.trim() || "(No evidence provided by seller)"}

Please analyze this dispute and provide your verdict recommendation.`;

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Extract JSON from the response (may be wrapped in markdown code block)
    const raw = textBlock.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response as JSON");

    const verdict: ArbitrateResponse = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!["buyer", "seller", "neither"].includes(verdict.verdict)) {
      throw new Error("Invalid verdict value");
    }

    return NextResponse.json(verdict);
  } catch (err: any) {
    console.error("Arbitrate API error:", err);
    return NextResponse.json({ error: err?.message ?? "AI analysis failed" }, { status: 500 });
  }
}
