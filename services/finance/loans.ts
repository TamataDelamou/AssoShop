import { base44Client } from "@/lib/base44";
import { GroupLoan, RequestLoanPayload } from "@/types/modules/finance";

interface GetLoansParams {
  search?: string;
  status?: string;
}

export const loansService = {
  async getLoans(
    organizationId: string,
    params: GetLoansParams = {},
  ): Promise<GroupLoan[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/loans`,
      { params },
    );
    return response.data;
  },

  async requestLoan(
    organizationId: string,
    groupId: string,
    payload: RequestLoanPayload,
  ): Promise<GroupLoan> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/financial-groups/${groupId}/loans`,
      payload,
    );
    return response.data;
  },

  async confirmSponsor(
    organizationId: string,
    loanId: string,
  ): Promise<GroupLoan> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/loans/${loanId}/sponsor-confirm`,
    );
    return response.data;
  },

  async decideLoan(
    organizationId: string,
    loanId: string,
    approved: boolean,
  ): Promise<GroupLoan> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/loans/${loanId}/decision`,
      { approved },
    );
    return response.data;
  },

  async repayInstallment(
    organizationId: string,
    loanId: string,
    installmentId: string,
  ): Promise<GroupLoan> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/loans/${loanId}/installments/${installmentId}/repay`,
    );
    return response.data;
  },
};
