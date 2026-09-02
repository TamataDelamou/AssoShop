import { base44Client } from "@/lib/base44";
import {
  CommunityProject,
  ContributeToProjectPayload,
  CreateProjectPayload,
} from "@/types/modules/community";

interface GetProjectsParams {
  search?: string;
  status?: string;
}

export const projectsService = {
  async getProjects(
    organizationId: string,
    params: GetProjectsParams = {},
  ): Promise<CommunityProject[]> {
    const response = await base44Client.get(
      `/organizations/${organizationId}/projects`,
      { params },
    );
    return response.data;
  },

  async createProject(
    organizationId: string,
    payload: CreateProjectPayload,
  ): Promise<CommunityProject> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/projects`,
      payload,
    );
    return response.data;
  },

  async contribute(
    organizationId: string,
    projectId: string,
    payload: ContributeToProjectPayload,
  ): Promise<CommunityProject> {
    const response = await base44Client.post(
      `/organizations/${organizationId}/projects/${projectId}/contributions`,
      payload,
    );
    return response.data;
  },
};
