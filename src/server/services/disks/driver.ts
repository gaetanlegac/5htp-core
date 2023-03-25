/*----------------------------------
- DEPS
----------------------------------*/

// Core
import Application, { Service } from '@server/app';

/*----------------------------------
- CONFIG
----------------------------------*/

export type THooks = {

}

/*----------------------------------
- TYPE
----------------------------------*/

export type TDrivercnfig = {

    debug: boolean,

    rootDir: string,
    buckets: {
        [id: string]: string
    }
}

export type SourceFile = { 
    name: string, 
    path: string, 
    modified: number, 
    parentFolder: string,
    source: string 
}

export type TOutputFileOptions = {
    encoding: string
}

/*----------------------------------
- CLASS
----------------------------------*/

export default abstract class FsDriver<
    Config extends TDrivercnfig = TDrivercnfig,
    TBucketName = keyof Config["buckets"]
> {

    public constructor( public app: Application, public config: Config ) {

    }

    public abstract mount(): Promise<void>;
    
    public abstract readDir( bucketName: TBucketName, dirname?: string ): Promise<SourceFile[]>;

    public abstract readFile( bucketName: TBucketName, filename: string ): Promise<string>;

    public abstract createReadStream( bucketName: TBucketName, filename: string );

    public abstract exists( bucketName: TBucketName, filename: string ): Promise<boolean>;

    public abstract move( bucketName: TBucketName, source: string, destination: string, options: { overwrite?: boolean }): Promise<void>;

    public abstract outputFile( bucketName: TBucketName, filename: string, content: string, encoding: TOutputFileOptions ): Promise<{
        path: string
    }>;

    public abstract readJSON( bucketName: TBucketName, filename: string ): Promise<any>;

    public abstract delete( bucketName: TBucketName, filename: string ): Promise<boolean>;

    public abstract unmount(): Promise<void>;

}