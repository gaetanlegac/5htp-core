/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import dayjs from 'dayjs';
import deepmerge from 'deepmerge';

// Libs métier
import Graphique, { Point } from '../../';
import { CalquesAvecOpts } from '../../../workspace';
import Canvas from '../../../canvas';
import Echelle, { multipleLePlusProche } from '../../Echelle';
import Axe, { TOptionsAxe, TMarqueur } from './base';

/*----------------------------------
- TYPES
----------------------------------*/

export type TOptionsAxeX = TOptionsAxe & {}

/*----------------------------------
- GRAPHIQUE
----------------------------------*/
export default class AxeX<TOptions extends TOptionsAxeX> extends Axe<TOptions> {
    
    public axe: 'x' = 'x';
    public axeI: 'y' = 'y';

    public pointA: Point | undefined;
    public intervalleA: [TMarqueur, TMarqueur] | undefined;

    public constructor(
        options: Partial<TOptions>,
        root: Canvas, parent: Graphique, enfants?: CalquesAvecOpts
    ) {

        super(options, root, parent, enfants);

        this.axeInverse = this.root.enfants.axeY;
        
    }

    protected getConfigDefaut(): Partial<TOptions> {
        return deepmerge(super.getConfigDefaut(), {
            
            format: (time: number) => dayjs(time).format('HH:mm'),

            labels: {
                dims: {
                    alignX: 'left',
                    alignY: 'top',
                    y2: '100%',
                },
            }
        })
    }

    public majPositionCurseur(e: MouseEvent): void {

        if (!this.options.interactions.curseur)
            return;

        const posCanvas = this.root.canvas.getBoundingClientRect();
        const x = e.clientX - posCanvas.left;

        const dessinerCurseur = (
            // Plus de points = plus de crosshair. On prend donc en compte le padding pour l'axe x
            x > this.padding.left + this.margin.left
            &&
            x < this.w - this.padding.right - this.margin.right
        );

        this.posCurseur = dessinerCurseur ? x : false;
    }

    public update(): boolean {

        this.echelle = this.graph.echelleX//.recardr(this);
        
        super.update();

        return true;

    }

    protected curseur() {

        const posCurseur = this.posCurseur;
        if (posCurseur === false)
            return;

        // Trouve le point le plus proche
        /*const pointSurvole = this.graph.pointsVisibles.reduce((p1, p2) => {
            return Math.abs(p2.x - posCurseur) < Math.abs(p1.x - posCurseur) ? p2 : p1;
        });*/

        // Point le plus proche
        // Le curseur a plus de chances de survoller les derniers points
        // On commence donc par la fin pour faire moins d'itérations
        let deltaA: number | undefined;
        for (let iPoint = this.graph.pointsVisibles.length - 1; iPoint >= 0; iPoint--) {

            const point = this.graph.pointsVisibles[iPoint];
            const delta = Math.abs(point.x - posCurseur)
            
            // Arrête la recherche dés que le delta du point itéré est pire que le point précédent
            if (deltaA !== undefined && delta > deltaA)
                break;

            this.pointA = point;
            deltaA = delta;

        }

        if (this.pointA === undefined)
            return;

        // Label
        this.marqueur(this.pointA.time, this.pointA.x, this.options.crosshairs);

        // Intervalle survolée
        let start: TMarqueur | undefined;
        let end: TMarqueur | undefined;
        for (let iPoint = this.marqueurs.length - 1; iPoint >= 0; iPoint--) {

            const marqueur = this.marqueurs[iPoint]

            if (marqueur.pos > posCurseur)
                end = marqueur;
            else {
                start = marqueur;
                break;
            }

        }

        if (end && !start)
            start = { pos: 0, val: 0 }

        this.intervalleA = start && end ? [start, end] : undefined
    }

    public render(): void {

        for (const { val, pos } of this.marqueurs) {

            this.ligne({ x: pos, y: 0, w: 0, h: '100%' }, this.options.grille);

            this.marqueur(val, pos);
        }
        
        super.render();
    }
}