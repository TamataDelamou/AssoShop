import type { SupabaseClient } from "@supabase/supabase-js";
import { OrganizationSettings } from "@/types/modules/community";

interface SettingsRow {
  organization_id: string;
  members_visible_to_affiliates: boolean;
  financial_details_visible_to_affiliates: boolean;
  contributors_visible_in_social_cases: boolean;
  validation_mode: string;
  sponsorship_required: boolean;
  updated_at: string | null;
}

const SETTINGS_COLUMNS = [
  "organization_id",
  "members_visible_to_affiliates",
  "financial_details_visible_to_affiliates",
  "contributors_visible_in_social_cases",
  "validation_mode",
  "sponsorship_required",
  "updated_at",
].join(", ");

function serializeSettings(row: SettingsRow): OrganizationSettings {
  return {
    organization_id: row.organization_id,
    confidentiality: {
      members_visible_to_affiliates: row.members_visible_to_affiliates,
      financial_details_visible_to_affiliates:
        row.financial_details_visible_to_affiliates,
      contributors_visible_in_social_cases:
        row.contributors_visible_in_social_cases,
    },
    membership: {
      validation_mode:
        row.validation_mode as OrganizationSettings["membership"]["validation_mode"],
      sponsorship_required: row.sponsorship_required,
    },
    updated_at: row.updated_at ? new Date(row.updated_at) : null,
  };
}

const DEFAULTS = {
  members_visible_to_affiliates: true,
  financial_details_visible_to_affiliates: false,
  contributors_visible_in_social_cases: false,
  validation_mode: "manual",
  sponsorship_required: false,
};

export async function getSettings(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationSettings> {
  const { data, error } = await supabase
    .from("organization_settings")
    .select(SETTINGS_COLUMNS)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return serializeSettings(data as unknown as SettingsRow);

  const { data: created, error: insertError } = await supabase
    .from("organization_settings")
    .insert({ organization_id: organizationId, ...DEFAULTS })
    .select(SETTINGS_COLUMNS)
    .single();
  if (insertError) throw new Error(insertError.message);
  return serializeSettings(created as unknown as SettingsRow);
}

export async function updateSettings(
  supabase: SupabaseClient,
  organizationId: string,
  payload: {
    confidentiality?: {
      members_visible_to_affiliates?: boolean;
      financial_details_visible_to_affiliates?: boolean;
      contributors_visible_in_social_cases?: boolean;
    };
    membership?: {
      validation_mode?: string;
      sponsorship_required?: boolean;
    };
  },
): Promise<OrganizationSettings> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.confidentiality) {
    const c = payload.confidentiality;
    if (typeof c.members_visible_to_affiliates === "boolean") {
      patch.members_visible_to_affiliates = c.members_visible_to_affiliates;
    }
    if (typeof c.financial_details_visible_to_affiliates === "boolean") {
      patch.financial_details_visible_to_affiliates =
        c.financial_details_visible_to_affiliates;
    }
    if (typeof c.contributors_visible_in_social_cases === "boolean") {
      patch.contributors_visible_in_social_cases =
        c.contributors_visible_in_social_cases;
    }
  }
  if (payload.membership) {
    if (payload.membership.validation_mode) {
      patch.validation_mode = payload.membership.validation_mode;
    }
    if (typeof payload.membership.sponsorship_required === "boolean") {
      patch.sponsorship_required = payload.membership.sponsorship_required;
    }
  }

  const { data: existing } = await supabase
    .from("organization_settings")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("organization_settings")
      .update(patch)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("organization_settings")
      .insert({ organization_id: organizationId, ...DEFAULTS, ...patch });
    if (error) throw new Error(error.message);
  }

  return getSettings(supabase, organizationId);
}
