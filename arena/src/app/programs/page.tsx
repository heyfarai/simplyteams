"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBasket } from "@/contexts/BasketContext";

type Program = {
  id: string;
  name: string;
  description: string;
  price: number;
  startDate: string;
  endDate: string;
  facilityId: string;
  facilityName: string;
};

export default function ProgramsPage() {
  const [camps, setCamps] = React.useState<Program[]>([]);
  const [clinics, setClinics] = React.useState<Program[]>([]);
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [loading, setLoading] = React.useState(false);
  const { addItem } = useBasket();

  // Fetch camps and clinics on mount and when date changes
  React.useEffect(() => {
    if (!date) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/programs?type=camp&date=${format(date, "yyyy-MM-dd")}`)
        .then((res) => res.json())
        .then((data) => data.programs || []),
      fetch(`/api/programs?type=clinic&date=${format(date, "yyyy-MM-dd")}`)
        .then((res) => res.json())
        .then((data) => data.programs || []),
    ])
      .then(([campsData, clinicsData]) => {
        setCamps(campsData);
        setClinics(clinicsData);
      })
      .finally(() => setLoading(false));
  }, [date]);

  const handleAddToBasket = (program: Program) => {
    addItem({
      type: "program",
      programId: program.id,
      programName: program.name,
      facilityId: program.facilityId,
      facilityName: program.facilityName,
      start: program.startDate,
      end: program.endDate,
      price: program.price,
    });
  };

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Programs</h1>

      {/* Date Picker */}
      <div className="mb-6">
        <label className="block mb-1 font-medium">Select Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className="w-[280px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto min-w-[320px] p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Camps Section */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Camps</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {loading ? (
            <div className="col-span-2 text-center py-8">
              Loading programs...
            </div>
          ) : camps.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No camps available for this date.
            </div>
          ) : (
            camps.map((program) => (
              <div
                key={program.id}
                className="border rounded-lg p-4 space-y-4"
              >
                <div>
                  <h3 className="font-semibold text-lg">{program.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {program.facilityName}
                  </p>
                </div>
                <p className="text-sm">{program.description}</p>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <div>
                      {format(new Date(program.startDate), "h:mm a")} -{" "}
                      {format(new Date(program.endDate), "h:mm a")}
                    </div>
                    <div className="font-medium">${program.price}</div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleAddToBasket(program)}
                  >
                    Add to Basket
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Clinics Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Clinics</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {loading ? (
            <div className="col-span-2 text-center py-8">
              Loading programs...
            </div>
          ) : clinics.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No clinics available for this date.
            </div>
          ) : (
            clinics.map((program) => (
              <div
                key={program.id}
                className="border rounded-lg p-4 space-y-4"
              >
                <div>
                  <h3 className="font-semibold text-lg">{program.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {program.facilityName}
                  </p>
                </div>
                <p className="text-sm">{program.description}</p>
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <div>
                      {format(new Date(program.startDate), "h:mm a")} -{" "}
                      {format(new Date(program.endDate), "h:mm a")}
                    </div>
                    <div className="font-medium">${program.price}</div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleAddToBasket(program)}
                  >
                    Add to Basket
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
