/*----------------------------------
- DEPENDANCES
----------------------------------*/
// Npm
import React from 'react';

// Libs métier
import Canvas, { TOptionsCanvas } from './canvas';
import { CalquesAvecOpts } from './workspace';

/*----------------------------------
- TYPES
----------------------------------*/

/*----------------------------------
- HOOK
----------------------------------*/
const debug = true;

export default (
    calques: CalquesAvecOpts,
    options: TOptionsCanvas
) => {

    let workspace = React.useRef<Canvas | null>(null);
    let refCanvas = React.useRef<HTMLCanvasElement | null>(null);

    // Redimensionnement
    React.useEffect(() => {

        //const majDims = () => workspace.current?.majDimensions();
        const majDims = () => workspace.current?.update();

        majDims();

        if (window)
            window.addEventListener('resize', majDims);

        return () => window && window.removeEventListener('resize', majDims);


    }, []);

    // Instanciation Canvas
    React.useEffect(() => {

        // On ne créé définitivement qu'une seule instance 
        if (workspace.current === null && refCanvas.current !== null) {

            workspace.current = new Canvas(refCanvas, options || {}, calques);

        }

        // Détection changement config enfants
        if (workspace.current !== null) {
            for (const nomCalque in calques) {

                const nouvelleConfig = calques[nomCalque][1];
                workspace.current.enfants[nomCalque].setOptions(nouvelleConfig);

            }

            debug && console.log(`[canvas] Update config calques`);

            workspace.current?.update();

        }

    }, [calques]);

    const attributs: React.HTMLProps<HTMLCanvasElement> = {
        ref: refCanvas,
        onMouseMove: (e) => workspace.current?.event(e),
        onMouseDown: (e) => workspace.current?.event(e),
        onWheel: (e) => workspace.current?.event(e),
        onMouseUp: (e) => workspace.current?.event(e),
        onMouseLeave: (e) => workspace.current?.event(e),
    }

    return [workspace, attributs]
}