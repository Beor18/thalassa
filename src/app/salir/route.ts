import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/session";

export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete("thalassa_city");
  return res;
}
