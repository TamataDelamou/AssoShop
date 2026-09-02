import { base44Client } from "@/lib/base44";
import {
  AssociationDocument,
  UploadDocumentPayload,
} from "@/types/modules/community";

interface GetDocumentsParams {
  search?: string;
  category?: string;
}

export const documentsService = {
  async getDocuments(
    organizationId: string,
    params: GetDocumentsParams = {},
  ): Promise<AssociationDocument[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/documents`,
      { params },
    );
    return response.data;
  },

  async uploadDocument(
    organizationId: string,
    payload: UploadDocumentPayload,
  ): Promise<AssociationDocument> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/documents`,
      payload,
    );
    return response.data;
  },
};
