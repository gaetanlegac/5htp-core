/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { Server as WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { IncomingMessage } from 'http';
import cookie from 'cookie';

// Core
import SocketScope from './scope';
import app from '@server/app';

// Services
import '@server/services/http';

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type SocketServiceConfig = {
    port: number
}

declare global {
    namespace Core {
        namespace Config {
            interface Services {
                socket: SocketServiceConfig
            }
        }
    }
}

/*----------------------------------
- TYPES
----------------------------------*/

export type { WebSocket, default as SocketScope } from './scope';

/*----------------------------------
- MANAGER
----------------------------------*/
export class WebSocketCommander {

    public ws!: WebSocketServer;

    public scopes: {[path: string]: SocketScope} = {}

    public constructor() {
        app.on('cleanup', async () => {
            this.closeAll();
        });
    }


    public loading: Promise<void> | undefined = undefined;
    public async load() {

        console.info(`Loading socket commander`);
        this.ws = new WebSocketServer({ server: app.services.http.http })
            .on('connection', (socket: WebSocket, req: IncomingMessage) => {

                // Resolve scope
                const path = req.url;
                let scope: SocketScope | undefined;
                for (const scopePath in this.scopes)
                    if (path === scopePath) {
                        scope = this.scopes[path];
                        break;
                    }

                if (scope === undefined) {
                    console.warn("Unknown scope path:", path);
                    socket.close();
                    return;
                }

                socket.id = uuidv4();

                // req.headers['x-forwarded-for'] = IP réelle du client quand on passe par un porxy apache
                const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                if (typeof ip !== 'string') {
                    console.warn("Invalid IP address", ip);
                    socket.close();
                    return;
                }
                socket.ip = ip;

                // Cookies
                if (req.headers.cookie) {
                    req.cookies = cookie.parse(req.headers.cookie);
                }

                scope.newClient(socket, req);

            })

        console.info(`Socket commander bound to http server.`);
    }

    public open(path: string) {

        if (!(path in this.scopes)) {

            console.info("Registering socket scope:", path);
            this.scopes[path] = new SocketScope(path);

        }

        return this.scopes[path];

    }


    public send(scopename: string, usernames: string | string[], command: string, data?: any) {

        const scope = this.scopes[scopename];
        if (scope === undefined)
            return console.warn("No scope with name", scopename);

        scope.send(usernames, command, data);

    }

    public disconnect( usernames: string | string[], reason: string, data?: any ) {
        console.log(`Disconnecting ${usernames} from all scopes`);
        for (const path in this.scopes)
            this.scopes[path].disconnect( usernames, reason );
    }

    public closeAll() {
        console.log("Closing All connections");
        for (const path in this.scopes)
            this.scopes[path].close();
    }
}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('socket', WebSocketCommander);
declare global {
    namespace Core {
        interface Services {
            socket: WebSocketCommander;
        }
    }
}