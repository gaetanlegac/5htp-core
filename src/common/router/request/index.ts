/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Core
import Response from '../response';

/*----------------------------------
- TYPES
----------------------------------*/


/*----------------------------------
- CONTEXT
----------------------------------*/
export default abstract class BaseRequest {

    // Permet d'accèder à l'instance complète via spread
    public request: this = this;
    public url!: string;
    public host!: string;

    public data: TObjetDonnees = {};
    public abstract response?: Response;
    public user: User | null = null;

    public constructor(
        public path: string,
    ) {

    }
}