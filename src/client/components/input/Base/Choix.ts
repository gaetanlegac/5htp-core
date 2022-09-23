import { ComponentChild } from 'preact';
import { Props as TPropsBouton } from '@client/components/button';

export type ChoixTbl = string | {[cle: string]: any};
export type Choix = ChoixTbl[] | {[label: string]: string | number | undefined};

export type Option = Partial<TPropsBouton> & {
    icone?: ComponentChild,
    label?: ComponentChild,
    value: string
}

// Normalise les choix pour Select ou Radio
export default ( choix: Choix ) => {

    // Création des options
    let options: Option[] = [];

    // Tableau de chaines, ou d'objects d'option
    if (Array.isArray(choix)) {
    
        options = choix.map(( elem: ChoixTbl ): Option => {

            // Tableau de chaines
            if (typeof elem === 'string')
                return {
                    label: elem,
                    value: elem
                };

            // Tableau options déjà formatté: { label: xxx, value: xxx }
            else if (!elem.label && !elem.icone)
                throw new Error(`Une icone ou un label doit être défini pour chaque option.`);
            else
                return elem as Option;
        });

    // Label via index
    } else {
        for (const cle in choix)
            options.push({
                label: cle,
                value: choix[cle] as string
            });
    }

    return options;
}
