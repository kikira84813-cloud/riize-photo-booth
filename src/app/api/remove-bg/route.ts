export const runtime = "nodejs";

const REMOVE_BG_TIMEOUT_MS = 20000;

export async function POST(request: Request) {
  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "Missing remove.bg API key." }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof Blob)) {
      return Response.json({ error: "Missing image." }, { status: 400 });
    }

    const removeBgForm = new FormData();
    removeBgForm.append("image_file", image, "photo.jpg");
    removeBgForm.append("size", "auto");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REMOVE_BG_TIMEOUT_MS);

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey
      },
      body: removeBgForm,
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return Response.json({ error: "Background removal failed." }, { status: response.status });
    }

    const result = await response.arrayBuffer();

    return new Response(result, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return Response.json({ error: "Background removal failed." }, { status: 500 });
  }
}