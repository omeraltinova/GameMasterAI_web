import { NextRequest } from "next/server";
import { POST as rollPost } from "../roll/route";

type RollAttackBody = {
  purpose?: string;
  weaponName?: string;
  targetName?: string;
  [key: string]: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as RollAttackBody;
  const weaponName =
    typeof body.weaponName === "string" && body.weaponName.trim().length > 0
      ? body.weaponName.trim()
      : "Silah";
  const targetName =
    typeof body.targetName === "string" && body.targetName.trim().length > 0
      ? body.targetName.trim()
      : null;

  const defaultPurpose = targetName
    ? `${weaponName} ile ${targetName} saldırı atışı`
    : `${weaponName} saldırı atışı`;
  const purpose =
    typeof body.purpose === "string" && body.purpose.trim().length > 0
      ? body.purpose.trim()
      : defaultPurpose;

  const forwardedReq = new NextRequest(new URL("/api/dice/roll", req.url), {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({
      ...body,
      diceType: "d20",
      count: 1,
      purpose,
    }),
  });

  return rollPost(forwardedReq);
}
