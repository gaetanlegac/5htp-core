/*----------------------------------
- DEPENDANCES
----------------------------------*/

/*----------------------------------
- CLASS
----------------------------------*/
export class SqlError extends Error {

    public constructor( 
        public original: Error, 
        public query: string 
    ) {
        super(original.message);

        this.name = original.name;
        this.message = original.message;
        this.stack = original.stack;
    }
}