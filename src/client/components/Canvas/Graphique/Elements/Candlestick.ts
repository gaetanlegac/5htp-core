/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import dayjs from 'dayjs';

// Libs générales
import { Formater } from '@/general/commun/libs/economie/convertir';
import { getVariation } from '@commun/donnees/nombres';

// Libs métier
import Graphique, { TOptionsGraph } from '../';
import { CalquesAvecOpts } from '../../workspace';
import Canvas from '../../canvas';

/*----------------------------------
- TYPES
----------------------------------*/

export type TOptionsCandleStick = TOptionsGraph & {
    couleur: { up: string, down: string },
}

/*----------------------------------
- GRAPHIQUE
----------------------------------*/
export default class CandleStick<TOptions extends TOptionsCandleStick = TOptionsCandleStick> extends Graphique<TOptions> {

    public constructor(
        options: Partial<TOptionsCandleStick>,
        root: Canvas, parent: Graphique, enfants?: CalquesAvecOpts
    ) {

        super(options, root, parent, enfants);
        
    }

    protected getConfigDefaut() {
        return {
            ...super.getConfigDefaut(),
            couleur: { up: '#51cdcc', down: '#fe7384' }
        }
    }

    private bougies() {

        for (let iPoint = 0; iPoint < this.pointsVisibles.length; iPoint++) {

            const { open, high, low, close, x } = this.pointsVisibles[iPoint];

            const couleur = close > open 
                ? this.options.couleur.up 
                : this.options.couleur.down;

            // Tige
            const yHigh = this.echelleY.versPixels(high);
            const yLow = this.echelleY.versPixels(low);
            this.ligne({ x, y: yHigh, w: 0, h: yLow - yHigh }, { couleur });

            const yOpen = this.echelleY.versPixels(open);
            const yClose = this.echelleY.versPixels(close);
            const wEsp = (this.options.dims.esp * this.options.dims.w) / 2;

            // Corps
            this.rectangle({
                x: x - this.options.dims.w / 2 + wEsp,
                y: open > close ? yOpen : yClose,

                w: this.options.dims.w - wEsp * 2,
                h: yOpen > yClose ? yOpen - yClose : yClose - yOpen
            }, {
                background: couleur,
                radius: 2
            });
        }
    }

    private ohlcSurvol() {

        const pointA = this.root.enfants.axeX?.pointA;
        if (pointA === undefined) return;

        const variation = getVariation(pointA.close, pointA.open);
        const color = pointA.close > pointA.open 
            ? this.options.couleur.up 
            : this.options.couleur.down;

        const ligne = this.row({ x: 10, y2: '100%', w: '100%' }, {
            color: '--cTxtBase',
            gap: 5,
        });

        if (ligne === false) return;

        const date = dayjs(pointA.time).format('DD/MM/YYYY HH:mm:ss');
        ligne.texte(date);

        // O
        ligne.texte('O');
        ligne.texte(Formater.dollars(pointA.open, 2, true), {}, { color });

        // H
        ligne.texte('H');
        ligne.texte(Formater.dollars(pointA.high, 2, true), {}, { color });

        // L
        ligne.texte('L');
        ligne.texte(Formater.dollars(pointA.low, 2, true), {}, { color });

        // C
        ligne.texte('C');
        ligne.texte(Formater.dollars(pointA.close, 2, true), {}, { color });

        // V
        ligne.texte('V');
        ligne.texte(Formater.dollars(pointA.volume, 2, true), {}, { color });

        // Variation
        ligne.texte('Var');
        ligne.texte(variation.txt, {}, { color });
    }

    public update(): boolean {
        
        const continuer = super.update();
        if (continuer === false) return false;

        return true;

    }

    public render(): void {
        super.render();
    
        this.bougies();

        this.ohlcSurvol();
    }
}