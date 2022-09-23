/*----------------------------------
- DÉPENDANCES
----------------------------------*/
import Calque from '../calque';

/*----------------------------------
- TYPES
----------------------------------*/
type TStyleLigne = 'solid' | 'dashed' | 'dotted'

export type TConfig = {
    style?: TStyleLigne,
    epaisseur?: number,
    couleur?: string
}

/*----------------------------------
- ELEMENT
----------------------------------*/
export default class Ligne extends Calque<TConfig> {
    public render() {

        super.render();

        this.ctx.strokeStyle = this.config.couleur || 'solid';
        this.ctx.lineWidth = this.config.epaisseur || 1;

        switch (this.config.style || 'solid') {
            case 'solid': this.ctx.setLineDash([]); break;
            case 'dashed': this.ctx.setLineDash([5, 10]); break;
            case 'dotted': this.ctx.setLineDash([1, 1]); break;
        }

        this.ctx.beginPath();
        this.ctx.moveTo(this.x, this.y);
        this.ctx.lineTo(this.x + this.w, this.y + this.h);
        this.ctx.closePath();

        this.ctx.stroke();

    }
}