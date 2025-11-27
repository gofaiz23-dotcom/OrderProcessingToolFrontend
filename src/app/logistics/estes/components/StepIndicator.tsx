'use client';

import { CheckCircle2, Circle } from 'lucide-react';

type Step = {
  id: number;
  name: string;
  component: string;
};

type StepIndicatorProps = {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (stepId: number) => void;
};

export const StepIndicator = ({ steps, currentStep, completedSteps, onStepClick }: StepIndicatorProps) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isPast = step.id < currentStep;

          const handleStepClick = () => {
            if (onStepClick) {
              onStepClick(step.id);
            }
          };

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle and Label */}
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center">
                  {/* Step Circle */}
                  <button
                    type="button"
                    onClick={handleStepClick}
                    disabled={!onStepClick}
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      onStepClick ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : 'cursor-default'
                    } ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                        : isCurrent
                        ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                        : 'bg-slate-200 border-slate-300 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={20} className="text-white" />
                    ) : (
                      <span className="text-sm font-bold">{step.id}</span>
                    )}
                  </button>
                </div>
                {/* Step Name */}
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={handleStepClick}
                    disabled={!onStepClick}
                    className={`text-sm font-semibold transition-colors ${
                      onStepClick ? 'cursor-pointer hover:underline' : 'cursor-default'
                    } ${
                      isCompleted
                        ? 'text-green-600 hover:text-green-700'
                        : isCurrent
                        ? 'text-blue-600 hover:text-blue-700'
                        : 'text-slate-400 hover:text-slate-500'
                    }`}
                  >
                    {step.name}
                  </button>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    isPast || isCompleted ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

