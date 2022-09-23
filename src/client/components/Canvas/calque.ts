/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import Canvas from './canvas';

// Libs métier
import Workspace, { TOptionsWorkspace, CalquesAvecOpts } from './workspace';
import * as Mesures from './mesures';

const logs = false;

/*----------------------------------
- SAISIE OPTIONS
----------------------------------*/
export type TOptsLigne = {
    style?: TStyleLigne,
    epaisseur?: number,
    couleur?: string
}

type TStyleLigne = 'solid' | 'dashed' | 'dotted'

export type TOptionsCalque = TOptionsWorkspace & {
    background?: string,
    border?: TBordure,
}

export type TOptsTexte = {
    fontFamily?: string,
    fontSize?: number,
    fontWeight?: number,
    color?: string,

    padding?: number,
    background?: string,
    radius?: number,
    border?: TBordure,
}

/*----------------------------------
- OPTIONS COMPLÈTES
----------------------------------*/
type TBorduresIndividuelles = {
    top: Partial<TOptsLigne>,
    left: Partial<TOptsLigne>,
    right: Partial<TOptsLigne>,
    bottom: Partial<TOptsLigne>,
}
type TBordure = { all: Partial<TOptsLigne> } | TBorduresIndividuelles;

type TOptionsCalqueFinales = TOptionsWorkspace & {
    background?: string,
    border: TBordure,
}

/*----------------------------------
- CLASSES
----------------------------------*/
export default class Calque<TOptions extends TOptionsCalque = TOptionsCalqueFinales, TParent extends Workspace = Workspace> extends Workspace<TOptions> {

    private couleurDebug: string;
    protected parent: TParent;

    /*----------------------------------
    - INIT
    ----------------------------------*/
    public constructor(
        options: Partial<TOptions>, 
        root: Canvas, parent: TParent, enfants?: CalquesAvecOpts
    ) {

        super();

        this.nom = options.nom || 'calque sans nom';
        this.root = root;
        this.parent = parent;
        this.ctx = parent.ctx;

        logs && console.log(`[calque][${this.nom}] Création`);
        this.couleurDebug = 360 * Math.random() + ', 63%, 46%';

        this.initialiser(options, enfants);
    }

    public setOptions(nouvellesOptions: Partial<TOptions>): void {
        super.setOptions({
            ...nouvellesOptions
        });
    }

    protected color(str: string) {

        // Variable CSS
        if (str[0] + str[1] === '--')
            return this.root.css.getPropertyValue(str);
        // Couleur
        else
            return str;
    }

    /*----------------------------------
    - MESURES
    ----------------------------------*/
    public update(): boolean {

        logs && console.log(`[calque][${this.nom}] Update`);

        const dims = Mesures.dims(this.options, this.parent);
        if (dims === false) return false;

        this.x = dims.x;
        this.y = dims.y;
        this.x2 = dims.x2;
        this.y2 = dims.y2;
        this.w = dims.w;
        this.h = dims.h;

        this.margin = dims.margin;
        this.padding = dims.padding;

        this.updateEnfants();

        return true;

    }   

    /*----------------------------------
    - CREATION CALQUE
    ----------------------------------*/
    // NOTE: On ne définit pas ces fonctions dans la classe Workspace, sinon erreur référence circulaire Calque <=> Workspace
    public calque(dims: Mesures.TDimsSaisie = {}, optsCalque: Partial<TOptionsCalque> = {}): Calque | false {

        const calque = new Calque({
            ...dims,
            ...optsCalque
        }, this.root, this);

        calque.update();
        calque.render();

        return calque;
    }

    public row(dimsInit: Mesures.TDimsSaisie = {}, optsCalque: Partial<TOptionsCalque> = {}): Calque | false {
        return this.calque(dimsInit, { ...optsCalque, mode: 'row' });
    }

    public col(dimsInit: Mesures.TDimsSaisie = {}, optsCalque: Partial<TOptionsCalque> = {}): Calque | false {
        return this.calque(dimsInit, { ...optsCalque, mode: 'col' });
    }

    /*----------------------------------
    - OUTILS DE DESSIN
    ----------------------------------*/
    private appliquerOptsLigne(opts: TOptsLigne = {}): void {

        this.ctx.lineCap = "square";
        this.ctx.strokeStyle = opts.couleur ? this.color(opts.couleur) : '#000';
        this.ctx.lineWidth = opts.epaisseur || 1;

        switch (opts.style || 'solid') {
            case 'solid': this.ctx.setLineDash([]); break;
            case 'dashed': this.ctx.setLineDash([5, 10]); break;
            case 'dotted': this.ctx.setLineDash([this.ctx.lineWidth, this.ctx.lineWidth * 2]); break;
        }
    }

    public ligne(dimsInit: Mesures.TDimsSaisie = {}, opts: TOptsLigne & {
        arrow?: boolean,
        texte?: TOptsTexte & { value: string }
    } = {}): boolean {
        
        const dims = Mesures.dims(dimsInit, this);
        if (dims === false) return false;

        this.appliquerOptsLigne(opts);

        this.ctx.beginPath();
        this.ctx.moveTo(dims.x, dims.y);
        this.ctx.lineTo(dims.x + dims.w, dims.y + dims.h);

        if (opts.arrow) {

            const headlen = 10;

            // https://stackoverflow.com/a/6333775/12199605
            const angle = Math.atan2(dims.y2 - dims.y, dims.x2 - dims.x);
            this.ctx.lineTo( dims.x2 - headlen * Math.cos(angle - Math.PI / 6), dims.y2 - headlen * Math.sin(angle - Math.PI / 6));
            this.ctx.moveTo(dims.x2, dims.y2);
            this.ctx.lineTo( dims.x2 - headlen * Math.cos(angle + Math.PI / 6), dims.y2 - headlen * Math.sin(angle + Math.PI / 6));

        }

        if (opts.texte) {

            this.texte( opts.texte.value , {
                x: dims.x + dims.w / 2 + 10,
                y: dims.y + dims.h / 2 + 10
            }, {
                color: opts.couleur,
                //background: '--cFondPage'
            });

        }

        this.ctx.closePath();
        this.ctx.stroke();

        return true;
    }

    public cercle(dimsInit: Mesures.TDimsSaisie = {}, opts: { background?: string } = {}): boolean {

        const dims = Mesures.dims(dimsInit, this);
        if (dims === false) return false;

        this.ctx.fillStyle = opts.background ? this.color(opts.background) : 'transparent';

        this.ctx.beginPath();
        this.ctx.arc(dims.x, dims.y, dims.w, 0, 2 * Math.PI);
        this.ctx.closePath();

        this.ctx.fill();

        return true;
    }

    public rectangle(dimsInit: Mesures.TDimsSaisie = {}, opts: { 
        background?: string, 
        radius?: number, 
        border?: TBordure 
    } = {}): boolean {

        const dims = Mesures.dims(dimsInit, this);
        
        if (dims === false) return false;

        if (opts.background !== undefined)
            this.ctx.fillStyle = this.color(opts.background);

        // Bordures
        let borduresCompletes: boolean = false;
        if (opts.border !== undefined) {

            if ('all' in opts.border) {

                borduresCompletes = true;

                this.appliquerOptsLigne(opts.border.all);

                // Pour que la bordure soit entièrement visible
                if (opts.border.all.epaisseur !== undefined) {
                    /*dims.x += bordures.epaisseur / 2;
                    dims.y += bordures.epaisseur / 2;*/
                    dims.w -= opts.border.all.epaisseur;
                    dims.h -= opts.border.all.epaisseur;
                }
            } else {

                if (opts.border.top !== undefined)
                    this.ligne({ ...dims, h: 0 }, opts.border.top);

                if (opts.border.bottom !== undefined)
                    this.ligne({ ...dims, h: 0, y: dims.y + dims.h }, opts.border.bottom);

                if (opts.border.left !== undefined)
                    this.ligne({ ...dims, w: 0 }, opts.border.left);

                if (opts.border.right !== undefined)
                    this.ligne({ ...dims, w: 0, x: dims.x + dims.w }, opts.border.right);

            }

        }

        if (opts.background !== undefined || borduresCompletes) {

            // Rectangle simple
            if (opts.radius === undefined) {

                this.ctx.beginPath();
                this.ctx.rect(dims.x, dims.y, dims.w, dims.h);
                this.ctx.closePath();

            // Rectangle arrondi
            } else {

                // Adaptation de l'arrondi si taille point trop petite
                if (dims.w < opts.radius * 2)
                    opts.radius = Math.floor(dims.w / 2);
                else if (dims.h < opts.radius * 2)
                    opts.radius = Math.floor(dims.h / 2);

                // Corps
                this.ctx.beginPath();
                this.ctx.moveTo(dims.x + opts.radius, dims.y);
                this.ctx.lineTo(dims.x + dims.w - opts.radius, dims.y);
                this.ctx.quadraticCurveTo(dims.x + dims.w, dims.y, dims.x + dims.w, dims.y + opts.radius);
                this.ctx.lineTo(dims.x + dims.w, dims.y + dims.h - opts.radius);
                this.ctx.quadraticCurveTo(dims.x + dims.w, dims.y + dims.h, dims.x + dims.w - opts.radius, dims.y + dims.h);
                this.ctx.lineTo(dims.x + opts.radius, dims.y + dims.h);
                this.ctx.quadraticCurveTo(dims.x, dims.y + dims.h, dims.x, dims.y + dims.h - opts.radius);
                this.ctx.lineTo(dims.x, dims.y + opts.radius);
                this.ctx.quadraticCurveTo(dims.x, dims.y, dims.x + opts.radius, dims.y);
                this.ctx.closePath();


            }

            if (opts.background !== undefined)
                this.ctx.fill();

            if (borduresCompletes)
                this.ctx.stroke();

        }
        
        return true;
    }

    public texte(
        texte: string, 
        // Les dimensions doivent être numérique spour pouvoir appliquer le padding
        dimsInit: Omit<Mesures.TDimsSaisie, 'w'|'h'> & { w?: number, h?: number } = {}, 
        optsInit: TOptsTexte = {}
    ): boolean {

        const opts = {
            fontFamily: 'Arial',
            fontSize: this.options.fontSize, // = hauteur de la ligne
            fontWeight: 400,
            color: optsInit.background === undefined ? this.color(this.options.color) : '#fff',
            padding: 0,

            alignX: 'left',
            alignY: 'center',
            ...optsInit
        }

        // Police (on l'applique ici car la largeur du texte dépend de la police)
        this.ctx.font = opts.fontWeight + ' ' + opts.fontSize + 'px ' + opts.fontFamily;

        const hTexte = opts.fontSize * 0.6;
        const wTexte = dimsInit.w = this.ctx.measureText(texte).width;

        // Détermination automatique des dimensions
        if (dimsInit.w === undefined)
            dimsInit.w = wTexte;
        if (dimsInit.h === undefined)
            dimsInit.h = hTexte;

        // On applique le padding avant afin que l'alignement soit ajusté via dims
        dimsInit.w += opts.padding * 2;
        dimsInit.h += opts.padding * 2;

        // Calcul dims réelles
        const dimsRect = Mesures.dims({ ...dimsInit }, this);
        if (dimsRect === false) return false; 

        // Background
        if (opts.background !== undefined || opts.border !== undefined)
            this.rectangle({
                dejaTraite: true,
                x: dimsRect.x,
                y: dimsRect.y,
                w: dimsRect.w,
                h: dimsRect.h,
            }, {
                background: opts.background && this.color(opts.background),
                radius: opts.radius,
                border: opts.border,
            });

        // Couleur
        this.ctx.fillStyle = this.color(opts.color);

        const dimsTxt: Mesures.TDimsFinales = { 
            ...dimsRect,
            // fillText = Positionnement basé sur le bottom
            y: dimsRect.y + hTexte
        };

        // Alignement texte
        if (opts.alignY === 'center')
            dimsTxt.y += dimsRect.h / 2 - hTexte / 2;
        else if (opts.alignY === 'top')
            dimsTxt.y += opts.padding
        else if (opts.alignY === 'bottom')
            dimsTxt.y += dimsRect.h - hTexte - opts.padding

        if (opts.alignX === 'center')
            dimsTxt.x += dimsRect.w / 2 - wTexte / 2;
        else if (opts.alignX === 'left')
            dimsTxt.x += opts.padding
        else if (opts.alignX === 'right')
            dimsTxt.x += dimsRect.w - wTexte - opts.padding

        // Rendu
        this.ctx.fillText(texte, dimsTxt.x, dimsTxt.y);

        return true;

    }

    public image(url: string, dimsInit: Mesures.TDimsSaisie = {}, opts: { radius?: number | 'cercle' } = {}): boolean {

        const dims = Mesures.dims(dimsInit, this);
        if (dims === false) return false;

        if (!(url in this.root.cacheImages))
            this.root.cacheImages[url] = new Promise((resolve) => {

                // https://stackoverflow.com/questions/19585999/canvas-drawimage-with-round-corners
                const img = new Image;
                img.onload = () => resolve(img);
                img.src = url;


            });

        this.root.cacheImages[url].then((image) => {

            this.ctx.save();

            if (opts.radius === 'cercle') {
                this.ctx.beginPath();
                this.ctx.arc(dims.x + dims.w / 2, dims.y + dims.h / 2, dims.w / 2, 0, 2 * Math.PI);
                this.ctx.clip();
            }

            this.ctx.drawImage(image, dims.x, dims.y, dims.w, dims.h);

            this.ctx.restore();

        })

        return true;

    }

    /*----------------------------------
    - RENDU
    ----------------------------------*/
    public render(): void {

        logs && console.log(`[calque][${this.nom}] Render`);

        super.render();

        if (this.root.options.debug) {

            const bordureDbg = 'hsla(' + this.couleurDebug + ', 100%)'
            const fondDbg = 'hsla(' + this.couleurDebug + ', 10%)'

            if (this.options.border === undefined)
                this.options.border = { all: { couleur: bordureDbg, epaisseur: 1 } }

            if (this.options.background === undefined)
                this.options.background = fondDbg;

            this.texte(this.nom + ': ' + this.w + 'x' + this.h, {
                x: 0, y: 0, 
                position: 'absolute',
                alignX: 'left',
                alignY: 'top',
            }, {
                color: '#fff',
                background: bordureDbg
            });
        }

        if (this.options.background !== undefined || this.options.border !== undefined)
            this.rectangle({
                x: 0,
                y: 0,
                w: '100%',
                h: '100%',
                position: 'absolute'
            }, {
                background: this.options.background && this.color(this.options.background),
                border: this.options.border
            });
    }

}