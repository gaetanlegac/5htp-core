// https://github.com/kevinsqi/react-circular-progressbar/blob/master/src/Path.tsx

import * as React from 'react';
import { VIEWBOX_CENTER_X, VIEWBOX_CENTER_Y, VIEWBOX_HEIGHT_HALF } from './constants';

export default ({
    counterClockwise,
    ratioCercle,
    ratioRemplissage,
    rayon,

    style,

    ...props
}: {
    counterClockwise?: boolean,
    ratioCercle: number,
    ratioRemplissage: number,
    rayon: number,
    
    style?: object,
    
    strokeWidth: number,
    className?: string,
}) => {

    const rotation = counterClockwise ? 1 : 0;

    const diameter = Math.round(Math.PI * 2 * rayon);
    const gapLength = Math.round((1 - ratioRemplissage) * diameter);

    const pcVersCoord = (pc: number, radius: number) => {
        // http://bl.ocks.org/bycoffe/3404776

        // Par défaut, commence à droite du cercle
        // On fait une rotation de 45deg pour débuter en bas
        // RAPPEL: PI = 90° = demi-cercle
        const angle = (pc * (Math.PI * 2)) + (Math.PI * 0.5);

        const x = VIEWBOX_HEIGHT_HALF + (radius * Math.cos(angle));
        const y = VIEWBOX_HEIGHT_HALF + (radius * Math.sin(angle));
        
        return { x, y }
    }

    let d: string;
    
    // Cercle complet, on commence en haut au centre
    if (ratioCercle === 1) {

        d = `
            M ${VIEWBOX_CENTER_X},${VIEWBOX_CENTER_Y - rayon}
            a ${rayon},${rayon} ${rotation} 1 1 0,${2 * rayon}
            a ${rayon},${rayon} ${rotation} 1 1 0,-${2 * rayon}
        `

    // Demi-cercle, on commence en bas au centre
    } else {

        const pcDebut = (1 - ratioCercle) / 2;

        const debutShape = pcVersCoord(pcDebut, rayon);
        const miShape = pcVersCoord(pcDebut + 0.5, rayon);

        d = `
            M ${debutShape.x},${debutShape.y}
            A ${rayon},${rayon} 0 1 1 ${miShape.x},${miShape.y}
            A ${rayon},${rayon} 0 1 1 ${debutShape.x},${debutShape.y}
        `
    }

    return (
        <path
            d={d}

            // Hash remplissage partiel
            style={{
                ...style,
                // Have dash be full diameter, and gap be full diameter
                strokeDasharray: `${diameter}px ${diameter}px`,
                // Shift dash backward by gapLength, so gap starts appearing at correct distance
                strokeDashoffset: `${counterClockwise ? -gapLength : gapLength}px`,
            }}

            fillOpacity={0}
            {...props}
        />
    )
}