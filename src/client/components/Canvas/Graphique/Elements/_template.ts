/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs métier
import Graphique from '../';
import Calque, { CalquesAvecOpts, TOptionsCalque } from '../../calque';
import Canvas from '../../canvas';

/*----------------------------------
- TYPES
----------------------------------*/

export type TOptionsCandleStick = TOptionsCalque & {}

/*----------------------------------
- GRAPHIQUE
----------------------------------*/
export default class CandleStick<TOptions extends TOptionsCandleStick> extends Calque<TOptions, Graphique> {

    public constructor(
        options: Partial<TOptionsCandleStick>,
        root: Canvas, parent: Graphique, enfants?: CalquesAvecOpts
    ) {

        super(options, root, parent, enfants);
        
    }

    public update(): void {
        super.update();

    }

    public render(): void {
        super.render();

        
    }
}