import type { ProgressStep, ProgressState } from '../progressSteps';

const STATE_LABEL: Record<ProgressState, string> = {
    waiting: 'Waiting',
    active: 'In progress',
    done: 'Completed',
    skipped: 'Not needed',
    failed: 'Unavailable',
};

function GenerationProgress({ steps }: { steps: ProgressStep[] }) {
    return (
        <ol className='generation-progress' aria-label='Design progress'>
            {steps.map((step) => (
                <li key={step.id} data-state={step.state}>
                    <span className='generation-mark' aria-hidden='true' />
                    <span className='generation-label'>{step.label}</span>
                    <span className='generation-state'>{STATE_LABEL[step.state]}</span>
                </li>
            ))}
        </ol>
    );
}

export default GenerationProgress;
