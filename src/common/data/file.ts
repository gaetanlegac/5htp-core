import type Sharp from 'sharp';

export default class NormalisedFile {

    public name: string;
    public size: number;
    public type: string;
    public data: Buffer;

    public image?: Sharp;

    public constructor(opts: {
        name: string,
        size: number,
        type: string,
        data: Buffer,
    }) {

        this.name = opts.name;
        this.size = opts.size;
        this.type = opts.type;
        this.data = opts.data;

    }
}