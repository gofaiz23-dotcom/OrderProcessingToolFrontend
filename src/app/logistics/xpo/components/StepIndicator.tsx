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
    <div className="w-full mb-4 sm:mb-6 lg:mb-8">
      <div className="relative">
        {/* Connector Line - single line behind all steps */}
        <div className="absolute top-4 sm:top-5 left-0 right-0 h-0.5 bg-slate-300 z-0" style={{ left: '5%', right: '5%' }} />
        
        {/* Progress Line - shows completed steps */}
        {currentStep > 1 && (
          <div 
            className="absolute top-4 sm:top-5 h-0.5 bg-green-500 z-0 transition-all"
            style={{
              left: '5%',
              width: `${((currentStep - 1) / (steps.length - 1)) * 90}%`,
            }}
          />
        )}

        {/* Steps - positioned on top with equal spacing */}
        <div className="relative flex items-start justify-between w-full z-10">
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
              <div 
                key={step.id} 
                className="flex flex-col items-center"
                style={{ 
                  flex: '1 1 0%', 
                  minWidth: 0,
                }}
              >
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={handleStepClick}
                  disabled={!onStepClick}
                  className={`relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all ${
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
                    <CheckCircle2 size={16} className="sm:w-5 sm:h-5 text-white" />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold">{step.id}</span>
                  )}
                </button>
                
                {/* Step Name */}
                <div className="mt-1.5 sm:mt-2 text-center">
                  <button
                    type="button"
                    onClick={handleStepClick}
                    disabled={!onStepClick}
                    className={`text-[10px] sm:text-xs lg:text-sm font-semibold transition-colors break-words ${
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

