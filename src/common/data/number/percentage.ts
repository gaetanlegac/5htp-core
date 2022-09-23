export const percentage = (value: number, reference: number) => reference === 0
    ? 0
    : value / reference * 100

export const variation = (value: number, reference: number) => reference === 0
    ? 100
    : (value - reference) / reference * 100

export type TVariation = {
    txt: string | undefined,
    color: string,
}

export const variationStr = (value: number, reference: number, lowerIsBetter: boolean = false): TVariation => {
    const pc = variation(value, reference);
    const pcStr = pc.toFixed(2);
    return {
        txt: ((pc > 0) ? '+' + pcStr : pcStr) + '%',
        color: (lowerIsBetter ? pc > 0 : pc < 0) ? 'ea3943' : '16c784'
    }
}