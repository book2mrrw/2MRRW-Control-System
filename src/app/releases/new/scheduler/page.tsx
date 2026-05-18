import { redirect } from "next/navigation";

export default function ReleaseSchedulerStepPage() {
  redirect("/releases/new/review");
}
