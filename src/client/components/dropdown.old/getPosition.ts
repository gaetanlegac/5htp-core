export type TSide = "left"|"top"|"right"|"bottom";

export type TPosition = {
    css: {
        top: string,
        left: string,
    },
    cote: TSide
}

const debug = true;

export default function corrigerPosition(
    conteneur: HTMLElement,
    popover: HTMLElement | [initialWidth: number, initialHeight: number], // NULL when the popover is not shown for now
    cote: TSide = "bottom",
    frame?: HTMLElement
): TPosition {
    // RAPPEL: L'élement sera positionnée relativement à son conteneur
    //      Tous les calculs ici donnent donc des valeurs relatives au conteneur

    const margeX = 5;
    const margeY = 5;

    const dimsPop = Array.isArray(popover)
        ? {
            width: popover[0],
            height: popover[1]
        }
        : {
            width: popover.offsetWidth,
            height: popover.offsetHeight
        }

    debug && console.log(`[positionnement] Conteneur =`, conteneur, `Popover =`, popover, `Coté =`, cote);

    if (dimsPop.width === undefined || dimsPop.height === undefined)
        console.error(`Impossible de récupérer les dimensions de la popover. popover est-il réelement n élement html, ou alors un composant react ? | dimsPop =`, dimsPop, 'popover =', popover);

    /*----------------------------------
    - POSITIONNEMENT INITIAL
    ----------------------------------*/

    // Position & dimensions des élements
    const posCont = conteneur.getBoundingClientRect();
    let posInit = {
        top: posCont.top,
        left: posCont.left
    }

    // Placement
    switch (cote) {
        case 'top':
            posInit.top += -dimsPop.height - margeY;
            posInit.left += posCont.width / 2 - dimsPop.width / 2;
            break;
        case 'bottom':
            posInit.top += posCont.height + margeY;
            posInit.left += posCont.width / 2 - dimsPop.width / 2;
            break;
        case 'left':
            posInit.left += -dimsPop.width - margeX;
            posInit.top += posCont.height / 2 - dimsPop.height / 2;
            break;
        case 'right':
            posInit.left += posCont.width + margeX;
            posInit.top += posCont.height / 2 - dimsPop.height / 2;
            break;
    }
    
    /*----------------------------------
    - CORRECTION
    ----------------------------------*/
    let frontieres;
    if (frame) { // Via conteneur spécifique
        const posFrame = frame.getBoundingClientRect();
        frontieres = {
            top: Math.max(posFrame.top , 0) + margeY,
            left: Math.max(posFrame.left, 0) + margeX,
            right: Math.min(posFrame.right, window.innerWidth) - margeX,
            bottom: Math.min(posFrame.bottom, window.innerHeight) - margeY
        }
    } else // Via fenêtre
        frontieres = {
            top: margeY,
            left: margeX,
            right: window.innerWidth - margeX,
            bottom: window.innerHeight - margeY
        }

    // Position finale de la popover
    let posFinale: {
        top: number,
        left: number
    } = {
        top: 0,
        left: 0,
    };

    debug && console.log(`[positionnement] Position initiale =`, posInit, `Frontières =`, frame, '=', frontieres);

    // Extrémité Haut
    if (posInit.top < frontieres.top) {
        posFinale.top = frontieres.top;
        debug && console.log(`[positionnement] Top: Extremité haut`, posFinale.top);
    // Extrémité Bas
    } else if (posInit.top + dimsPop.height >= frontieres.bottom) {
        posFinale.top = (frontieres.bottom - dimsPop.height);
        debug && console.log(`[positionnement] Top: Extremité bas`, posFinale.top);
    } else {
        posFinale.top = posInit.top;
        debug && console.log(`[positionnement] Top: Conservation`, posFinale.top);
    }

    // Extrémité Gauche
    if (posInit.left < frontieres.left) {
        posFinale.left = frontieres.left;
        debug && console.log(`[positionnement] Left: Extremité gauche`, posFinale.left);
    // Extrémité Droite
    } else if (posInit.left + dimsPop.width >= frontieres.right) {
        posFinale.left = (frontieres.right - dimsPop.width);
        debug && console.log(`[positionnement] Left: Extremité droite`, posFinale.left);
    } else {
        posFinale.left = posInit.left;
        debug && console.log(`[positionnement] Left: Conservation`, posFinale.left);
    }

    debug && console.log({ posInit, dimsPop, frontieres }, { posFinale });

    return {
        css: {
            left: (posFinale.left + window.pageXOffset) + 'px',
            top: (posFinale.top + window.pageYOffset) + 'px',
        },
        cote: cote
    };
}
