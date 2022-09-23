/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs métier
import Canvas from '../canvas';
import Calque, { TOptionsCalque } from '../calque';
import { CalquesAvecOpts } from '../workspace';
import Echelle, { multipleLePlusProche } from './Echelle';

/*----------------------------------
- TYPES
----------------------------------*/
export type OhlcDate = {
    date: string; // Permet la conservation du timezone
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export type OhlcTime = Omit<OhlcDate, 'date'> & { time: number }

export type Point = OhlcTime & {
    x: number
}

export type TOptionsGraph = TOptionsCalque & {

    donnees: OhlcTime[],

    echelleTemps: number, // Nombre de minutes entre deux points
    dims: {
        wMin: number,
        w: number,
        wMax: number,
        esp: number
    },

}

/*----------------------------------
- CALQUE
----------------------------------*/
export default class Graphique<TOptions extends TOptionsGraph = TOptionsGraph> extends Calque<TOptions> {

    // Données
    public pointsVisibles!: Point[];

    public echelleX: Echelle;
    public echelleY: Echelle;

    /*----------------------------------
    - INIT
    ----------------------------------*/
    public constructor(
        options: TOptionsGraph, 
        root: Canvas, parent: Calque, enfants: CalquesAvecOpts
    ) {
        super(options, root, parent, enfants);

        this.echelleX = new Echelle('x', this);
        this.echelleY = new Echelle('y', this);
    }

    protected getConfigDefaut() {
        return {
            ...super.getConfigDefaut(),
            donnees: [],

            echelleTemps: 1 * 60 * 1000, // Nombre de minutes entre deux points
            dims: {
                wMin: 8,
                w: 20, // largeur point + espace
                wMax: 50,
                esp: 0.5 // % de w
            },

            labelsX: [],
            labelsY: [],

        }
    }

    /*----------------------------------
    - CALCULS
    ----------------------------------*/
    public update(): boolean {

        const continuer = super.update();
        if (continuer === false) return false;

        this.updateEchelles();

        return true;
    }

    private updateEchelles() {
        if (this.options.donnees.length < 2)
            return;

        // Si:
        // - Intervalle pas encore initialisée
        // - Déjà cadré sur les deriers points
        if (
            (this.echelleX.calc.min === 0 && this.echelleX.calc.max === 0)
            ||
            this.echelleX.calc.decallage === this.echelleX.calc.decallageMax
        ) {

            const dernierPoint = this.options.donnees[this.options.donnees.length - 1];

            // Nombre de points dépendant de la largeur de l'écran
            const nbPointsAff = Math.floor(this.w / this.options.dims.w);
            const dureeIntervalle = nbPointsAff * this.options.echelleTemps;

            // On affiche les derniers points du graph
            const min = dernierPoint.time - dureeIntervalle;
            const max = dernierPoint.time;

            const decallageMin = -min;
            const decallageMax = (max - min) * 0.33;

            // Cadrage sur les derniers points
            const decallage = decallageMax;

            this.echelleX.update({
                min, max,
                decallageMin, decallageMax,
                decallage
            });

        } else
            this.echelleX.update();

        let yMin: number | undefined, yMax: number | undefined;
        this.pointsVisibles = this.options.donnees
            // Seulement les points actuellement visibles
            .filter(p => p.time >= this.echelleX.min && p.time <= this.echelleX.max)
            // Précalcule la position x de chaque point (évite de recalculer pour dessiner la grille, le curseur, ...)
            .map((point: OhlcTime) => {

                if (yMin === undefined || point.low < yMin)
                    yMin = point.low;
                if (yMax === undefined || point.high > yMax)
                    yMax = point.high;

                return {
                    ...point,
                    x: this.echelleX.versPixels(point.time)
                }
            })

        // Marqueurs Y toujours visibles
        if (this.root.enfants.axeY !== undefined) {
            for (const { valeur } of this.root.enfants.axeY.options.marqueurs) {

                if (yMin === undefined || valeur < yMin)
                    yMin = valeur;
                if (yMax === undefined || valeur > yMax)
                    yMax = valeur;

            }
        }

        this.echelleY.update({ min: yMin, max: yMax });
    }

    public render(): void {
        super.render();
    }
}