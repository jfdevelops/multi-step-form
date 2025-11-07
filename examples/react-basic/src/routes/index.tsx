import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type StepNumber } from '@/components/ui/multi-step-form/index';
import { StepLayout } from '@/components/ui/multi-step-form/layout';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/')({
  component: App,
});

function App() {
  const [step, setStep] = useState<StepNumber>('step1');

  function incrementStep() {
    if (step === 'step1') {
      return setStep('step2');
    }

    if (step === 'step2') {
      return setStep('step3');
    }

    throw new Error("Can't continue, on the last step");
  }

  function decrementStep() {
    setStep((step) => {
      if (step === 'step3') {
        return 'step2';
      }

      if (step === 'step2') {
        return 'step1';
      }

      return 'step1';
    });
  }

  return (
    <div className='size-full flex justify-center items-center'>
      <Card className='w-1/2'>
        <CardHeader>
          <CardTitle>Basic form example</CardTitle>
          <CardDescription>A basic multi step form example</CardDescription>
        </CardHeader>
        <CardContent>
          <StepLayout currentStep={step} />
        </CardContent>
        <CardFooter className='gap-x-4 self-end'>
          <Button
            variant='outline'
            disabled={step === 'step1'}
            onClick={() => {
              if (step !== 'step1') {
                decrementStep();
              }
            }}
          >
            Back
          </Button>
          <Button
            type={step === 'step3' ? 'submit' : 'button'}
            onClick={() => {
              if (step !== 'step3') {
                incrementStep();
              }
            }}
          >
            Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
