/*----------------------------------
- DEPENDANCES
----------------------------------*/

/*----------------------------------
- TYPES
----------------------------------*/

import Workspace from './workspace';

type TMesureSaisie = number | string;

export type TDimsSaisie = {

    dejaTraite?: boolean, // Indique si les valeurs passées sont déjà dejaTraite ou non

    x?: TMesureSaisie;
    y?: TMesureSaisie;

    x2?: TMesureSaisie;
    y2?: TMesureSaisie;

    padding?: TMarges<TMesureSaisie> | number,
    margin?: TMarges<TMesureSaisie> | number,

    w?: TMesureSaisie;
    h?: TMesureSaisie;

    position?: 'relative' | 'absolute';
    alignX?: 'left' | 'center' | 'middle' | 'right'; // Positionnement selon x
    alignY?: 'top' | 'center' | 'middle' | 'bottom'; // Positionnement selon y
}

export type TDimsFinales = {
    x: number;
    y: number;
    w: number;
    h: number;
    x2: number;
    y2: number;

    margin: TMarges<number>;
    padding: TMarges<number>;

    dejaTraite: true;
}

export type TMarges<TMesureA = number> = {
    top: TMesureA,
    right: TMesureA,
    left: TMesureA,
    bottom: TMesureA
}

/*----------------------------------
- FONCTIONS
----------------------------------*/
export function marges (
    marges: TMarges<TMesureSaisie> | number | undefined, 
    dims: { w: number, h: number }
): TMarges {

    if (marges === undefined)
        return {
            top: 0,
            left: 0,
            bottom: 0,
            right: 0
        };
    else if (typeof marges === 'number')
        return {
            top: marges,
            left: marges,
            bottom: marges,
            right: marges
        }
    else
        return {
            top: mesure(marges.top, dims.h),
            left: mesure(marges.left, dims.w),
            bottom: mesure(marges.bottom, dims.h),
            right: mesure(marges.right, dims.w),
        }

}

type TMesureAvecDetails = { pixels: number, relatif: boolean }
export function mesure(mesure?: TMesureSaisie, reference?: number): number;
export function mesure(mesure: TMesureSaisie | undefined, reference: number | undefined, details: true): TMesureAvecDetails;
export function mesure(mesure?: TMesureSaisie, reference?: number, details?: true): number | TMesureAvecDetails {

    let retour: number;
    let relatif = false;

    if (mesure === undefined)
        retour = 0;
    else if (typeof mesure === 'number')
        retour = mesure;
    else {

        const iMax = mesure.length - 1;
        if (mesure.charAt( iMax ) === '%') {

            if (reference === undefined)
                throw new Error(`Impossible de calculer la mesure en %, car aucune mesure de référence n'est disponible. Update est t-il bien appellé avant le premier render ?`);

            const pc = parseFloat( mesure.substring(0, iMax) );
            retour = (pc / 100) * reference;
            relatif = true;

        } else
            retour = parseFloat(mesure);
    }

    return details === true ? { pixels: retour, relatif } : retour;
}

export function dims( dims: TDimsSaisie, parent: Workspace): TDimsFinales | false {

    // Dimensions
    let { pixels: w, relatif: wRelatif } = mesure(
        dims.w, 
        // Si pas absolu, relatif à l'espace disponible
        dims.position === 'absolute' ? parent.w : parent.w - parent.xA, 
        true
    );
    let { pixels: h, relatif: hRelatif } = mesure(
        dims.h, 
        // Si pas absolu, relatif à l'espace disponible
        dims.position === 'absolute' ? parent.h : parent.h - parent.yA, 
        true
    );

    // Taille via points
    if (dims.x !== undefined && dims.x2 !== undefined)
        w = dims.x2 - dims.x;
    if (dims.y !== undefined && dims.y2 !== undefined)
        h = dims.y2 - dims.y;

    // Marges
    const padding = marges(dims.padding, { w, h });
    const margin = marges(dims.margin, { w, h });

    // Positionnement via right / bottom
    if (dims.y === undefined && dims.y2 !== undefined)
        dims.y = mesure(dims.y2, parent.h) - h - margin.bottom - parent.padding.top - parent.padding.bottom;
    if (dims.x === undefined && dims.x2 !== undefined)
        dims.x = mesure(dims.x2, parent.w) - w - margin.right - parent.padding.left - parent.padding.right;

    // Normalisation positionnement
    let x = mesure(dims.x, parent.w);
    let y = mesure(dims.y, parent.h);

    // Si les mesures n'ont pas déjà été traitées et converties en pixels absolus
    if (dims.dejaTraite !== true) {

        // Alignement relatif au positionnement
        if (dims.alignX === 'center')
            x += w / 2;
        else if (dims.alignX === 'middle')
            x -= w / 2;

        if (dims.alignY === 'center')
            y += h / 2;
        else if (dims.alignY === 'middle')
            y -= h / 2;

        // hauteur relative = marge incluse dans la hauteur
        if (hRelatif) h -= margin.top + margin.bottom;
        if (wRelatif) w -= margin.left + margin.right;

        // Màj de l'espace disponible, relative par defaut
        if (dims.position !== 'absolute') {

            // Positionnement relatif aux élements précédents
            x += parent.xA + margin.left;
            y += parent.yA + margin.top;

            if (parent.options.mode === 'row')
                parent.xA = x + w + (parent.options.gap || 0);
            else if (parent.options.mode === 'col')
                parent.yA = y + h + (parent.options.gap || 0);
        }

        // Dépassement du calque = pas de rendu
        /*if (x > parent.w || y > parent.h)
            return false;
        // Dépassement d'une partie du calque = on coupe
        else if (y + h > parent.h) 
            h = parent.h - y;
        else if (x + w > parent.w)
            w = parent.w - x;*/

        // Positionnement absolu
        x += parent.x + parent.padding.left;
        y += parent.y + parent.padding.top;

    }

    // Calcul dimensions dejaTraite
    return { 
        x, y, w, h, 
        x2: x + w,
        y2: y + h,
        padding, margin,
        dejaTraite: true
    };
}