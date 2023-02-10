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
    const [state, setState] = React.useState({
        isLoading: false,
        errorsCount: 0,
        errors: {},
        validated: false
    });

    React.useEffect(() => {
        state.validated && validate(data);
    }, [data]);

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    const validate = (allData: TFormData) => {

        const validated = schema.validate(allData, allData);

        // Update errors
        if (validated.nbErreurs !== state.errorsCount) {
            fields.current = null; // Update the fields definition
            setState( old => ({ 
                ...old,
                errorsCount: validated.nbErreurs, 
                errors: validated.erreurs,
                validated: true
            }));
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

    if (fields.current === null){
        fields.current = {}
        for (const fieldName in schema.fields) {
            fields.current[fieldName] = {

                // Value control
                value: data[fieldName],
                onChange: (val) => setData( old => ({ ...old, [fieldName]: val })),

                // Submit on press enter
                onKeyDown: e => {
                    if (e.key === 'Enter') {
                        submit({ [fieldName]: e.target.value } as Partial<TFormData>);
                    }
                },

                // Error
                errors: state.errors[ fieldName ],
                required: schema.fields[ fieldName ].options?.opt !== true
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