"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type BasketItem = {
  id: string; // unique basket item id
  type: "rental" | "program" | "trainingPackage" | "dropIn";
  facilityId?: string;
  facilityName?: string;
  programId?: string;
  programName?: string;
  start?: string;
  end?: string;
  price: number;
  participantId?: string | null;
  participantName?: string | null;
  // Training package fields
  trainingPackageId?: string;
  trainingPackageName?: string;
  sessionCount?: number;
  // Drop-in fields
  sessionId?: string;
  sessionDate?: string;
};

type BasketContextType = {
  items: BasketItem[];
  addItem: (item: Omit<BasketItem, "id"> & { id?: string }) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  getTotal: () => number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const BasketContext = createContext<BasketContextType | undefined>(undefined);

const BASKET_KEY = "simplyteams_basket";

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(BASKET_KEY);
    if (stored) setItems(JSON.parse(stored));
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(BASKET_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<BasketItem, "id"> & { id?: string }) => {
    const uniqueId =
      item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setItems((prev) => [...prev, { ...item, id: uniqueId }]);
    setIsOpen(true);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clear = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((sum, i) => sum + (i.price || 0), 0);
  };

  return (
    <BasketContext.Provider
      value={{ items, addItem, removeItem, clear, getTotal, isOpen, setIsOpen }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within a BasketProvider");
  return ctx;
}
