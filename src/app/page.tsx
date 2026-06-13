import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LandingPageClient from "./landing-page-client";

export default async function Home() {
  const session = await auth();

  if (session) {
    const role = (session.user as Record<string, unknown>).role;
    if (role === "SUPER_ADMIN") {
      redirect("/admin");
    }
    redirect("/dashboard");
  }

  return <LandingPageClient />;
}
