/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild } from 'preact';

// Libs
import { tempsRelatif } from '@common/data/dates';

/*----------------------------------
- COMPOSANT
----------------------------------*/
type TTemps = string | Date | number;
type TProps = {

    chiffres?: number,

    pause?: boolean,
    onFinished?: () => void

}

const dateVersSecondes = (date?: TTemps) => (date ? new Date(date) : new Date()).valueOf() / 1000

import './index.less';
export const useCompteur = (
    time: TTemps | [TTemps, TTemps], 
    opts: TProps = {}
) => {

    opts = { chiffres: 2, ...opts }

    const timer = React.useRef<number>(null);
    const finished = React.useRef<boolean>(false);

    const [state, setState] = React.useState<{
        tempsTotal: number | undefined,
        tempsRestant: number | undefined
    }>({
        tempsTotal: undefined,
        tempsRestant: undefined
    });

    const stop = () => {

        // Reset compteur
        clearTimeout(timer.current);

        timer.current = null;
    }

    // Changement dates
    React.useEffect(() => {

        //console.log('CHANGEMENT DATE', time);

        stop();

        // Via nombre de secondes
        if (typeof time === 'number' && time < 10000) {

            setState({
                tempsTotal: time,
                tempsRestant: time
            })
            return;

        // Via date(s)
        } else {

            const maintenant = dateVersSecondes();

            // Normalisation time au format [debut, fin]
            let dateDebut: number, dateFin: number;
            if (Array.isArray(time)) {

                dateDebut = dateVersSecondes(time[0]);
                dateFin = dateVersSecondes(time[1]);

            } else {

                dateDebut = maintenant;
                dateFin = dateVersSecondes(time);
            }

            if (dateDebut > dateFin)
                dateDebut = dateFin;
            
            const tempsTotal = Math.round(dateFin - dateDebut);
            const tempsRestant = Math.round(dateFin - maintenant);

            setState({
                tempsTotal: tempsTotal,
                tempsRestant: tempsRestant
            });

        }

    // Quand on passe un tableau, useffect s'execute à chaque rendu, même si time ne change pas ...
    }, [Array.isArray(time) ? time.join() : time]);
    
    // Timer
    React.useEffect(() => {

        if (timer.current !== null || !state.tempsRestant) {
            return;
        }
        
        timer.current = setTimeout(() => {

            if (!opts.pause)
                setState((stateA) => ({
                    ...stateA,
                    tempsRestant: (stateA.tempsRestant as number) - 1
                }));

        }, 1000);

        return () => stop()

    }, [state.tempsRestant, opts.pause]);

    // Pas démarré
    if (state.tempsTotal === undefined) {

        return {
            pc: 0,
            txt: Array(opts.chiffres).fill('--').join(':'),
            secondes: state.tempsRestant
        }
    
    // Temps restant
    } else if (state.tempsTotal !== undefined && state.tempsRestant !== undefined && state.tempsRestant > 0) {

        return {
            pc: (state.tempsTotal - state.tempsRestant) / state.tempsTotal * 100,
            txt: tempsRelatif(state.tempsRestant, 2),
            secondes: state.tempsRestant
        }

    // Fin compteur
    } else {

        stop();

        // On n'execute onFinished qu'une seule fois
        if (finished.current === false) {
            finished.current = true;

            // Callback
            if (opts.onFinished)
                opts.onFinished();
        }

        return {
            pc: 100,
            txt: Array(opts.chiffres).fill('00').join(':'),
            secondes: state.tempsRestant
        };

    }
}

export default ({ 
    time, 
    rendu,
    ...opts 
}: TProps & {
    time: [TTemps, TTemps],
    rendu?: ((txt: string, pc: number, secondes: number) => ComponentChild) | ComponentChild | false,
}) => {

    const { pc, txt, secondes } = useCompteur(time, opts);

    if (rendu === undefined)
        return txt;
    else if (typeof rendu === 'function')
        return rendu(txt, pc, secondes);
    else
        return rendu;
}
