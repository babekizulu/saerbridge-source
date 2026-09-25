import { useId, useState } from 'react';
import { LuRuler } from 'react-icons/lu';
import {
    draftFromProperty,
    propertyFromDraft,
    validatePropertyDraft,
    type PropertyDimensions as PropertyValue,
    type PropertyDraft,
    type PropertyErrors,
} from '../property';
import InfoTip from './InfoTip';

type PropertyDimensionsProps = {
    value: PropertyValue | null;
    onChange: (next: PropertyValue | null) => void;
};

function isBlank(draft: PropertyDraft) {
    return !draft.widthM.trim() && !draft.lengthM.trim() && !draft.desiredFloorAreaM2.trim() && !draft.notes.trim();
}

function PropertyDimensions({ value, onChange }: PropertyDimensionsProps) {
    const [draft, setDraft] = useState<PropertyDraft>(() => draftFromProperty(value));
    const [saved, setSaved] = useState(() => JSON.stringify(value));
    const incoming = JSON.stringify(value);
    if (incoming !== saved) {
        setSaved(incoming);
        setDraft(draftFromProperty(value));
    }
    const [errors, setErrors] = useState<PropertyErrors>({});
    const widthId = useId();
    const lengthId = useId();
    const areaId = useId();
    const notesId = useId();

    const commit = (nextDraft: PropertyDraft) => {
        if (isBlank(nextDraft)) {
            setErrors({});
            if (value) onChange(null);
            return;
        }
        const nextErrors = validatePropertyDraft(nextDraft);
        if (nextErrors.form) delete nextErrors.form;
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        const next = propertyFromDraft(nextDraft);
        if (!next) return;
        onChange(next);
    };

    const update = (key: keyof PropertyDraft, next: string) => {
        setDraft((current) => ({ ...current, [key]: next }));
    };

    return (
        <section className='planner-card' aria-labelledby='property-card-heading' onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) commit(draft);
        }}>
            <div className='planner-card-heading'>
                <h2 id='property-card-heading'><LuRuler aria-hidden='true' /> Property dimensions</h2>
                <InfoTip label='About property dimensions'>
                    Optional planning measurements in metres. They are not a survey. Plot width times plot length is the plot area, not the dwelling, unless the home is meant to cover the whole plot. Enter the desired dwelling area separately. The card saves when you leave it.
                </InfoTip>
            </div>
            <div className='planner-card-fields'>
                <label htmlFor={widthId}>
                    Plot width (m)
                    <input id={widthId} inputMode='decimal' value={draft.widthM} placeholder='8' aria-invalid={errors.widthM ? true : undefined} aria-describedby={errors.widthM ? `${widthId}-error` : undefined} onChange={(event) => update('widthM', event.target.value)} />
                </label>
                {errors.widthM ? <p id={`${widthId}-error`} className='property-error'>{errors.widthM}</p> : null}
                <label htmlFor={lengthId}>
                    Plot length (m)
                    <input id={lengthId} inputMode='decimal' value={draft.lengthM} placeholder='12' aria-invalid={errors.lengthM ? true : undefined} aria-describedby={errors.lengthM ? `${lengthId}-error` : undefined} onChange={(event) => update('lengthM', event.target.value)} />
                </label>
                {errors.lengthM ? <p id={`${lengthId}-error`} className='property-error'>{errors.lengthM}</p> : null}
                <label htmlFor={areaId}>
                    Desired dwelling area (m²)
                    <input id={areaId} inputMode='decimal' value={draft.desiredFloorAreaM2} placeholder='72' aria-invalid={errors.desiredFloorAreaM2 ? true : undefined} aria-describedby={errors.desiredFloorAreaM2 ? `${areaId}-error` : undefined} onChange={(event) => update('desiredFloorAreaM2', event.target.value)} />
                </label>
                {errors.desiredFloorAreaM2 ? <p id={`${areaId}-error`} className='property-error'>{errors.desiredFloorAreaM2}</p> : null}
                <label htmlFor={notesId} className='planner-card-notes'>
                    Notes
                    <input id={notesId} value={draft.notes} placeholder='Street access, slope, or yard' aria-invalid={errors.notes ? true : undefined} aria-describedby={errors.notes ? `${notesId}-error` : undefined} onChange={(event) => update('notes', event.target.value)} />
                </label>
                {errors.notes ? <p id={`${notesId}-error`} className='property-error'>{errors.notes}</p> : null}
            </div>
        </section>
    );
}

export default PropertyDimensions;
