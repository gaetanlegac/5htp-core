// Normalize file between browser and nodejs side
export default class FileToUpload {

    public name: string;
    public size: number;
    public type: string;

    public data: File;

    // Retrieved on backend only
    public md5?: string;
    public ext?: string;

    public constructor(opts: {
        name: string,
        size: number,
        type: string,

        data: File,
        
        md5?: string,
        ext?: string,
    }) {

        this.name = opts.name;
        this.size = opts.size;
        this.type = opts.type;

        this.data = opts.data;

        this.md5 = opts.md5;
        this.ext = opts.ext;
    }
}