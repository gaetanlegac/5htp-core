/*----------------------------------
- DEPENDANCES
----------------------------------*/

// npm
import React from 'react';

// Core
import { InputErrorSchema } from '@common/errors';
import type { Schema } from '@common/validation';
import type { TValidationResult, TValidateOptions } from '@common/validation/schema';
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
    backup?: Partial<TFormData>,

    // Actions
    setBackup: (backup: Partial<TFormData>) => void,
    validate: (data: Partial<TFormData>, validateAll?: boolean) => TValidationResult<{}>,
    set: (data: Partial<TFormData>, merge?: boolean) => void,
    submit: (additionnalData?: Partial<TFormData>) => Promise<any>,
    
} & FormState

type FormState<TFormData extends {} = {}> = {
    isLoading: boolean,
    hasChanged: boolean,
    errorsCount: number,
    errors: { [fieldName: string]: string[] },
    backup?: Partial<TFormData>,
}

/*----------------------------------
- HOOK
----------------------------------*/
export default function useForm<TFormData extends {}>(
    schema: Schema<TFormData>,
    options: TFormOptions<TFormData> = {}
): [ Form<TFormData>, FieldsAttrs<TFormData> ] {

    const context = useContext();

    /*----------------------------------
    - INIT
    ----------------------------------*/

    const [state, setState] = React.useState<FormState<TFormData>>({
        hasChanged: false,//options.data !== undefined,
        isLoading: false,
        errorsCount: 0,
        errors: {},
        backup: undefined
    });

    const initialData: Partial<TFormData> = options.data || {};

    // States
    const fields = React.useRef<FieldsAttrs<TFormData> | null>(null);
    const [data, setData] = React.useState< Partial<TFormData> >(initialData);

    // When typed data changes
    React.useEffect(() => {

        // Validate
        validate(data, { ignoreMissing: true });

        // Autosave
        if (options.autoSave !== undefined && state.hasChanged) {
            saveLocally(data, options.autoSave.id);
        }

    }, [data]);

    // On start
    React.useEffect(() => {

        // Restore backup
        if (options.autoSave !== undefined && !state.hasChanged) {

            const autosaved = localStorage.getItem('form.' + options.autoSave.id);
            if (autosaved !== null) {
                try {
                    console.log('[form] Parse autosaved from json:', autosaved);
                    setState(c => ({
                        ...c,
                        backup: JSON.parse(autosaved)
                    }));
                } catch (error) {
                    console.error('[form] Failed to decode autosaved data from json:', autosaved);
                }
            }
        }

    }, []);

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    const validate = (allData: Partial<TFormData> = data, opts: TValidateOptions<TFormData> = {}) => {

        const validated = schema.validateWithDetails(allData, allData, {}, {
            // Ignore the fields where the vlaue has not been changed
            //  if the validation was triggered via onChange
            ignoreMissing: false,
            // The list of fields we should only validate
            only: options.autoValidateOnly,
            // Custom options
            ...opts
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

    const submit = (additionnalData: Partial<TFormData> = {}) => {

        const allData = { ...data, ...additionnalData }

        // Validation
        const validated = validate(allData);
        if (validated.errorsCount !== 0) {
            throw new InputErrorSchema(validated.erreurs);
        }

        const afterSubmit = (responseData?: any) => {

            // Reset autosaved data
            if (options.autoSave)
                localStorage.removeItem('form.' + options.autoSave.id);
    
            // Update state
            setState( current => ({
                ...current,
                hasChanged: false
            }));

            return responseData;
        }

        // Callback
        if (options.submit)
            return options.submit(allData as TFormData).then(afterSubmit);
        else {
            afterSubmit();
            return undefined;
        }
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

    const form: Form<TFormData> = {

        fields: fields.current,
        data,
        set: (data, merge = true) => {

            setState( current => ({
                ...current,
                hasChanged: true
            }));

            setData( merge 
                ? c => ({ ...c, ...data }) 
                : data
            );
        },

        validate,
        submit,
        options,

        setBackup: (backup: Partial<TFormData>) => {
            
            setState(c => ({ ...c, backup }));

            if (options.autoSave)
                localStorage.setItem('form.' + options.autoSave.id, JSON.stringify(backup));
        },

        ...state
    }

    return [form, fields.current]
}