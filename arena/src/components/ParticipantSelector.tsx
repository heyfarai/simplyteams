"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type Participant = { id: string; name: string };
export type ProgramBasketItem = {
  id: string;
  programName?: string;
  participantId?: string | null;
  participantName?: string | null;
};

type ParticipantSelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ProgramBasketItem[];
  user: Participant;
  dependents: Participant[];
  onSave: (selections: { [itemId: string]: Participant }) => void;
};

export function ParticipantSelector({
  open,
  onOpenChange,
  items,
  user,
  dependents,
  onSave,
}: ParticipantSelectorProps) {
  const allParticipants = [user, ...dependents];
  const [selections, setSelections] = useState<{ [itemId: string]: string }>(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, item.participantId || user.id])
      )
  );
  const [saving, setSaving] = useState(false);

  const handleSelect = (itemId: string, participantId: string) => {
    setSelections((prev) => ({ ...prev, [itemId]: participantId }));
  };

  const handleSave = () => {
    setSaving(true);
    const result: { [itemId: string]: Participant } = {};
    for (const item of items) {
      const pid = selections[item.id];
      const participant = allParticipants.find((p) => p.id === pid);
      if (participant) result[item.id] = participant;
    }
    onSave(result);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Participant(s)</DialogTitle>
          <DialogDescription>
            Please select a participant for each program in your basket.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="space-y-1"
            >
              <div className="font-medium">{item.programName}</div>
              <select
                className="w-full border rounded px-3 py-2"
                value={selections[item.id]}
                onChange={(e) => handleSelect(item.id, e.target.value)}
              >
                {allParticipants.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-4"
          >
            {saving ? "Saving..." : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
