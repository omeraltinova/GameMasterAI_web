import { NextRequest } from "next/server";
import { POST as rollPost } from "../roll/route";

type RollDamageBody = {
  purpose?: string;
  weaponName?: string;
  targetName?: string;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as RollDamageBody;
  const weaponName =
    typeof body.weaponName === "string" && body.weaponName.trim().length > 0
      ? body.weaponName.trim()
      : "Saldırı";
  const targetName =
    typeof body.targetName === "string" && body.targetName.trim().length > 0
      ? body.targetName.trim()
      : null;

  const defaultPurpose = targetName
    ? `${weaponName} ile ${targetName} hasar atışı`
    : `${weaponName} hasar atışı`;
  const purpose =
    typeof body.purpose === "string" && body.purpose.trim().length > 0
      ? body.purpose.trim()
      : defaultPurpose;

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
