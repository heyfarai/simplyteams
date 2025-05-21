"use client";

import { FacilityGroups } from "@/components/FacilityGroups";

export default function Home() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Book a Facility</h1>
      <FacilityGroups />
    </main>
  );
}
