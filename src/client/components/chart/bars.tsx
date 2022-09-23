import React from 'react';
import Graphique, { Props, DonneesGraph } from './base';
import { Chart, BarElement, BarController } from 'chart.js'
Chart.register(BarElement, BarController);

export type { Props, DonneesGraph } from './base';
export { getColonne } from './base';

type TTypeChartJs = "bar"

export default <TDonnee extends DonneesGraph> ({
    epaisseur = 6,
    ...props
}: Props<TDonnee, TTypeChartJs>) => (
    <Graphique<TDonnee, TTypeChartJs> type={BarElement} {...props}
        options={{
            scales: {
                y: {
                    //stacked: true,
                },
                x: {
                    stacked: true,
           
                },
            }
        }} 
        optionsDatasets={(dataset) => ({
            base: 0,
            backgroundColor: dataset.colonne.color || dataset.vals.map(v => v < 0 ? '#ff63a2' : '#16f7e8'),
            borderWidth: 0,
            barThickness: epaisseur,
            borderRadius: 5,
            minBarLength: 10,

            // Arrondi bottom
            borderSkipped: false,

            
        })} 
    />
)