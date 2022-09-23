/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import deepmerge from 'deepmerge';

// Libs métier
import Graphique from '../../';
import { CalquesAvecOpts } from '../../../workspace';
import Canvas from '../../../canvas';
import Axe, { TOptionsAxe } from './base';

/*----------------------------------
- TYPES
----------------------------------*/

export type TOptionsAxeY = TOptionsAxe & {}

/*----------------------------------
- GRAPHIQUE
----------------------------------*/
export default class AxeY<TOptions extends TOptionsAxeY> extends Axe<TOptions> {

    public axe: 'y' = 'y';
    public axeI: 'x' = 'x';

    public constructor(
        options: Partial<TOptionsAxeY>,
        root: Canvas, parent: Graphique, enfants?: CalquesAvecOpts
    ) {

        super(options, root, parent, enfants);

        this.axeInverse = this.root.enfants.axeX;
        
    }

    protected getConfigDefaut(): Partial<TOptions> {
        return deepmerge( super.getConfigDefaut(), {
            format: (prix: number) => (Math.round(prix * 100) / 100).toFixed(2).toString(),

            labels: {
                dims: {
                    alignX: 'right',
                    alignY: 'middle',
                    x2: '100%',
                }
            }
        });
    }

    public majPositionCurseur(e: MouseEvent): void {

        if (!this.options.interactions.curseur)
            return;

        const posCanvas = this.root.canvas.getBoundingClientRect();
        const y = e.clientY - posCanvas.top;

        const dessinerCurseur = (
            y > this.margin.top
            &&
            y < this.h - this.margin.bottom
        );

        this.posCurseur = dessinerCurseur ? y : false;
    }

    public update(): boolean {

        this.echelle = this.graph.echelleY.recardr(this);
        
        super.update();

        return true;

    }

    protected curseur() {

        if (this.posCurseur === false)
            return;

        const yCalc = this.posCurseur - this.margin.top - this.padding.top;
        this.marqueur( this.echelle.depuisPixels(yCalc), this.posCurseur, this.options.crosshairs);
    }

    public render(): void {

        for (const { val, pos } of this.marqueurs) {

            this.ligne({ x: 0, y: pos, w: '100%', h: 0 }, this.options.grille);

            this.marqueur(val, pos);
        }

        super.render();

        // Label dernièr point
        const pointA = this.graph.pointsVisibles[this.graph.pointsVisibles.length - 1];
        const yClosePointA = this.echelle.versPixels(pointA.close);
        const couleurPointA = pointA.close > pointA.open 
            ? this.graph.options.couleur.up
            : this.graph.options.couleur.down

        this.marqueur(pointA.close, yClosePointA, {
            couleur: couleurPointA
        });
    }
}