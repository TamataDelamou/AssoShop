"use client";

import { useState, useEffect } from "react";
import { membersService } from "@/services/community/members";
import { contributionsService } from "@/services/community/contributions";
import { meetingsService } from "@/services/community/meetings";
import { eventsService } from "@/services/community/events";
import { projectsService } from "@/services/community/projects";
import { socialCasesService } from "@/services/community/socialCases";
import {
  AttendanceStatus,
  Contribution,
  CommunityEvent,
  CommunityProject,
  ContributionStatus,
  Meeting,
  MeetingStatus,
  Member,
  MemberStatus,
  SocialCase,
} from "@/types/modules/community";

export interface EvolutionPoint {
  key: string;
  date: Date;
  count: number;
}

export interface ReportsStats {
  members: {
    total: number;
    active: number;
    pending: number;
    evolution: EvolutionPoint[];
  };
  participation: {
    rate: number;
    completedMeetings: number;
    present: number;
    totalAttendees: number;
  };
  events: {
    upcoming: number;
    past: number;
  };
  finance: {
    contributions: { collected: number; expected: number };
    projects: { raised: number; goal: number };
    socialCases: { collected: number; target: number };
  };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeStats(
  members: Member[],
  contributions: Contribution[],
  meetings: Meeting[],
  events: CommunityEvent[],
  projects: CommunityProject[],
  socialCases: SocialCase[],
): ReportsStats {
  const now = new Date();

  // Effectifs.
  const active = members.filter((m) => m.status === MemberStatus.ACTIVE);
  const pending = members.filter((m) => m.status === MemberStatus.PENDING);

  // Évolution des effectifs sur les 6 derniers mois.
  const evolution: EvolutionPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(date);
    const count = members.filter(
      (m) => m.joined_at && monthKey(new Date(m.joined_at)) === key,
    ).length;
    evolution.push({ key, date, count });
  }

  // Taux de participation (réunions terminées).
  const completed = meetings.filter((m) => m.status === MeetingStatus.COMPLETED);
  let present = 0;
  let totalAttendees = 0;
  for (const meeting of completed) {
    for (const attendee of meeting.attendees) {
      totalAttendees += 1;
      if (attendee.status === AttendanceStatus.PRESENT) present += 1;
    }
  }
  const rate =
    totalAttendees > 0 ? Math.round((present / totalAttendees) * 100) : 0;

  // Bilan financier.
  const contributionsCollected = contributions
    .filter((c) => c.status === ContributionStatus.PAID)
    .reduce((sum, c) => sum + c.amount, 0);
  const contributionsExpected = contributions.reduce(
    (sum, c) => sum + c.amount,
    0,
  );
  const projectsRaised = projects.reduce((s, p) => s + p.raised_amount, 0);
  const projectsGoal = projects.reduce((s, p) => s + p.goal_amount, 0);
  const socialCollected = socialCases.reduce(
    (s, c) => s + c.collected_amount,
    0,
  );
  const socialTarget = socialCases.reduce((s, c) => s + c.target_amount, 0);

  return {
    members: {
      total: members.length,
      active: active.length,
      pending: pending.length,
      evolution,
    },
    participation: {
      rate,
      completedMeetings: completed.length,
      present,
      totalAttendees,
    },
    events: {
      upcoming: events.filter(
        (e) => e.start_at && new Date(e.start_at) >= now,
      ).length,
      past: events.filter((e) => e.start_at && new Date(e.start_at) < now)
        .length,
    },
    finance: {
      contributions: {
        collected: contributionsCollected,
        expected: contributionsExpected,
      },
      projects: { raised: projectsRaised, goal: projectsGoal },
      socialCases: { collected: socialCollected, target: socialTarget },
    },
  };
}

export function useReports(organizationId: string) {
  const [stats, setStats] = useState<ReportsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [members, contributions, meetings, events, projects, socialCases] =
          await Promise.all([
            membersService.getMembers(organizationId),
            contributionsService.getContributions(organizationId),
            meetingsService.getMeetings(organizationId),
            eventsService.getEvents(organizationId),
            projectsService.getProjects(organizationId),
            socialCasesService.getSocialCases(organizationId),
          ]);
        if (!cancelled) {
          setStats(
            computeStats(
              members,
              contributions,
              meetings,
              events,
              projects,
              socialCases,
            ),
          );
        }
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return { stats, loading, error };
}
