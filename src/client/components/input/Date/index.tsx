/*----------------------------------
- DEPENDANCES
----------------------------------*/
import React from 'react';
import Champ from '../Base';
import dayjs from 'dayjs';
import Popover from '@client/components/Conteneurs/Popover';
import Calendar from 'react-calendar';

/*----------------------------------
- TYPES
----------------------------------*/
type TValeur = string | Date;
type TValeurDefaut = Date;
type TValeurOut = Date;
const valeurDefaut = undefined;

export type Props = {
    valeur: TValeur,
    placeholder?: string,
    min?: string,
    max?: string
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
import './index.less';
export default Champ<Props, TValeurDefaut, TValeurOut>('date', { valeurDefaut }, ({
    // Spread TOUTES les props dont on a besoin pour éviter les problèmes de référence avec props
    prefixe, className, min, max
}, { state, valeur, setState }, rendre) => {

    const maintenant = new Date;

    /* TODO: onchange saisie input = pas de validation
                 onchange click calendrier = validation immédiate
        */

    const [affCalendrier, setAffCalendrier] = React.useState<boolean>(false);

    const saisieValide = valeur !== undefined && (
        typeof valeur !== 'string' || !isNaN( Date.parse( valeur ) )
    );

    /*----------------------------------
    - CONSTRUCTION CHAMP
    ----------------------------------*/
    if (prefixe === undefined)
        prefixe = <i src="calendar-alt" />;
    
    /*----------------------------------
    - RENDU DU CHAMP
    ----------------------------------*/
    return rendre(<>

        <Popover
            afficher={affCalendrier}
            fermer={() => setAffCalendrier(false)}
            interactions
            //{...props}
            className={"bloc input-date" + (className ? ' ' + className : '')} 
            width={300}
            content={(
                <div>
                    <Calendar
                        minDate={min ? new Date(min) : maintenant}
                        maxDate={max ? new Date(max) : undefined}
                        value={saisieValide ? new Date(valeur) : maintenant}
                        showDoubleView={false}
                        onChange={(val: Date) => {
                            setAffCalendrier(false)
                            setState({ valeur: val });
                        }}
                    />
                </div>
            )}
        >
            <input
                className="champ"
                value={saisieValide ? dayjs(valeur).format('DD/MM/YYYY') : valeur}
                onChange={(e) => setState({ valeur: e.target.value })}
                onFocus={() => setAffCalendrier(true)}
                placeholder='DD/MM/YYYY'
                readOnly
            />
        </Popover>

    </>, { prefixe }); // Les propétés modifiées sont passées ici
})
