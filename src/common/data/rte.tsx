import mediumDraftExporter from '@client/components/Rte/exporter';
import { convertFromRaw } from 'draft-js';
export { convertFromRaw } from 'draft-js';

export const convertir = (
    state: any,
    amp?: boolean
) => mediumDraftExporter(convertFromRaw( state ), amp);

export const versHtml = (state: any): string => convertir(state);
export const versAmp = (state: any): string => convertir(state, true);
