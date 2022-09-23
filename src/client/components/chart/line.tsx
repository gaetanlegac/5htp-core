import React from 'react';
import Graphique, { Props, DonneesGraph } from './base';
import { Chart, LineElement, LineController } from 'chart.js'
Chart.register(LineElement, LineController);

export type { Props, DonneesGraph } from './base';
export { getColonne } from './base';

type TTypeChartJs = "line"

/*let draw = LineController.prototype.draw;
LineController.prototype.draw = function() {
  let chart = this.chart;
  let ctx = chart.ctx;
  let _stroke = ctx.stroke;
  ctx.stroke = function() {
    ctx.save();
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    _stroke.apply(this, arguments);
    ctx.restore();
  };
  draw.apply(this, arguments);
  ctx.stroke = _stroke;
};*/

export default <TDonnee extends DonneesGraph>({
    opacite = '00', 
    degrade = true, 
    epaisseur = 4,
    ...props
}: Props<TDonnee, TTypeChartJs>) => (
    <Graphique<TDonnee, TTypeChartJs> type={LineElement} {...props}
        options={{
            
        }}
        optionsDatasets={(dataset, chartRef) => {

            const couleur: string = /*'#' +*/ dataset.colonne.color;
            let fill: CanvasGradient | undefined;
            if (degrade && chartRef.current) {

                const ctx = chartRef.current.canvas.getContext("2d")
                const chartArea  = chartRef.current.chartArea;
                if (ctx !== null) {

                    fill = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    fill.addColorStop(0, couleur + '33');
                    fill.addColorStop(1, couleur + '00');
                }
            }
            
            return {
                // Always under the line
                fill: /*fill !== undefined ? 'start' :*/ false,
                borderColor: couleur,
                backgroundColor: fill,
                pointBackgroundColor: 'white',
                borderWidth: epaisseur,
            }
        }
    } 
    />
)