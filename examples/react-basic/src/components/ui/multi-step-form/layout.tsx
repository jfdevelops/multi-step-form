import { useCurrentStepData, type StepNumber } from '.';
import { Step1, Step2, Step3 } from './steps';

export function StepLayout({
  currentStep: stepNumber,
}: {
  currentStep: StepNumber;
}) {
  const { NoCurrentData, hasData } = useCurrentStepData({
    targetStep: stepNumber,
  });

  if (!hasData) {
    return <NoCurrentData />;
  }

  if (stepNumber === 'step1') {
    return <Step1 />;
  }

  if (stepNumber === 'step2') {
    return <Step2 />;
  }

  if (stepNumber === 'step3') {
    return <Step3 />;
  }

  return <div>TODO</div>;
}
