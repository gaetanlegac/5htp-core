/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Libs métier
import Workspace from './workspace';
import { TOptionsWorkspace, CalquesAvecOpts, Calques } from './workspace';
import * as Mesures from './mesures';

/*----------------------------------
- TYPES
----------------------------------*/

export type TOptionsCanvas = TOptionsWorkspace & {
   
}

/*----------------------------------
- CLASSES
----------------------------------*/
export default class Canvas extends Workspace<TOptionsCanvas> {

    private refCanvas: React.RefObject<HTMLCanvasElement>;
    public canvas!: HTMLCanvasElement;
    public css!: CSSStyleDeclaration;

    public cacheImages: {[url: string]: Promise<HTMLImageElement>} = {}

    private events: {
        [typeEvent: string]: ((e: MouseEvent) => void)[]
    } = {}

    /*----------------------------------
    - INIT
    ----------------------------------*/
    public constructor(
        canvas: React.RefObject<HTMLCanvasElement>, 
        options: Partial<TOptionsCanvas>, 
        enfants: CalquesAvecOpts
    ) {

        super();

        this.nom = 'root';
        this.root = this;
        this.refCanvas = canvas;
        this.majCanvas();

        this.initialiser(options, enfants);

    }

    // Chaque rendu du composantReact créé un nouveau <canvas>
    public majCanvas() {

        if (this.refCanvas.current === null)
            throw new Error(`La référence au <canvas> doit être initialisée.`);

        this.canvas = this.refCanvas.current;
        this.css = getComputedStyle(this.canvas);
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    }

    /*----------------------------------
    - EVENTS
    ----------------------------------*/
    public event( e: MouseEvent ) {
        if (e.type in this.events)
            for (const funcEvent of this.events[ e.type ])
                funcEvent(e);

    }

    public setEvent(type: string, func: (e: MouseEvent) => void) {

        if (!(type in this.events))
            this.events[type] = [func];
        else
            this.events[type].push( func );
    }

    /*----------------------------------
    - RENDU
    ----------------------------------*/
    public update(): boolean {

        this.beforeUpdate();

        // Le canvas doit prendre toute la surface de son conteneur
        const contCanvas = this.canvas.parentElement;
        if (!contCanvas)
            throw new Error(`contCanvas est inaccessible.`);

        const dimsContCanvas = contCanvas.getBoundingClientRect();
        if (dimsContCanvas.width === 0 || dimsContCanvas.height == 0) {
            console.error("Les dimensions de contCanvas sont inutilisables cas width ou/et height = 0.");
            return false;
        }

        this.canvas.setAttribute('width', dimsContCanvas.width + 'px');
        this.canvas.setAttribute('height', dimsContCanvas.height + 'px');

        // Màj des mesures
        const dimsCanvas = this.canvas.getBoundingClientRect();
        this.x = 0;
        this.y = 0;
        this.w = this.x2 = dimsCanvas.width;
        this.h = this.y2 = dimsCanvas.height

        // RAPPEL: Quand les marges sont exprimées en pourcentage, elles dépendant des dimensions du calque
        this.padding = Mesures.marges(this.options.padding, { w: this.w, h: this.h });
        this.margin = Mesures.marges(this.options.margin, { w: this.w, h: this.h });

        this.updateEnfants();

        this.render();

        return true;
    }

    public render() {

        // Reset canvas
        this.ctx.clearRect(-1, -1, this.w + 1, this.h + 1);
        this.ctx.save();

        // Corrections (https://stackoverflow.com/questions/13879322/drawing-a-1px-thick-line-in-canvas-creates-a-2px-thick-line)
        this.ctx.translate(0.5, 0.5)

        super.render();

        if (this.options.afterRender !== undefined)
            this.options.afterRender(this);

        this.ctx.restore();

    }

}