"use client";

import { useState } from "react";
import { base44Client } from "@/lib/base44";
import { CreateOrganizationPayload } from "@/types/modules/community";

export function useCreateOrganization() {
  const [loading, setLoading] = useState(false);

  const create = async (data: CreateOrganizationPayload) => {
    setLoading(true);
    try {
      const response = await base44Client.post("/organizations", data);
      return response;
    } catch (error) {
      console.error("Erreur de création", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
}
