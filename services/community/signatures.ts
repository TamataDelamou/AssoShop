// services/community/signatures.ts
import { base44Client } from "@/lib/base44";
import {
  CreateSignatureRequestPayload,
  SignatureRequest,
} from "@/types/modules/community";

export const signaturesService = {
  async getSignatures(organizationId: string): Promise<SignatureRequest[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/signatures`,
    );
    return response.data;
  },

  async createSignature(
    organizationId: string,
    payload: CreateSignatureRequestPayload,
  ): Promise<SignatureRequest> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/signatures`,
      payload,
    );
    return response.data;
  },

  async signSignature(
    organizationId: string,
    signatureId: string,
    signatoryId: string,
  ): Promise<SignatureRequest> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/signatures/${signatureId}/sign`,
      { signatory_id: signatoryId },
    );
    return response.data;
  },

  async rejectSignature(
    organizationId: string,
    signatureId: string,
  ): Promise<SignatureRequest> {
    const response = await base44Client.patch(
      `/organizations/${organizationId}/signatures/${signatureId}/reject`,
      {},
    );
    return response.data;
  },
};
