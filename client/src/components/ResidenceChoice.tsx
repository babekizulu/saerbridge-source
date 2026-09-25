import { useId } from 'react';
import { FiHome } from 'react-icons/fi';
import { LuBuilding2, LuHousePlus } from 'react-icons/lu';
import { MdApartment } from 'react-icons/md';
import InfoTip from './InfoTip';

export type ResidenceType = 'informal-settlement' | 'apartment' | 'condo' | 'house';

const options: { id: ResidenceType; label: string; Icon: typeof FiHome }[] = [
    { id: 'informal-settlement', label: 'Informal settlement', Icon: LuHousePlus },
    { id: 'apartment', label: 'Apartment', Icon: MdApartment },
    { id: 'condo', label: 'Condo', Icon: LuBuilding2 },
    { id: 'house', label: 'House', Icon: FiHome },
];

type ResidenceChoiceProps = {
    value: ResidenceType | null;
    onChange: (next: ResidenceType | null) => void;
};

function ResidenceChoice({ value, onChange }: ResidenceChoiceProps) {
    const groupName = useId();

    return (
        <section className='planner-card residence-card' aria-labelledby='residence-heading'>
            <div className='planner-card-heading'>
                <h2 id='residence-heading'><FiHome aria-hidden='true' /> Residence</h2>
                <div className='residence-tools'>
                    {value ? (
                        <button type='button' className='tool-btn' onClick={() => onChange(null)}>
                            Clear
                        </button>
                    ) : null}
                    <InfoTip label='About residence type'>
                        Optional. Choose the kind of home you are planning. Informal settlement describes the site and how the dwelling can be improved in stages. It does not describe the household.
                    </InfoTip>
                </div>
            </div>
            <fieldset className='residence-options'>
                <legend className='visually-hidden'>Residence type</legend>
                {options.map((option) => {
                    const Icon = option.Icon;
                    const selected = value === option.id;
                    return (
                        <label key={option.id} className={selected ? 'residence-option is-selected' : 'residence-option'}>
                            <input
                                type='radio'
                                name={groupName}
                                value={option.id}
                                checked={selected}
                                onChange={() => onChange(option.id)}
                            />
                            <Icon aria-hidden='true' />
                            <span>{option.label}</span>
                        </label>
                    );
                })}
            </fieldset>
        </section>
    );
}

export default ResidenceChoice;
