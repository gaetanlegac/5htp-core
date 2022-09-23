/*----------------------------------
- DEPENDANCES
----------------------------------*/
import React from 'react';
import Calendar from 'react-calendar'
//import 'react-calendar/dist/Calendar.css';

import Champ from '../Base';
import Popover from '@client/components/Conteneurs/Popover';

// Styles
import './index.less';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = [Date | null, Date | null]
const valeurDefaut = [null, null] as TValeur;
type TValeurDefaut = typeof valeurDefaut;
type TValeurOut = string;

export type Props = {
    valeur: TValeur,
    as: [string, string]
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
const InputDate = ({ valeur, onChange, min, max, ...props }: {
    valeur: Date | null,
    onChange: (valeur: Date) => void,

    className?: string,
    min?: string,
    max?: string
}) => {

    const maintenant = new Date();

    const [afficher, setAfficher] = React.useState(false);

    const inputs = {
        jour: null,
        mois: null,
        annee: null
    };

    const propsInput = {
        onFocus: () => setAfficher(true)
    }

    if (typeof valeur === 'string')
        valeur = new Date(valeur);

    return <>
        <Popover
            afficher={afficher}
            fermer={() => setAfficher(false)}
            interactions
            {...props} 
            className={"bloc input-date" + (className ? ' ' + className : '')} 
            content={(
                <Calendar
                    minDate={min ? new Date(min) : maintenant}
                    maxDate={max ? new Date(max) : undefined}
                    value={valeur}
                    showDoubleView={false}
                    onChange={(val: Date) => {
                        setAfficher(false);
                        onChange(val);
                    }}
                />
            )}
        >
            <input type="number" min="1" max="31"
                className="jour input-transparent" placeholder="--"
                value={valeur ? valeur.getDate() : undefined}
                ref={(refInputJour) => inputs.jour = refInputJour}
                {...propsInput}
            />

            <span className="sep">/</span>

            <input type="number" min="1" max="12"
                className="mois input-transparent" placeholder="--"
                value={valeur ? valeur.getMonth() : undefined}
                ref={(refInputMois) => inputs.mois = refInputMois}
                {...propsInput}
            />

            <span className="sep">/</span>

            <input type="number" min={maintenant.getYear()} max
                className="annee input-transparent" placeholder="----"
                value={valeur ? valeur.getFullYear() : undefined}
                ref={(refInputAnnee) => inputs.annee = refInputAnnee}
                {...propsInput}
            />
        </Popover>
    </>
}

export default Champ<Props, TValeurDefaut, TValeurOut>('periode', { valeurDefaut, saisieManuelle: false }, ({
    
}, { valeur, state, setState }, rendre) => {

    return rendre((
        <div className="champ periode groupeChamps">
            <InputDate 
                valeur={valeur[0]} 
                className="full" 
                // TODO: Si date fin inférieure à date debut, date fin = date debut + intervalle min
                onChange={(date: Date) => setState({ valeur: [ date, valeur[1] ]})}

                max={valeur[1]}
            />

            <i src="solid/long-arrow-right" />

            <InputDate 
                valeur={valeur[1]} 
                className="full" 
                // TODO: Si date début supérieure à date fin, date debut = date fin - intervalle min
                onChange={(date: Date) => setState({ valeur: [ valeur[0], date ]})}

                min={valeur[0]}
            />
        </div>
    ), {  });
})