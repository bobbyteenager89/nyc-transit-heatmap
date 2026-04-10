"use client";

import { useState, useCallback } from "react";
import { StepWork } from "./step-work";
import { StepGym } from "./step-gym";
import { StepSocial } from "./step-social";
import { StepExtras } from "./step-extras";
import type { Destination } from "@/lib/types";

interface WizardShellProps {
  onComplete: (destinations: Destination[]) => void;
}

const STEPS = ["work", "gym", "social", "extras"] as const;
type StepName = (typeof STEPS)[number];

const STEP_LABELS: Record<StepName, string> = {
  work: "Work",
  gym: "Gym",
  social: "Social",
  extras: "Extras",
};

export function WizardShell({ onComplete }: WizardShellProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [work, setWork] = useState<Destination | null>(null);
  const [gym, setGym] = useState<Destination | null>(null);
  const [social, setSocial] = useState<Destination[]>([]);
  const [extras, setExtras] = useState<Destination[]>([]);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      const destinations: Destination[] = [
        ...(work ? [work] : []),
        ...(gym ? [gym] : []),
        ...social,
        ...extras,
      ];
      onComplete(destinations);
    }
  }, [currentStep, work, gym, social, extras, onComplete]);

  const goBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const stepName = STEPS[currentStep];

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="flex border-b-3 border-red">
        {STEPS.map((step, i) => (
          <div
            key={step}
            className={`flex-1 py-3 text-center text-xs uppercase font-bold tracking-widest ${
              i <= currentStep ? "bg-red text-pink" : "text-red/40"
            } ${i < STEPS.length - 1 ? "border-r-3 border-red" : ""}`}
          >
            {STEP_LABELS[step]}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6">
        {stepName === "work" && (
          <StepWork value={work} onChange={setWork} />
        )}
        {stepName === "gym" && (
          <StepGym value={gym} onChange={setGym} />
        )}
        {stepName === "social" && (
          <StepSocial value={social} onChange={setSocial} />
        )}
        {stepName === "extras" && (
          <StepExtras value={extras} onChange={setExtras} />
        )}
      </div>

      {/* Navigation — min-h-[48px] ensures comfortable touch targets */}
      <div className="flex border-t-3 border-red pb-[env(safe-area-inset-bottom)]">
        {currentStep > 0 && (
          <button
            onClick={goBack}
            className="px-6 py-4 min-h-[48px] font-display italic uppercase border-r-3 border-red hover:bg-red hover:text-pink transition-colors cursor-pointer"
          >
            &larr; Back
          </button>
        )}
        <button
          onClick={goNext}
          className="flex-1 py-4 min-h-[48px] font-display italic uppercase bg-red text-pink hover:opacity-90 transition-opacity cursor-pointer text-lg"
        >
          {currentStep < STEPS.length - 1 ? "Next →" : "Show My Heatmap →"}
        </button>
      </div>
    </div>
  );
}
