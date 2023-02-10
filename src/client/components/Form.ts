/*----------------------------------
- DEPENDANCES
----------------------------------*/

// npm
import React from 'react';

// Core
import type { Schema } from '@common/validation';

/*----------------------------------
- TYPES
----------------------------------*/
type TFormOptions<TFormData extends {}> = {
    data?: Partial<TFormData>,
    submit?: (data: TFormData) => Promise<void>
}

type FieldsAttrs<TFormData extends {}> = {
    [fieldName in keyof TFormData]: {}
}

export type Form<TFormData extends {} = {}> = {
    data: TFormData,
    set: (data: Partial<TFormData>) => void,
    submit: (additionnalData?: Partial<TFormData>) => Promise<any>,
    fields: FieldsAttrs<TFormData>,
} & FormState

type FormState = {
    isLoading: boolean,
    errorsCount: number,
    errors: {[fieldName: string]: string[]},
    changed: boolean
}

/*----------------------------------
- HOOK
----------------------------------*/
export default function useForm<TFormData extends {}>( schema: Schema<TFormData>, options: TFormOptions<TFormData> ) {

    /*----------------------------------
    - INIT
    ----------------------------------*/
    const fields = React.useRef<FieldsAttrs<TFormData>>(null);

    const [data, setData] = React.useState<TFormData>( options.data || {} );
    const [state, setState] = React.useState<FormState>({
        isLoading: false,
        errorsCount: 0,
        errors: {},
        changed: false
    });

    // Validate data when it changes
    React.useEffect(() => {
        state.changed && validate(data);
    }, [data]);

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    const validate = (allData: TFormData) => {

        const validated = schema.validate(allData, allData);

        // Update errors
        if (validated.nbErreurs !== state.errorsCount) {
            rebuildFieldsAttrs({ 
                errorsCount: validated.nbErreurs, 
                errors: validated.erreurs,
            });
        }
        
        return validated;
    }

    const submit = (additionnalData: Partial<TFormData> = {}) => {

        const allData = { ...data, ...additionnalData }

        // Validation
        const validated = validate(allData);
        if (validated.nbErreurs !== 0)
            return;

        // Callback
        if (options.submit)
            return options.submit(validated.values);
    }

    const rebuildFieldsAttrs = (newState: Partial<FormState> = {}) => {
        // Force rebuilding the fields definition on the next state change
        fields.current = null; 
        // Force state change
        setState( old => ({ 
            ...old,
            ...newState,
            changed: true
        }));
    }

    // Rebuild the fields attrs when the schema changes
    if (fields.current === null || Object.keys(schema).join(',') !== Object.keys(fields.current).join(',')){
        fields.current = {}
        for (const fieldName in schema.fields) {
            fields.current[fieldName] = {

                // Value control
                value: data[fieldName],
                onChange: (val) => {
                    setState( old => ({ 
                        ...old,
                        changed: true
                    }));
                    setData( old => {
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
                errors: state.errors[ fieldName ],
                required: schema.fields[ fieldName ].options?.opt !== true,
                validator: schema.fields[ fieldName ]
            }
        }
    }

    /*----------------------------------
    - EXPOSE
    ----------------------------------*/

    const form = {
        data,
        set: setData,
        submit,
        fields: fields.current,
        ...state
    }
    
    return [form, fields.current]
}