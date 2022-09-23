/*----------------------------------
- DEPENDANCES
----------------------------------*/

import Calque from '../calque';

/*----------------------------------
- TYPES
----------------------------------*/
// Permet de passer des pixels à une autre unité, et inversement
type TDonneesCalc = {
    min: number,
    max: number,
    zoom: number,
    decallage: number,
    decallageMin: number,
    decallageMax: number,
}

/*----------------------------------
- OUTILS
----------------------------------*/
// Libs
export const multipleLePlusProche = (nb: number, multiple: number) => Math.ceil(nb / multiple) * multiple

/*----------------------------------
- CLASSE
----------------------------------*/
export default class Echelle {

    public calc: TDonneesCalc = {
        min: 0,
        max: 0,
        zoom: 0,
        decallage: 0,
        decallageMin: 0,
        decallageMax: 0,
    };

    // Calculé
    public min: number = 0; // Temps / Dollars
    public max: number = 0; // Temps / Dollars
    public pas: number = 0; // Temps / Dollars entre chaque ligne de la grille
    public espace: number = 0; // Pixels
    public espacePeriode: number = 0; // Pixels
    public limites: { min: number, max: number } = { min: 0, max: 0 };
    public densite: number = 0;

    public constructor(
        private axe: 'x' | 'y',
        private calque: Calque
    ) {

    }

    public update(calc?: Partial<TDonneesCalc>) {

        if (calc !== undefined)
            this.calc = { ...this.calc, ...calc }

        this.espace = this.axe === 'x' ? this.calque.w : this.calque.h;

        this.min = this.calc.min + this.calc.decallage - this.calc.zoom / 2;
        this.max = this.calc.max + this.calc.decallage + this.calc.zoom / 2;

        // Nombre de secondes par pixel
        this.densite = (this.max - this.min) / this.espace;

        // Limites d'affichage
        /*this.limites = {
            min: this.options.donnees[0].time,
            max: this.options.donnees[this.options.donnees.length - 1].time
        }*/

        // Pas de la grille
        if (this.axe === 'x') {
            this.pas = 10 * (1000 * 60); // 10 Minutes
        } else {
            const lignesMinY = Math.floor(this.espace / 100);
            this.pas = multipleLePlusProche((this.max - this.min) / lignesMinY, 1);
        }

        this.espacePeriode = this.pas / this.densite;

    }

    public versPixels(time: number): number {

        // % relatif à l'intervalle de temps affichée
        let pcEspace = (time - this.min) / (this.max - this.min);

        // NOTE: Sur l'axe des Y, la valeur la plus petite est en bas, donc inversement du %
        if (this.axe === 'y')
            pcEspace = 1 - pcEspace;

        return pcEspace * this.espace;
    }

    public depuisPixels(pixels: number): number {

        // % relatif à l'espace disponible
        let pcTemps = pixels / this.espace;

        //if (this.axe === 'x')
            pcTemps = 1 - pcTemps;

        return this.min + (pcTemps * (this.max - this.min));
    }

    public recardr( calque: Calque ): Echelle {

        // Les dimensions du calque doivent être supérieures à celles du calque sur lequel l'echelle d'origine est basée
        const axe2 = this.axe + '2' as 'x2' | 'y2';
        if (calque[this.axe] > this.calque[this.axe] || calque[axe2] < this.calque[axe2]) {
            const txtCond1 = `${calque.nom}.${this.axe} = ${calque[this.axe]} <= ${this.calque.nom}.${this.axe} = ${this.calque[this.axe]}`
            const txtCond2 = `${calque.nom}.${axe2} = ${calque[axe2]} >= ${this.calque.nom}.${axe2} = ${this.calque[axe2]}`
            throw new Error(`Les dimensions du calque sur lequel l'échelle doit être recadrée doivent être supérieures au calque de référence. Condition non satisfaite: ${txtCond1} && ${txtCond2}`);
        }

        // Prend en compte le décallage etre les deux calques
        const decallageDebut = this.calque[this.axe] - calque[this.axe];
        const decallageTempsDebut = decallageDebut * this.densite;

        const decallageFin = calque[axe2] - this.calque[axe2];
        const decallageTempsFin = decallageFin * this.densite;

        // Retourne la même échelle, mais avec des dimensions différentes
        const echelle = new Echelle(this.axe, calque);

        echelle.update({
            ...this.calc,
            min: this.calc.min - decallageTempsFin,
            max: this.calc.max + decallageTempsDebut,
        });

        return echelle;

    }
}