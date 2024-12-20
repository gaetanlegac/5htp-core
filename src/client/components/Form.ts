/*----------------------------------
- DEPENDANCES
----------------------------------*/

// npm
import React from 'react';

// Core
import { InputErrorSchema } from '@common/errors';
import type { Schema } from '@common/validation';
import type { TValidationResult } from '@common/validation/schema';
import useContext from '@/client/context';

// Exports
export type { TValidationResult, TSchemaData } from '@common/validation/schema';

/*----------------------------------
- TYPES
----------------------------------*/
export type TFormOptions<TFormData extends {}> = {
    data?: Partial<TFormData>,
    submit?: (data: TFormData) => Promise<void>,
    autoValidateOnly?: (keyof TFormData)[],
    autoSave?: {
        id: string
    }
}

export type FieldsAttrs<TFormData extends {}> = {
    [fieldName in keyof TFormData]: {}
}

export type Form<TFormData extends {} = {}> = {
    
    // Data
    fields: FieldsAttrs<TFormData>,
    data: TFormData,
    options: TFormOptions<TFormData>,

    // Actions
    validate: (data: Partial<TFormData>) => TValidationResult<{}>,
    set: (data: Partial<TFormData>) => void,
    submit: (additionnalData?: Partial<TFormData>) => Promise<any>,
    
} & FormState

type FormState = {
    isLoading: boolean,
    hasChanged: boolean,
    errorsCount: number,
    errors: { [fieldName: string]: string[] },
}

/*----------------------------------
- HOOK
----------------------------------*/
export default function useForm<TFormData extends {}>(
    schema: Schema<TFormData>,
    options: TFormOptions<TFormData> = {}
): [ Form, FieldsAttrs<TFormData> ] {

    const context = useContext();

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [state, setState] = React.useState<FormState>({
        hasChanged: options.data !== undefined,
        isLoading: false,
        errorsCount: 0,
        errors: {}
    });

    const initialData: Partial<TFormData> = options.data || {};

    // States
    const fields = React.useRef<FieldsAttrs<TFormData> | null>(null);
    const [data, setData] = React.useState< Partial<TFormData> >(initialData);

    // Validate data when it changes
    React.useEffect(() => {

        // Validate
        validate(data, false);

        // Autosave
        if (options.autoSave !== undefined) {

            if (state.hasChanged)
                saveLocally(data, options.autoSave.id);
            else {
                const autosaved = localStorage.getItem('form.' + options.autoSave.id);
                if (autosaved !== null) {
                    try {
                        console.log('[form] Parse autosaved from json:', autosaved);
                        setData( JSON.parse(autosaved) );
                    } catch (error) {
                        console.error('[form] Failed to decode autosaved data from json:', autosaved);
                    }
                }
            }
        }

    }, [data]);

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    const validate = (allData: Partial<TFormData> = data, validateAll: boolean = true) => {

        const validated = schema.validateWithDetails(allData, allData, {}, {
            // Ignore the fields where the vlaue has not been changed
            //  if the validation was triggered via onChange
            ignoreMissing: !validateAll,
            // The list of fields we should only validate
            only: options.autoValidateOnly
        });

        // Update errors
        if (validated.errorsCount !== state.errorsCount) {
            rebuildFieldsAttrs({
                errorsCount: validated.errorsCount,
                errors: validated.erreurs,
            });
        }

        return validated;
    }

    const submit = async (additionnalData: Partial<TFormData> = {}) => {

        const allData = { ...data, ...additionnalData }

        // Validation
        const validated = validate(allData);
        if (validated.errorsCount !== 0) {
            throw new InputErrorSchema(validated.erreurs);
        }

        // Callback
        let submitResult: any;
        if (options.submit)
            submitResult = await options.submit(allData as TFormData);

        // Reset autosaved data
        if (options.autoSave)
            localStorage.removeItem('form.' + options.autoSave.id);

        // Update state
        setState( current => ({
            ...current,
            hasChanged: false
        }));

        return submitResult;
    }

    const rebuildFieldsAttrs = (newState: Partial<FormState> = {}) => {
        // Force rebuilding the fields definition on the next state change
        fields.current = null;
        // Force state change
        setState(old => ({
            ...old,
            ...newState
        }));
    }

    const saveLocally = (data: Partial<TFormData>, id: string) => {
        console.log('[form] Autosave data for form:', id, ':', data);
        localStorage.setItem('form.' + id, JSON.stringify(data));
    }

    // Rebuild the fields attrs when the schema changes
    if (fields.current === null || Object.keys(schema).join(',') !== Object.keys(fields.current).join(',')) {
        fields.current = {} as FieldsAttrs<TFormData>
        for (const fieldName in schema.fields) {

            const validator = schema.getFieldValidator(fieldName);

            fields.current[fieldName] = {

                // Value control
                value: data[fieldName],
                onChange: (val) => {
                    setData(old => {
                        return {
                            ...old,
                            [fieldName]: typeof val === 'function'
                                ? val(old[fieldName])
                                : val
                        }
                    })

                    setState(current => ({
                        ...current,
                        hasChanged: true
                    }));
                },

                // Submit on press enter
                onKeyDown: e => {
                    if (e.key === 'Enter' || (e.keyCode || e.which) === 13) {
                        submit({ [fieldName]: e.target.value } as Partial<TFormData>);
                    }
                },

                // Error
                errors: state.errors[fieldName],

                // Component attributes
                ...validator.componentAttributes
            }
        }
    }

    /*----------------------------------
    - EXPOSE
    ----------------------------------*/

    const form = {
        fields: fields.current,
        data,
        set: data => {
            setState(current => ({
                ...current,
                hasChanged: true
            }));
            setData(data);
        },
        validate,
        submit,
        options,
        ...state
    }

    return [form, fields.current]
}