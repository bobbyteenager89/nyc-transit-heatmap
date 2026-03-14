"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepWork } from "./step-work";
import { StepGym } from "./step-gym";
import { StepSocial } from "./step-social";
import { StepExtras } from "./step-extras";
import type { Destination } from "@/lib/types";

const STEPS = ["Work", "Gym", "Social", "Extras"] as const;
type StepName = (typeof STEPS)[number];

export interface WizardState {
  work: Destination | null;
  gym: Destination | null;
  social: Destination[];
  extras: Destination[];
}

export function WizardShell() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [state, setState] = useState<WizardState>({
    work: null,
    gym: null,
    social: [],
    extras: [],
  });

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleFinish = () => {
    const destinations: Destination[] = [
      ...(state.work ? [state.work] : []),
      ...(state.gym ? [state.gym] : []),
      ...state.social,
      ...state.extras,
    ];
    sessionStorage.setItem(
      "heatmap-setup",
      JSON.stringify({ destinations, modes: ["subway", "bike", "bikeSubway"] })
    );
    router.push("/results");
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const canFinish =
    state.work !== null || state.gym !== null || state.social.length > 0 || state.extras.length > 0;

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex border-b-3 border-red">
        {STEPS.map((step, i) => (
          <button
            key={step}
            onClick={() => setCurrentStep(i)}
            className={`flex-1 py-3 font-display italic uppercase text-sm border-r-3 border-red last:border-r-0 transition-colors ${
              i === currentStep
                ? "bg-red text-pink"
                : i < currentStep
                  ? "bg-red/20 text-red"
                  : "bg-transparent text-red/40"
            }`}
          >
            <span className="block text-xs opacity-70">{i + 1}</span>
            {step}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        {currentStep === 0 && (
          <StepWork
            value={state.work}
            onChange={(work) => setState((s) => ({ ...s, work }))}
          />
        )}
        {currentStep === 1 && (
          <StepGym
            value={state.gym}
            onChange={(gym) => setState((s) => ({ ...s, gym }))}
          />
        )}
        {currentStep === 2 && (
          <StepSocial
            value={state.social}
            onChange={(social) => setState((s) => ({ ...s, social }))}
          />
        )}
        {currentStep === 3 && (
          <StepExtras
            value={state.extras}
            onChange={(extras) => setState((s) => ({ ...s, extras }))}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex border-t-3 border-red">
        <button
          onClick={goBack}
          disabled={currentStep === 0}
          className="flex-1 py-4 font-display italic uppercase text-lg border-r-3 border-red disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red/10 transition-colors"
        >
          Back
        </button>
        {isLastStep ? (
          <button
            onClick={handleFinish}
            disabled={!canFinish}
            className={`flex-1 py-4 font-display italic uppercase text-lg transition-colors ${
              canFinish
                ? "bg-red text-pink hover:bg-red/90"
                : "bg-transparent text-red/30 cursor-not-allowed"
            }`}
          >
            Show Heatmap
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex-1 py-4 font-display italic uppercase text-lg bg-red text-pink hover:bg-red/90 transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
