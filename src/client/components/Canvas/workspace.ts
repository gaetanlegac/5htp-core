/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import deepmerge from 'deepmerge';

// Libs métier
import Canvas from './canvas';
import Calque from './calque';
import * as Mesures from './mesures';

/*----------------------------------
- TYPES OPTIONS CALQUE
----------------------------------*/
export type TOptionsWorkspace<TData extends TObjetDonnees = {}> = Mesures.TDimsSaisie & {

    nom: string,

    color: string,
    fontSize: number,

    mode: 'row' | 'col',
    gap: number,

    data?: TData,
    debug?: true,
    renderOrder?: string[],
    
    // Events
    afterRender?: (canvas: Canvas) => void
}

// ClasseCalque, OptionsCalque, options classe, enfants?
export type CalqueAvecOpts<TCalque extends typeof Calque> = [TCalque, ConstructorParameters<TCalque>[0], CalquesAvecOpts?];

// TODO: Infusion type calque passé
export type CalquesAvecOpts = { [nomCalque: string]: CalqueAvecOpts<typeof Calque> }

export type Calques = { [nomCalque: string]: Calque }

/*----------------------------------
- CLASSE
----------------------------------*/
export default class Workspace<TOptions extends TOptionsWorkspace = TOptionsWorkspace> {

    public nom!: string;
    public data!: Required<TOptions["data"]>;
    public options!: Omit<TOptions, 'data'>;
    public ctx!: CanvasRenderingContext2D;

    public root!: Canvas;

    public x!: number;
    public y!: number;
    public x2!: number;
    public y2!: number;
    public w!: number;
    public h!: number;

    public padding!: Mesures.TMarges;
    public margin!: Mesures.TMarges;

    public enfants: Calques = {};
    public xA: number = 0;
    public yA: number = 0;

    /*----------------------------------
    - INIT
    ----------------------------------*/
    public constructor() {

        

    }

    protected initialiser(options: Partial<TOptions>, enfants?: CalquesAvecOpts) {

        this.setOptions(options);

        if (enfants !== undefined)
            this.initEnfants(enfants);

        this.initEvents();
    }

    public static optionsDefaut: Partial<TOptionsWorkspace> = {
        color: '#000',
        fontSize: 12,

        //mode: 'col',
        gap: 0
    }

    public setOptions({ data, ...nouvellesOptions }: Partial<TOptions>): void {
        const configPersonnalisee = this.getConfigDefaut();
        this.data = data;
        this.options = deepmerge(configPersonnalisee, nouvellesOptions)
    }

    protected getConfigDefaut(): Partial<TOptions> {
        return { ...Workspace.optionsDefaut } as Partial<TOptions>;
    }

    protected initEnfants(enfants: CalquesAvecOpts): void {
        // Initialisation des calques enfants
        this.enfants = {};
        for (const idCalque in enfants) {
            const [ClasseCalque, optionsCalque, enfantsCalque] = enfants[idCalque];
            this.enfants[idCalque] = new ClasseCalque({ 
                ...optionsCalque, 
                nom: idCalque 
            }, this.root, this, enfantsCalque);
        }
    }

    protected initEvents(): void {

    }

    /*----------------------------------
    - MESURES
    ----------------------------------*/
    protected beforeUpdate(): boolean {

        this.xA = this.yA = 0;

        return true;

    }

    protected updateEnfants() {

        for (const nomCalque in this.enfants)
            this.enfants[nomCalque].update();

    }

    /*----------------------------------
    - RENDU
    ----------------------------------*/
    public render() {

        const renderOrder = this.options.renderOrder || Object.keys(this.enfants);

        for (const nomCalque of renderOrder) {

            this.enfants[nomCalque].render();

            const afterRender = this.enfants[nomCalque].options.afterRender;
            if (afterRender !== undefined)
                afterRender(this.enfants[nomCalque]);
        }
    }
}