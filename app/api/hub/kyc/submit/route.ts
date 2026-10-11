import { NextRequest, NextResponse } from "next/server";
import { apiError, getAuthedContext } from "@/lib/api/auth";
import { payRpcErrorResponse, rpcRow } from "@/lib/api/pay-rpc";

export async function POST(request: NextRequest) {
  const ctx = await getAuthedContext();
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { document_type } = (await request.json().catch(() => ({}))) as {
    document_type?: string;
  };

  try {
    if (!document_type?.trim()) {
      return NextResponse.json({ error: "Type de document requis" }, { status: 400 });
    }

    // Demande toujours « pending », visible du back-office : fonction SQL
    // kyc_submit (0025). L'utilisateur n'écrit plus hub_kyc ni son statut KYC.
    const { data, error } = await supabase.rpc("kyc_submit", {
      p_document_type: document_type,
    });
    if (error) return payRpcErrorResponse(error);

    return NextResponse.json(rpcRow(data));
  } catch (err) {
    return apiError(err);
  }
}
