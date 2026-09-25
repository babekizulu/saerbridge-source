export type ProgressState = 'waiting' | 'active' | 'done' | 'skipped' | 'failed';

export type ProgressStep = {
    id: string;
    label: string;
    state: ProgressState;
};

export function initialProgress(mode: 'plan' | 'renovation' = 'plan'): ProgressStep[] {
    if (mode === 'renovation') {
        return [
            { id: 'concept', label: 'Design concept', state: 'waiting' },
            { id: 'suppliers', label: 'Nearby suppliers', state: 'waiting' },
            { id: 'guidance', label: 'Written guidance', state: 'waiting' },
            { id: 'cost', label: 'Cost estimate', state: 'waiting' },
            { id: 'pdf', label: 'Design guidance PDF', state: 'waiting' },
            { id: 'spreadsheet', label: 'Cost CSV', state: 'waiting' },
        ];
    }
    return [
        { id: 'requirements', label: 'Understanding requirements', state: 'waiting' },
        { id: 'geometry', label: 'Solving spatial layout', state: 'waiting' },
        { id: 'quantities', label: 'Calculating material quantities', state: 'waiting' },
        { id: 'suppliers', label: 'Researching suppliers', state: 'waiting' },
        { id: 'cost', label: 'Calculating procurement cost', state: 'waiting' },
        { id: 'blueprint', label: 'Rendering blueprint', state: 'waiting' },
        { id: 'pdf', label: 'Preparing project report', state: 'waiting' },
        { id: 'spreadsheet', label: 'Preparing quantity CSV', state: 'waiting' },
        { id: 'visualisation', label: 'Generating visualisation', state: 'waiting' },
    ];
}
