import { FiHome } from 'react-icons/fi';
import { LuBath, LuUtensils, LuWarehouse } from 'react-icons/lu';
import type { SpaceTally as SpaceTallyValue } from '../api/homeDesign';

const rows = [
    { key: 'rooms', label: 'Rooms', Icon: FiHome },
    { key: 'bathrooms', label: 'Bathrooms', Icon: LuBath },
    { key: 'kitchens', label: 'Kitchens', Icon: LuUtensils },
    { key: 'garages', label: 'Garages', Icon: LuWarehouse },
] as const;

function SpaceTally({ tally }: { tally: SpaceTallyValue }) {
    return (
        <section className='space-tally' aria-labelledby='space-tally-heading'>
            <h3 id='space-tally-heading'>Space tally</h3>
            <dl>
                {rows.map(({ key, label, Icon }) => (
                    <div key={key}>
                        <dt>
                            <Icon aria-hidden='true' />
                            {label}
                        </dt>
                        <dd>{tally[key]}</dd>
                    </div>
                ))}
            </dl>
            <p>
                {tally.source === 'plan'
                    ? 'Counted from the floor plan.'
                    : tally.source === 'selection'
                        ? 'Counted from the furniture in the design box.'
                        : 'Estimated from the generated concept.'}
                {' '}This is a planning tally, not a measured survey.
            </p>
        </section>
    );
}

export default SpaceTally;
