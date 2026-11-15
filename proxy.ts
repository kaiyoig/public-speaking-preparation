import { NextResponse, type NextRequest } from "next/server";
import { isSpeakerId, SPEAKER_COOKIE, SPEAKER_COOKIE_MAX_AGE_S } from "@/src/speakerCookie";

/**
 * Gives a browser a Speaker ID on its first visit. The ID is also written
 * into the request, so the page rendering on that first visit already sees it.
 */
export function proxy(request: NextRequest) {
  if (isSpeakerId(request.cookies.get(SPEAKER_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const speakerId = crypto.randomUUID();
  request.cookies.set(SPEAKER_COOKIE, speakerId);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set({
    name: SPEAKER_COOKIE,
    value: speakerId,
    path: "/",
    maxAge: SPEAKER_COOKIE_MAX_AGE_S,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|speeches/|.*\\.(?:png|ico|txt)$).*)"],
};
