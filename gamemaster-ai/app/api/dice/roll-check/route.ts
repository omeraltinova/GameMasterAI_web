import { NextRequest } from "next/server";
import { POST as rollPost } from "../roll/route";

type RollCheckBody = {
  purpose?: string;
  skill?: string;
  ability?: string;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as RollCheckBody;
  const skillOrAbility =
    (typeof body.skill === "string" && body.skill.trim()) ||
    (typeof body.ability === "string" && body.ability.trim()) ||
    "Genel Kontrol";

  const purpose =
    typeof body.purpose === "string" && body.purpose.trim().length > 0
      ? body.purpose.trim()
      : `${skillOrAbility} kontrolü`;

  const forwardedReq = new NextRequest(new URL("/api/dice/roll", req.url), {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({
      ...body,
      purpose,
    }),
  });

  return rollPost(forwardedReq);
}
