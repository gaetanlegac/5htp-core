/*----------------------------------
- DEPENDANCES
----------------------------------*/

// npm
import React from 'react';

// Core
import { InputError } from '@common/errors';
import type { Schema } from '@common/validation';
import type { TValidationResult } from '@common/validation/schema';
import useContext from '@/client/context';

/*----------------------------------
- TYPES
----------------------------------*/
type TFormOptions<TFormData extends {}> = {
    data?: Partial<TFormData>,
    submit?: (data: TFormData) => Promise<void>,
    autoValidateOnly?: (keyof TFormData)[],
    autoSave?: {
        id: string
    }
}

type FieldsAttrs<TFormData extends {}> = {
    [fieldName in keyof TFormData]: {}
}

export type Form<TFormData extends {} = {}> = {
    fields: FieldsAttrs<TFormData>,
    data: TFormData,
    options: TFormOptions<TFormData>,
    validate: (data: TFormData) => TValidationResult<{}>,
    set: (data: Partial<TFormData>) => void,
    submit: (additionnalData?: Partial<TFormData>) => Promise<any>,
} & FormState

type FormState = {
    isLoading: boolean,
    errorsCount: number,
    errors: { [fieldName: string]: string[] },
}

/*----------------------------------
- HOOK
----------------------------------*/
export default function useForm<TFormData extends {}>(
    schema: Schema<TFormData>,
    options: TFormOptions<TFormData>
) {

    const context = useContext();

    /*----------------------------------
    - INIT
    ----------------------------------*/
    let initialData: any;
    if (options.autoSave && typeof window !== 'undefined') {
        const autosaved = localStorage.getItem('form.' + options.autoSave.id);
        if (autosaved !== null) {
            try {
                console.log('[form] Parse autosaved from json:', autosaved);
                initialData = JSON.parse(autosaved);
            } catch (error) {
                console.error('[form] Failed to decode autosaved data from json:', autosaved);
            }
        }
    }
    if (initialData === undefined)
        initialData = options.data || {};

    const fields = React.useRef<FieldsAttrs<TFormData>>(null);
    const [data, setData] = React.useState<TFormData>(initialData);
    const [state, setState] = React.useState<FormState>({
        isLoading: false,
        errorsCount: 0,
        errors: {}
    });

    // Validate data when it changes
    React.useEffect(() => {

        // Validate
        validate(data, false);

        // Autosave
        if (options.autoSave !== undefined)
            saveLocally(data, options.autoSave);

    }, [data]);

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    const validate = (allData: TFormData = data, validateAll: boolean = true) => {

        const validated = schema.validate(allData, allData, {}, {
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
            context.app.handleError(
                new InputError("You have " + validated.errorsCount + " errors in the form.")
            );
            return;
        }

        // Callback
        let submitResult: any;
        if (options.submit)
            submitResult = await options.submit(allData);

        // Reset autosaved data
        if (options.autoSave)
            localStorage.removeItem(options.autoSave.id);

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

    const saveLocally = (data: TFormData, id: string) => {
        console.log('[form] Autosave data for form:', id, ':', data);
        localStorage.setItem('form.' + id, JSON.stringify(data));
    }

    // Rebuild the fields attrs when the schema changes
    if (fields.current === null || Object.keys(schema).join(',') !== Object.keys(fields.current).join(',')) {
        fields.current = {}
        for (const fieldName in schema.fields) {
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
                },

                // Submit on press enter
                onKeyDown: e => {
                    if (e.key === 'Enter') {
                        submit({ [fieldName]: e.target.value } as Partial<TFormData>);
                    }
                },

                // Error
                errors: state.errors[fieldName],
                required: schema.fields[fieldName].options?.opt !== true,
                validator: schema.fields[fieldName]
            }
        }
    }

    /*----------------------------------
    - EXPOSE
    ----------------------------------*/

    const form = {
        fields: fields.current,
        data,
        set: setData,
        validate,
        submit,
        options,
        ...state
    }

    return [form, fields.current]
}