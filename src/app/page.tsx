import { cookies } from "next/headers";
import AnalyserClient from "@/components/AnalyserClient";
import { isSaveAvailable } from "@/lib/deployment";
import { AUTH_COOKIE_NAME, isAuthedToken } from "@/lib/authToken";

export default async function Home() {
  const cookieStore = await cookies();
  const isAuthed = await isAuthedToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  return <AnalyserClient saveAvailable={isSaveAvailable()} isAuthed={isAuthed} />;
}
