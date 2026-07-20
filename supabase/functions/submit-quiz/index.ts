import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const b = await req.json();
    const s = b.session || b;
    const row = {
      id: s.id,
      funnel: s.funnel || "chair-taichi",
      gender: s.gender ?? null,
      ab_test_name: s.ab_test_name ?? null,
      ab_test_variant: s.ab_test_variant ?? null,
      answers: s.answers || {},
      age_band: s.age_band ?? null,
      height_cm: s.height_cm ?? null,
      weight_kg: s.weight_kg ?? null,
      goal_weight_kg: s.goal_weight_kg ?? null,
      bmi: s.bmi ?? null,
      metabolic_age: s.metabolic_age ?? null,
      recommended_track: s.recommended_track ?? null,
      email: s.email ?? null,
      name: s.name ?? null,
      selected_plan: s.selected_plan ?? null,
      status: s.status || "in_progress",
    };
    if (!row.id) {
      return new Response(JSON.stringify({ error: "missing id" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { error } = await db.from("quiz_sessions").upsert(row, {
      onConflict: "id",
    });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, id: row.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
