/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import deepmerge from 'deepmerge';

// Libs métier
import Graphique from '../';
import Calque, { CalquesAvecOpts, TOptionsCalque } from '../../calque';
import Canvas from '../../canvas';

/*----------------------------------
- TYPES
----------------------------------*/

export type TOptionsGrille = TOptionsCalque & {
    grille: TOptsLigne,
}

/*----------------------------------
- GRAPHIQUE
----------------------------------*/
export default class CandleStick<TOptions extends TOptionsGrille> extends Calque<TOptions, Graphique> {

    public constructor(
        options: Partial<TOptionsGrille>,
        root: Canvas, parent: Graphique, enfants?: CalquesAvecOpts
    ) {

        super(options, root, parent, enfants);
        
    }

    /*----------------------------------
    - INIT
    ----------------------------------*/
    protected getConfigDefaut(): Partial<TOptionsGrille> {
        return deepmerge(super.getConfigDefaut(), {
            grille: {
                epaisseur: 1,
                couleur: 'rgba(255, 255, 255, 0.025)'
            },
        });
    }

    /*----------------------------------
    - RENDU
    ----------------------------------*/
    public update(): boolean {

        super.update();

        return true;

    }

    public render(): void {
        super.render();

        for (const { pos } of this.root.enfants.axeX.marqueurs) {

            this.ligne({ x: pos, y: 0, w: 0, h: '100%' }, this.options.grille);
        }
        
    }
}