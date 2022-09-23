/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import React from 'react';
import { ComponentChild, RefObject } from 'preact';
import deepmerge from 'deepmerge';
import dayjs from 'dayjs';
import { 
    Chart, ChartConfiguration, ChartType, PointElement,
    Filler,
    LinearScale, CategoryScale, Tooltip
} from 'chart.js';
Chart.register(Filler, LinearScale, CategoryScale, Tooltip, PointElement);

// Libs générales
import Format from '@common/data/number/format';
import { ucfirst } from '@common/data/chaines';
import couleursDefaut from './couleurs';

/*----------------------------------
- TYPES
----------------------------------*/

export type DonneesGraph = {
    [cle: string]: any | undefined
}

type FonctionDonnee<TDonnee> = (donnees: TDonnee) => string

type TInfosColonne = {
    label: string,
    format?: (valeur: number) => string,
    icone?: TIcons | ComponentChild,
    color?: string, // Hexadecimal
}

type TInfosColonneCompletes = {
    id: string,
    label: string,
    format: (valeur: number) => string,
    icone?: TIcons | ComponentChild,
    color: string
}

export type Props<TDonnee extends DonneesGraph, TTypeChartJs extends ChartType> = {

    // Options chartjs propres au type de graphique
    options?: ChartConfiguration<TTypeChartJs>["options"],
    optionsDatasets?: (dataset: TDataset, canvasRef: RefObject<Chart>) => Omit<
        ChartConfiguration<TTypeChartJs>["data"]["datasets"][number],
        'label'|'data'
    >,

    // Données
    donnees: (TDonnee & { time: number })[],
    whitelist?: string[],
    colonnes: { [donnee: string]: TInfosColonne },
    valeurs?: { [donnee: string]: string | FonctionDonnee<TDonnee> },

    // Affichage
    footer?: FonctionDonnee<TDonnee>,
    className?: string,
    style?: { [cle: string]: any },
    details?: boolean,
    placeholder?: ComponentChild,

    // Design
    couleurs?: string[],
    opacite?: string, // Format hex
    degrade?: boolean,
    fixe?: boolean,
    epaisseur?: number,
    dark?: boolean,

    // Events
    onHover?: (donneesSurvol: TDonnee | null) => void
}

/*----------------------------------
- TYPES CHART.JS
----------------------------------*/
export type TDataset = {
    id: string,
    colonne: TInfosColonneCompletes,
    vals: number[]
}

/*----------------------------------
- OUTILS
----------------------------------*/
export const getColonne = (nom: string, colonnes: { [donnee: string]: TInfosColonne }): TInfosColonneCompletes => {

    let colonne = colonnes[nom]

    // Création si inexistant
    let iCol: number;
    const nomCols = Object.keys(colonnes);
    if (colonne === undefined) {
        iCol = nomCols.length;
        colonne = colonnes[nom] = {
            label: ucfirst(nom)
        }
    } else
        iCol = nomCols.indexOf(nom);

    // Completion
    if (colonne.id === undefined)
        colonne.id = nom

    if (colonne.color === undefined)
        colonne.color = couleursDefaut[iCol]

    if (colonne.format === undefined)
        colonne.format = Format.number;

    return colonne;
}

/*----------------------------------
- COMPOSANT
----------------------------------*/
export default function <TDonnee extends DonneesGraph, TTypeChartJs extends ChartType>({

    // Options chartjs
    type: Type,
    options, 
    optionsDatasets,

    // Données
    donnees, whitelist,
    colonnes, valeurs = {},
    placeholder,

    // Affichage
    footer = undefined, className, style, details = false,

    // Design
    fixe = false,
    dark = false,

    // Evenements
    onHover
}: Props<TDonnee, TTypeChartJs> & {
    type: typeof BarElement | typeof LineElement
}) {

    const refInstance = React.useRef<Chart>(null);
    const refCanvas = React.useRef<HTMLCanvasElement>(null);
    const refContainer = React.useRef<HTMLDivElement>(null);

    let overlay: ComponentChild | undefined;

    if (!className)
        className = "";

    if (!donnees || donnees.length === 0) {
        
        const now = Date.now();
        donnees = [];
        for (let i = 0; i < 10; i++) {
            const dummySet = { time: now + (10 - i) * 10000 };
            for (const nom in colonnes) {
                dummySet[ nom ] = Math.random() * 100;
            }
            donnees.push(dummySet as TDonnee);
        }

        overlay = (
            <div class="overlay col al-center txtImportant">
                {placeholder || 'No data'}
            </div>
        );
            
    }

    /*----------------------------------
    - GÉNÈRE DATASET CHART.JS
    ----------------------------------*/
    let labelsDates: string[] = [];
    let datasets: { [nom: string]: TDataset } = {};
    let couleurs: string[] = []

    for (const { time, ...valeurs } of donnees) {

        // X
        labelsDates.push(dayjs(time).format('DD/MM HH:mm'));

        // Y
        for (const nom in colonnes) {

            if (whitelist !== undefined && !whitelist.includes(nom))
                continue;

            const colonne = getColonne(nom, colonnes);
            const valeur = valeurs[nom] || 0

            // Initialisation
            if (!(nom in datasets)) {

                datasets[nom] = {
                    id: nom,
                    colonne,
                    vals: [valeur]
                };

                couleurs.push(colonne.color);
                
            } else
                datasets[nom]['vals'].push(valeur);

        }
    };

    /*----------------------------------
    - CONFIGURATION DU GRAPHIQUE
    ----------------------------------*/

    className = "chart" + ' ' + className;

    const configure = () => {

        if (refCanvas.current === null)
            throw new Error("refCanvas not initialized");

        const css = getComputedStyle(refCanvas.current);
        const cTxt = css.getPropertyValue("--cTxtBase");
        const cLine = css.getPropertyValue("--cLine");

        details = false;

        const options: ChartConfiguration = {

            // Mise à l'échelle
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1,

            // Axes
            scales: {
                y: {
                    position: 'right',
                    ticks: {
                        display: details,
                        padding: 10,
                        color: cTxt,
                        count: 5,
                        //beginAtZero: true,
                        //min: 0
                    },
                    grid: {
                        display: false,
                        color: cLine,
                        lineWidth: 2,
                        borderDash: [5],
                        // Corrige le problème de padding à gauche
                        // https://github.com/chartjs/Chart.js/issues/2872
                        tickMarkLength: 0,
                        drawBorder: false // Vire la barre à gauche
                    }
                },
                x: {
                    ticks: {
                        display: details,
                        padding: 10,
                        color: cTxt,
                        //beginAtZero: true,
                    },
                    grid: {
                        display: false,
                        drawTicks: details,
                    }
                },
            },

            // Layout
            layout: {
                padding: {
                    left: details ? 0 : 0,
                    right: 0,
                    top: 10, // Sinon, ligne coupée
                    bottom: 10, // Sinon, ligne coupée
                }
            },

            // Intéractions
            animation: true,
            hover: {
                intersect: false,
                mode: 'index',
                onHover: (e, colonne) => {

                    if (onHover !== undefined) {

                        if (colonne.length === 0)
                            onHover(null); // Aucun élement survolé
                        else {

                            const { time, ...donneesSurvol } = donnees[colonne[0]._index];

                            onHover(donneesSurvol);
                        }
                    }
                }
            },

            plugins: {
                legend: {
                    display: false
                },

                // Tooltips
                tooltip: {
                    enabled: true,//!fixe,
                    callbacks: {
                        label: (contexte) => {

                            let total: number = 0
                            for (const val of contexte.dataset.data)
                                if (typeof val === 'number')
                                    total += val;

                            const pc = total === 0 
                                ? 0 
                                : (contexte.raw / total * 100).toFixed(2);

                            return ' ' + contexte.dataset.label + ': ' + contexte.raw + ' (' + pc + '%)';
                        },
                        /*labelColor: (truc) => {
    
                            if (truc.datasetIndex === undefined)
                                return 'Index dataset indéfini';
                            if (truc.index === undefined)
                                return 'Index indéfini';
    
                            const dataset = Object.values(datasets)[truc.datasetIndex];
    
                            return {
                                borderColor: '#' + dataset.colonne.color,
                                backgroundColor: '#' + dataset.colonne.color
                            }
                        },
                        footer: (truc) => {
                            if (footer) {
    
                                if (truc[0].index === undefined)
                                    return 'Index indéfini';
    
                                const donneesY = Object.values(donnees)[truc[0].index];
                                return footer(donneesY);
                            } else
                                return '';
                        }*/
                    },
                },
            },

            // Autres composants
            elements: {
                point: {
                    radius: 0,
                },
                line: {
                    tension: 0.4
                }
            },

        }
        
        const data = {
            labels: labelsDates,

            datasets: Object.values(datasets).map((dataset: TDataset) => {

                console.log("dataset", dataset);
                

                // From variable name
                if (dataset.colonne.color && dataset.colonne.color[0] !== '#')
                    dataset.colonne.color = css.getPropertyValue( dataset.colonne.color );
                    
                // Default color
                if (!dataset.colonne.color) 
                    dataset.colonne.color = css.getPropertyValue('--c1');

                return {
                    label: dataset.colonne.label,
                    data: dataset.vals,

                    ...(optionsDatasets ? optionsDatasets(dataset, refInstance) : {})
                }
            })
        }

        return { options, data };
    }

    /*----------------------------------
    - RENDER
    ----------------------------------*/

    // First render: Create chart instance
    React.useEffect(() => {
        if (refInstance.current === null) {

            const config = configure();

            refInstance.current = new Chart(refCanvas.current?.getContext('2d'), {
                type: Type.id,
                options: deepmerge(config.options, options),
                data: config.data
            });

        }

        return () => refInstance.current && refInstance.current.destroy();
    }, []);

    // For each data / configuration change
    React.useEffect(() => {
        if (refInstance.current !== null) {
            
            const config = configure();

            refInstance.current.options = deepmerge( config.options, options);
            refInstance.current.data = config.data;
            
            refInstance.current.update();

        }
    }, [donnees, whitelist]);

    return (
        <div ref={refContainer} className={className} style={style}>
            {overlay}
            <canvas ref={refCanvas} />
        </div>
    )
}
