/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';

// Composants métier
import { useProgressbar, TPropsProgressbar, couleurViaPc } from '../';
import Path from './Path';
import {
    VIEWBOX_WIDTH,
    VIEWBOX_HEIGHT,
    VIEWBOX_HEIGHT_HALF,
    VIEWBOX_CENTER_X,
    VIEWBOX_CENTER_Y,
} from './constants';

/*----------------------------------
- TYPES
----------------------------------*/

type TEtape = {
    val: number,
    label?: string
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default ({
    ratioCercle = 1,
    className, 
    style = {},
    epaisseur = 10,
    rotation,
    etapes,
    taille,

    ...props
}: TPropsProgressbar & {
    rotation?: number,
    ratioCercle: number,
    epaisseur: number,
    etapes?: TEtape[],
    taille?: TComponentSize
}) => {

    const refCont = React.useRef<HTMLDivElement>(null);

    const ecartCouleurs = 50;

    const { val, min, max, couleur1, couleur2, renduTxt } = useProgressbar({
        ecartCouleurs: ecartCouleurs,
        ...props,
        txt: props.txt === undefined ? false : props.txt
    });

    const etapesAvecLabels = etapes && etapes.some((e) => e.label !== undefined);
    const marge = /*etapesAvecLabels ? 15 :*/ 0;

    const pathRadius = VIEWBOX_HEIGHT_HALF - epaisseur / 2 - marge;
    const boundedValue = Math.min(Math.max(val, min), max);
    const pathRatio = (boundedValue - min) / (max - min);

    // A RETESTER
    const pcVersCoord = (pc: number, radius: number) => {
        // http://bl.ocks.org/bycoffe/3404776

        // Par défaut, commence à droite du cercle
        // On fait une rotation de 45deg pour débuter en bas    
        const angle = (pc * (Math.PI * 2)) + (Math.PI * 0.5);

        // Décalage pour arriver au début de la progressbar
        //angle += (1 - ratioCercle) * Math.PI;
        
        const x = VIEWBOX_HEIGHT_HALF + (radius * Math.cos(angle));
        const y = VIEWBOX_HEIGHT_HALF + (radius * Math.sin(angle)); 
        return { x, y }
    }

    const hauteurSvg = Math.min((100 * ratioCercle) + 15, 100);

    React.useEffect(() => {
        if (refCont.current !== null && ratioCercle !== 1) {

            // On centre le label verticallement comme si la progresbar était un cercle parfait
            const elemLabel = refCont.current.querySelector('.label') as HTMLSpanElement;
            if (elemLabel !== null) {

                const contHeight = refCont.current.getBoundingClientRect().height;
                elemLabel.style.top = (contHeight * (1 - ratioCercle)) / 2 + 'px';

            }

        }
    }, []);

    // https://dribbble.com/shots/14120031-Nightlife-venues-searching/attachments/5742877?mode=media
    /*const tRond = 10;

    const makeRond = (pc, radius) => {

        const angle = 180;

        var rad = (angle * Math.PI / 180),
            x = Math.sin(rad) * 10,
            y = Math.cos(rad) * -10,
            mid = (angle > 180) ? 1 : 0,
            shape = 'M 0 0 v -10 A 10 10 1 '
                + mid + ' 1 '
                + x + ' '
                + y + ' z';
        return shape;
    }*/

    return (
        <div className={"progressbar-svg " + (className || '') + (taille ? ' ' + taille : '')} style={style} ref={(ref) => refCont.current = ref}>
            <svg
                className="progressbar"
                style={{

                }}
                viewBox={"0 0 100 " + hauteurSvg}
            >

                <defs>
                    <linearGradient id="degrade">
                        <stop offset="0%" stopColor={couleur1} />
                        <stop offset="100%" stopColor={couleur2} />
                    </linearGradient>
                </defs>

                <Path
                    className="trail"
                    ratioCercle={ratioCercle}
                    ratioRemplissage={ratioCercle}
                    rayon={pathRadius}
                    strokeWidth={epaisseur}
                />

                <Path
                    className="path"
                    ratioCercle={ratioCercle}
                    ratioRemplissage={pathRatio * ratioCercle}
                    rayon={pathRadius}
                    strokeWidth={epaisseur}
                    style={{
                        stroke: 'url(#degrade)'
                    }}
                />

               {/*  <path
                    fill="red"
                    d={makeRond(pathRatio, pathRadius)}
                /> */}

                {etapes && etapes.map((etape) => {

                    const pcEtape = etape.val / (max / 2);

                    const tCran = 3;

                    const baseRayonCran = pathRadius - epaisseur;
                    const coordPoint = pcVersCoord(pcEtape, baseRayonCran);
                    const coordPoint2 = pcVersCoord(pcEtape, baseRayonCran - tCran);
                    const coordLabel = pcVersCoord(pcEtape, baseRayonCran - tCran - 8);

                    //const { couleurTxt } = couleurViaPc(pcEtape, props.couleurs, ecartCouleurs);
                    const couleurTxt = val >= etape.val
                        ? 'var(--cTxtImportant)'
                        : 'var(--cTxtDesc)';

                    return <>
                        <line 
                            x1={coordPoint.x} y1={coordPoint.y} 
                            x2={coordPoint2.x} y2={coordPoint2.y} 
                            className="cran"
                            strokeWidth={0.3}
                            style={{
                                stroke: couleurTxt
                            }}
                        />

                        {etape.label && (
                            <text
                                text-anchor="middle"
                                x={coordLabel.x}
                                y={coordLabel.y}
                                style={{
                                    fill: couleurTxt
                                }}
                            >
                                {etape.label}
                            </text>
                        )}
                    </>
                })}
            </svg>

            {renduTxt && <div className="label col al-center">{renduTxt}</div>}

        </div>
    )
}