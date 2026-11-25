import "server-only";

import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import type { OmnisTaskState } from "@/features/admin/omnis/plan";

export type OmnisExecutionRow = {
  task_key: string;
  phase_key: string;
  phase_order: number;
  task_order: number;
  title: string;
  description: string;
  state: OmnisTaskState;
  commit_sha: string | null;
  tests_summary: string | null;
  last_note: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type OmnisExecutionEvent = {
  id: string;
  task_key: string;
  event_type: string;
  previous_state: string | null;
  next_state: string;
  note: string | null;
  commit_sha: string | null;
  tests_summary: string | null;
  created_at: string;
};

export async function getOmnisExecutionSnapshot(): Promise<{
  available: boolean;
  items: OmnisExecutionRow[];
  events: OmnisExecutionEvent[];
  error: string | null;
}> {
  try {
    const items = await supabaseServerAdminRequest<OmnisExecutionRow[]>(
      "/rest/v1/admin_omnis_execution_ledger?select=task_key,phase_key,phase_order,task_order,title,description,state,commit_sha,tests_summary,last_note,started_at,completed_at,updated_at&order=phase_order.asc,task_order.asc",
      { method: "GET" },
    );
    const events = await supabaseServerAdminRequest<OmnisExecutionEvent[]>(
      "/rest/v1/admin_omnis_execution_events?select=id,task_key,event_type,previous_state,next_state,note,commit_sha,tests_summary,created_at&order=created_at.desc&limit=20",
      { method: "GET" },
    );
    return { available: true, items: items ?? [], events: events ?? [], error: null };
  } catch (error) {
    console.error("[admin/omnis] execution ledger unavailable", error);
    return {
      available: false,
      items: [],
      events: [],
      error: "تعذر قراءة سجل التنفيذ من Supabase. لا يتم عرض أرقام افتراضية أو اعتبار المهام مكتملة.",
    };
  }
}
