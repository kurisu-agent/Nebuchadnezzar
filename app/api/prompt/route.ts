import { oneShot } from "./one-shot";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const { prompt, model, systemPrompt } = body as {
    prompt?: string;
    model?: string;
    systemPrompt?: string;
  };

  if (!prompt || !prompt.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    const result = await oneShot({
      prompt: prompt.trim(),
      model,
      systemPrompt,
    });
    return Response.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[prompt api error]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
