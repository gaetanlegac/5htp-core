/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import deepmerge from 'deepmerge';

// Libs métier
import Graphique from '../../';
import Calque, { TOptionsCalque, TOptsLigne, TOptsTexte } from '../../../calque';
import { CalquesAvecOpts } from '../../../workspace';
import Canvas from '../../../canvas';
import Echelle, { multipleLePlusProche } from '../../Echelle';
import { TDimsSaisie } from '../../../mesures';


/*----------------------------------
- TYPES
----------------------------------*/

type TOptionsMarqueur = {
    ligne?: TOptsLigne, 
    texte?: TOptsTexte,
    annotation?: TOptsTexte,
    icone?: TIcons,

    couleur?: string, // Raccourci pour couleur ligne + background texte
    intersect?: number // Valeur de l'axe opposé
}

type TLabel = TOptionsMarqueur & {
    valeur: number,
    label?: string, // Pas spécifié = determination auto via valeur
}

export type TOptionsAxe = TOptionsCalque & {
    marqueurs: TLabel[],
    format: (time: number) => string,
    labels: {
        style: TOptsTexte,
        dims: TDimsSaisie
    },
    grille: TOptsLigne,
    crosshairs: TOptionsMarqueur | false,

    interactions: {
        scroll: boolean,
        curseur: boolean,
    },
}

export type TMarqueur = { pos: number, val: number }

type TModeScroll = 'graph' | 'zoomX' | 'zoomY';

/*----------------------------------
- GRAPHIQUE
----------------------------------*/
export default abstract class Axe<TOptions extends TOptionsAxe = TOptionsAxe> extends Calque<TOptions, Graphique> {

    protected echelle!: Echelle;
    protected graph: Graphique;
    public marqueurs!: TMarqueur[];

    public abstract axe: 'x' | 'y';
    public abstract axeI: 'x' | 'y';

    protected axeInverse?: Axe;

    // Etat
    public posCurseur: number | false = false;
    public posCurseurPrecedent: number | false = false;
    public modeScroll: TModeScroll | false = false;

    public constructor(
        options: Partial<TOptionsAxe>,
        root: Canvas, parent: Graphique, enfants?: CalquesAvecOpts
    ) {

        super(options, root, parent, enfants);

        this.graph = this.root.enfants.bougies;

    }

    /*----------------------------------
    - INIT
    ----------------------------------*/
    protected getConfigDefaut(): Partial<TOptionsAxe> {
        
        return deepmerge( super.getConfigDefaut(), {
            marqueurs: [],
            labels: {
                style: {
                    fontSize: 12,
                    // Si remplissage label, texte blanc
                    color: '--cTxtDesc',
                    radius: 10,
                    padding: 10,
                    //background: '--cFond',
                }
            },
            grille: {
                epaisseur: 1,
                couleur: '--cLigne1'
            },
            crosshairs: {
                ligne: {
                    epaisseur: 1,
                    color: '--cLigne1',
                },
                texte: {
                    background: '--cBgControl',
                    color: '--cTxtBase'
                }
            },

            interactions: {
                scroll: false,
                curseur: false,
            },
        });
    }

    /*----------------------------------
    - EVENTS
    ----------------------------------*/
    protected initEvents() {

        this.root.setEvent('mousemove', (e: MouseEvent) => {

            this.majPositionCurseur(e)

            if (this.posCurseur === false)
                return;

            // posCurseurPrecedent pas initialisé = ps de valeur de référence = pas de delta
            if (this.posCurseurPrecedent === false) {
                this.posCurseurPrecedent = this.posCurseur;
                this.root.update();
                return;
            }

            const delta = this.posCurseur - this.posCurseurPrecedent;

            this.posCurseurPrecedent = this.posCurseur;

            this.scroller(delta);

            this.root.update();
        })

        this.root.setEvent('mousedown', (e: MouseEvent) => {
            this.mouseDown(e);
        });

        this.root.setEvent('mouseleave', (e: MouseEvent) => {
            this.posCurseur = false;

            this.root.update();
        });

        this.root.setEvent('wheel', (e: WheelEvent) => {

            const delta = this.axe === 'x' ? e.deltaX : e.deltaY;
            this.modeScroll = 'graph';
            this.scroller(delta);
            this.modeScroll = false;

            this.root.update();

        });

        this.root.setEvent('mouseup', (e: MouseEvent) => {
            this.modeScroll = false;
            this.root.canvas.style.cursor = 'crosshair';
        });

    }

    /*----------------------------------
    - INTERACTIONS
    ----------------------------------*/

    private mouseDown(e: MouseEvent) {
        const x = e.clientX - this.root.x;
        const y = e.clientY - this.root.y;

        this.posCurseurPrecedent = false;

        // Zoom axe X
        /*if (y > this.h) {

            this.modeScroll = 'zoomX';
            this.root.canvas.style.cursor = 'col-resize';

        // Zom axe Y
        } else if (x > this.w) {

            this.modeScroll = 'zoomY';
            this.root.canvas.style.cursor = 'row-resize';

        // Scroll
        } else {*/
            this.modeScroll = 'graph';
            this.root.canvas.style.cursor = 'grab';
        //}
    }

    private scroller(delta: number) {

        if (this.modeScroll === false) return;

        if (this.axe === 'x') {

            const deltaTemps = delta * this.echelle.densite;

            if (this.modeScroll === 'graph') {

                const nouveauDecallage = this.echelle.calc.decallage - deltaTemps;

                if (
                    nouveauDecallage <= this.echelle.calc.decallageMax
                    &&
                    nouveauDecallage >= this.echelle.calc.decallageMin
                )
                    this.echelle.calc.decallage = nouveauDecallage;

            } else if (this.modeScroll === 'zoomX') {
                this.echelle.calc.zoom += deltaTemps;
            }


        } else {

            if (this.modeScroll === 'zoomY') {

                const dollarsParPx = (this.echelle.max - this.echelle.min) / this.echelle.espace;
                const deltaDollars = delta * dollarsParPx;

                this.echelle.calc.zoom += deltaDollars;
            }

        }
    }

    public abstract majPositionCurseur(e: MouseEvent): void;

    /*----------------------------------
    - ELEMENTS
    ----------------------------------*/
    public marqueur(label: number | string, pos: number, opts: TOptionsMarqueur = {}) {

        const axe = this.axe;
        const axeI = this.axeI;

        if (opts.couleur) 
            opts.ligne = { 
                ...(opts.ligne || {}), 
                couleur: opts.couleur 
            }

        if (opts.ligne !== undefined) {

            opts.ligne = {
                style: 'dashed',
                epaisseur: 1,
                couleur: opts.couleur || '--cLigne2',
                ...opts.ligne
            }

            this.ligne(
                axe === 'x' ? { 
                    x: pos, y: 0, w: 0, h: '100%'
                } : { 
                    y: pos, x: 0, h: 0, w: '100%'
                },
                opts.ligne
            );

            if (opts.intersect !== undefined && this.axeInverse !== undefined) {
                const posIntersect = this.axeInverse.echelle.versPixels(opts.intersect);
                this.cercle({ [axe]: pos, [axeI]: posIntersect, w: 3, h: 3 }, {
                    background: opts.ligne.background
                });
            }
        }

        if (opts.annotation !== undefined) {

            this.texte( opts.annotation.texte, { 
                x: pos,
                y: 10,
            }, {
                color: opts.ligne?.couleur || opts.texte?.color,
                padding: 10,
            });

        }

        opts.texte = {
            ...this.options.labels.style, 
            ...(opts.texte || {})
        }

        if (opts.icone === undefined) {
            if (opts.couleur) {
                opts.texte.background = opts.couleur;
                opts.texte.color = '#fff';
            }
        } else {
            if (opts.couleur) {
                opts.texte.color = opts.couleur;
                this.rectangle({ 
                    x: pos, 
                    y2: '100%', 
                    w: 40, h: 32, 
                    margin: { bottom: 40 },
                    alignX: 'middle'
                }, { 
                    background: opts.couleur,
                    radius: 5
                });
            }

            this.image(opts.icone, {
                x: pos,
                y2: '100%',
                w: 16, h: 16,
                margin: { bottom: 48 },
                alignX: 'middle'
            });
        }

        /*if (opts.texte.background)
            opts.texte.color = '#fff';*/

        this.texte(
            typeof label === 'string' ? label : this.options.format(label),
            { ...this.options.labels.dims, [axe]: pos },
            opts.texte
        );
    }

    protected abstract curseur(): void;

    public labels() {

        for (const { valeur, label, ...optsLabel } of this.options.marqueurs) {

            if (valeur >= this.echelle.min && valeur <= this.echelle.max)
                this.marqueur(label || valeur, this.echelle.versPixels(valeur), optsLabel);
        }

    }

    /*----------------------------------
    - ACTIONS
    ----------------------------------*/
    public update(): boolean {

        super.update();

        // Création des labels
        this.marqueurs = [];
        const debutGrille = multipleLePlusProche(this.echelle.min, this.echelle.pas);
        const finGrille = multipleLePlusProche(this.echelle.max, this.echelle.pas);
        for (let val = debutGrille; val <= finGrille; val += this.echelle.pas) {

            const pos = this.echelle.versPixels(val);
            this.marqueurs.push({ val, pos });
        }

        return true;

    }

    public render() {
        super.render(); 

        this.labels();

        if (this.options.interactions.curseur === true && this.posCurseur !== false)
            this.curseur();
    }
}