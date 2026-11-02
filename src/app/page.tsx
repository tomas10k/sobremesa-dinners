import { Home } from "@/components/Home";
import { getPublishedEvents } from "@/lib/events";

// Events change from the admin side, so read them on each request.
export const dynamic = "force-dynamic";

export default async function Page() {
  return <Home events={await getPublishedEvents()} />;
}
