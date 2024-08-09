/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';
import { ComponentChild } from 'preact';

/*----------------------------------
- TYPES
----------------------------------*/

export type TPropsProgressbar = {

    // Valeur
    min?: number,
    val: number,
    max?: number,

    // Animation
    animer?: true | ((pcAnim: number, valActuelle: number, valMax: number) => number),
    pasAnim?: [number, number],
    onFinish?: () => void,

    // Design
    txt?: true | ((val: number, pc: number, couleur: string) => ComponentChild) | string | false,
    couleurs?: [number, number],

    // Props conteneur
    className?: string,
    style?: any
}

/*----------------------------------
- COMPOSANTS
----------------------------------*/
import './index.less';

const hsl = (h: number, s: number = 80, l: number = 70) => `hsl(${Math.floor(h)}, ${s}%, ${l}%)`
export const couleurViaPc = (pc: number, couleurs: [number, number], ecart: number) => {

    return { 
        couleur1: 'var(--cTxtAccent)', 
        couleur2: 'var(--cTxtAccent)',
        couleurTxt: 'var(--cTxtAccent)'
    }
    const [couleurMin, couleurMax] = couleurs;
    const couleur = couleurMin + (pc * (couleurMax - couleurMin));
    const couleur1 = hsl(couleur);
    const couleur2 = hsl(couleur + (pc * ecart));
    const couleurTxt = hsl(couleur, 80, 50);
    return { couleur1, couleur2, couleurTxt }
}

export const useProgressbar = ({
    min = 0, max = 100, val: valBase, txt = true,
    animer = false, pasAnim = [0.1, 7], onFinish,
    couleurs = [0, 120],
    ecartCouleurs = 35
}: TPropsProgressbar & {
    ecartCouleurs: number
}) => {

    // Animation
    const timer = React.useRef();
    const [pcAnim, setPcAnim] = React.useState(0);

    // Fonction d'animation par défaut
    if (animer === true)
        animer = (pcAnimA: number, valActuelle: number) => {
            return valActuelle * (pcAnimA / 100);
        }

    // Changement de valeur = on relance l'animation
    //React.useEffect(() => setPcAnim(0), [valBase]);
    // Màj animation selon pc avancement
    React.useEffect(() => {

        if (!animer || valBase === 0)
            return;

        if (pcAnim < 100) {

            timer.current = requestAnimationFrame(() => setPcAnim((pcAnimA) => {
                const facteurPasAnim = 1 - (pcAnimA / 100);
                const pasAnimA = pasAnim[0] + (facteurPasAnim * (pasAnim[1] - pasAnim[0]));
                const newPcAnim =  pcAnimA + pasAnimA;
                return newPcAnim > 100 ? 100 : newPcAnim;
            }));

            return () => cancelAnimationFrame(timer.current);

        } else if (onFinish !== undefined)
            setTimeout(() => onFinish(), 1000);

    }, [pcAnim, valBase]);

    // Valeur actuelle
    if (valBase > max) valBase = max;
    const val = animer ? animer(pcAnim, valBase, max) : valBase;
    const pcVal = val / max;
    const pc = pcVal * 100;

    // Couleur
    const { couleur1, couleur2, couleurTxt } = couleurViaPc(pcVal, couleurs, ecartCouleurs);

    // Label
    const pcRendu = Math.floor(pc);
    let renduTxt: ComponentChild = null;
    if (txt === true)
        renduTxt = <>
            <span>{Math.floor(val) + ' / ' + max}</span>
            <span>{pcRendu}%</span>
        </>;
    else if (typeof txt === 'function')
        renduTxt = txt(val, pcRendu, couleurTxt);
    else
        renduTxt = txt;

    return {
        val, min, max, pc,
        couleur1, couleur2, couleurTxt,
        renduTxt
    }

}

const repeter = (nb: number, func: (i: number) => ComponentChild) => {
    let rendu: ComponentChild[] = [];
    for (let i = 1; i <= nb; i++)
        rendu.push( func(i) );
    return rendu;
}

export default ({ 
    className, style, 
    etapes,
    ...props 
}: TPropsProgressbar & {
    etapes?: number | true
}) => {

    const { pc, couleur1, couleur2, renduTxt } = useProgressbar({
        ecartCouleurs: 25,
        ...props
    });

    if (etapes === true)
        etapes = props.max || 100;

    return <>
        <div className={"progressbar " + (className || '')} style={style}>

            <div className="rail">
                <div className="progression" style={{
                    width: pc + '%',
                    background: `linear-gradient(
                        to right, 
                        ${couleur1}, 
                        ${couleur2}
                    )`
                }} />
            </div>

            {renduTxt && <div className="label">{renduTxt}</div>}

            {/*etapes !== undefined && repeter(etapes, (etapeA: number) => {
                const pcEtape = (etapeA / etapes) * 100;
                return (
                    <div className="etape" style={{
                        left: pcEtape + '%',
                        backgroundColor: pc >= pcEtape
                            ? couleur2
                            : undefined
                    }} />
                )
            })*/}
        </div>
    </>;
}