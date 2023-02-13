export type TSide = "left"|"top"|"right"|"bottom";

const debug = true;

export type TPosition = ReturnType<typeof corrigerPosition>

export default function corrigerPosition(
    conteneur: HTMLElement,
    popover: HTMLElement,
    absolu: boolean | undefined,
    cote: TSide = "bottom",
    frame?: HTMLElement
) {
    // RAPPEL: L'élement sera positionnée relativement à son conteneur
    //      Tous les calculs ici donnent donc des valeurs relatives au conteneur

    const margeX = 5;
    const margeY = 5;

    const dimsPop = {
        width: popover.offsetWidth,
        height: popover.offsetHeight
    }

    debug && console.log(`[popover] Conteneur =`, conteneur, `Popover =`, popover, `Coté =`, cote);

    if (dimsPop.width === undefined || dimsPop.height === undefined)
        console.error("Unable to get the dimensions of the popover element. Did you pass a react element as content of popover ?");

    /*----------------------------------
    - POSITIONNEMENT INITIAL
    ----------------------------------*/
    let posInit = {
        top: 0,
        left: 0
    };

    // Position & dimensions des élements
    const posCont = conteneur.getBoundingClientRect();

    // Placement
    debug && console.log(`[popover] Placement = ${cote}`, posCont.height, margeY);
    switch (cote) {
        case 'top':
            posInit.top = -dimsPop.height - margeY;
            break;
        case 'bottom':
            posInit.top = posCont.height + margeY;
            break;
        case 'left':
            posInit.left = -dimsPop.width - margeX;
            break;
        case 'right':
            posInit.left = posCont.width + margeX;
            break;
    }

    // Centrage Horizontal
    if (cote === 'top' || cote === 'bottom') {
        debug && console.log(`[popover] Centrage horizontal`);
        posInit.left = posCont.width / 2 - dimsPop.width / 2;
    }
    // Centrage Vertical
    if (cote === 'left' || cote === 'right') {
        debug && console.log(`[popover] Centrage vertical`);
        posInit.top = posCont.height / 2 - dimsPop.height / 2;
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
        top: string,
        left: string,
        bottom: string,
        right: string
    } = {
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto'
    };

    debug && console.log(`[popover] Position initiale =`, posInit, `Frontières =`, frame, '=', frontieres);

    // Extrémité Haut
    if (posCont.top + posInit.top < frontieres.top) {
        posFinale.top = (frontieres.top - posCont.top) + 'px';
        debug && console.log(`[popover] Top: Extremité haut`, posFinale.top);
    // Extrémité Bas
    } else if (posCont.top + posInit.top + dimsPop.height >= frontieres.bottom) {
        posFinale.top = 'auto';
        posFinale.bottom = (posCont.bottom - frontieres.bottom) + 'px';
        debug && console.log(`[popover] Top: Extremité bas`, posFinale.bottom);
    } else {
        posFinale.top = posInit.top + 'px';
        debug && console.log(`[popover] Top: Conservation`, posFinale.top);
    }

    // Extrémité Gauche
    if (posCont.left + posInit.left < frontieres.left) {
        posFinale.left = (frontieres.left - posCont.left) + 'px';
        debug && console.log(`[popover] Left: Extremité gauche`, posFinale.left);
    // Extrémité Droite
    } else if (posCont.left + posInit.left + dimsPop.width >= frontieres.right) {
        posFinale.left = 'auto';
        posFinale.right = (posCont.right - frontieres.right) + 'px';
        debug && console.log(`[popover] Left: Extremité droite`, posFinale.right);
    } else {
        posFinale.left = posInit.left + 'px';
        debug && console.log(`[popover] Left: Conservation`, posFinale.left);
    }

    console.log({ posInit, dimsPop, frontieres }, { posFinale });

    return {
        css: posFinale,
        cote: cote
    };
}
