"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

type Facility = {
  id: string;
  name: string;
  sport: string;
  facilityType: string;
  minBookingDurationMinutes: number;
  maxBookingDurationMinutes: number;
  openTime: string;
  closeTime: string;
};

type GroupedFacilities = {
  [sport: string]: {
    [type: string]: Facility[];
  };
};

export function FacilityGroups() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/facilities")
      .then((res) => res.json())
      .then((data) => {
        setFacilities(data.facilities || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch facilities:", err);
        setLoading(false);
      });
  }, []);

  // Group facilities by sport and type
  const groupedFacilities = facilities.reduce<GroupedFacilities>(
    (acc, facility) => {
      if (!acc[facility.sport]) {
        acc[facility.sport] = {};
      }
      if (!acc[facility.sport][facility.facilityType]) {
        acc[facility.sport][facility.facilityType] = [];
      }
      acc[facility.sport][facility.facilityType].push(facility);
      return acc;
    },
    {}
  );

  if (loading) {
    return <div>Loading facilities...</div>;
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedFacilities).map(([sport, types]) => (
        <section
          key={sport}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold capitalize">{sport}</h2>
          {Object.entries(types).map(([type, facilities]) => (
            <div
              key={type}
              className="space-y-2"
            >
              <h3 className="text-lg font-semibold capitalize">
                {type.replace(/_/g, " ")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {facilities.map((facility) => (
                  <Card key={facility.id}>
                    <CardHeader>
                      <CardTitle>{facility.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Booking duration: {facility.minBookingDurationMinutes}
                          -{facility.maxBookingDurationMinutes} minutes
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Hours: {facility.openTime || "08:00"} -{" "}
                          {facility.closeTime || "22:00"}
                        </p>
                        <Button
                          className="w-full"
                          onClick={() =>
                            router.push(`/rentals?facility=${facility.id}`)
                          }
                        >
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
