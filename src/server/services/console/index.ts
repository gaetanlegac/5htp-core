/*----------------------------------
- DEPENDANCES
----------------------------------*/

// Npm
import { Logger, ILogObject } from "tslog";
import { format as formatSql } from 'sql-formatter';
import highlight from 'cli-highlight';

// Core libs
import app, { $ } from '@server/app';
import logToHTML from './html';
import context from '@server/context';
import BugReporter from "./bugReporter";

/*----------------------------------
- SERVICE CONFIG
----------------------------------*/

export type TReportTransport = keyof typeof $

export type ConsoleConfig = {
  
}

declare global {
    namespace Core {
        interface EmailTransporters { }
        namespace Config {
            interface Services {
                console: ConsoleConfig
            }
        }
    }
}

/*----------------------------------
- TYPES
----------------------------------*/

export type ChannelInfos = {
    channelType: 'cron' | 'master' | 'request' | 'socket',
    channelId?: string,
}

export type TGuestLogs = {
    id: string,
    meet: Date,
    activity: Date,

    device: string,
    ip: string,
    user?: string
}   

export type TRequestLogs = {

    id: string,
    date: Date,

    method: string,
    url: string,
    data: TObjetDonnees,

    ip: string,
    user?: string,
    clientId: string,

    statusCode: number,
    time: number
}

export type TQueryLogs = ChannelInfos & {
    date: Date, 
    query: string,
    time: number,
}

export type TLog = ChannelInfos & {

}

/*----------------------------------
- CONST
----------------------------------*/

const logFields = [
    'date',
    'logLevelId',
    'logLevel',

    'isConstructor',
    'methodName',
    'functionName',
    'typeName',

    'filePath',
    'lineNumber',
    'argumentsArray',
    'stack',
]

/*----------------------------------
- LOGGER
----------------------------------*/
export class Console {

    // Services
    public logger!: Logger;
    public bugReport = new BugReporter(this);

    // Buffers
    public logs: TLog[] = [];
    public clients: TGuestLogs[] = [];
    public requests: TRequestLogs[] = [];
    public sqlQueries: TQueryLogs[] = [];

    /*----------------------------------
   - INSTANCE
   ----------------------------------*/
    public load() {

        this.logger = new Logger({
            overwriteConsole: true,
            //type: app.env.profile === 'dev' ? 'pretty' : 'hidden',
            requestId: (): string => {
                const { channelType, channelId } = this.getChannel();
                return channelId === undefined ? channelType : channelType + ':' + channelId;
            },
            displayRequestId: false,
        });

        this.logger.attachTransport({
            silly: this.log.bind(this),
            debug: this.log.bind(this),
            trace: this.log.bind(this),
            info: this.log.bind(this),
            warn: this.log.bind(this),
            error: this.log.bind(this),
            fatal: this.log.bind(this),
        }, app.env.level);

        setInterval(() => this.clean(), 60000);

        return this.logger;
    }

    private clean() {
        // Clean memory from old logs
    }

    /*----------------------------------
    - LOGGING
    ----------------------------------*/

    public getChannel() {
        return context.getStore() || {
            channelType: 'master',
            channelId: undefined
        }
    }

    private log(entry: ILogObject) {

        const [channelType, channelId] = entry.requestId?.split(':') || ['master'];
        if (entry.requestId === 'admin')
            return;

        // Only keep data required by printPrettyLog
        // https://github.com/fullstack-build/tslog/blob/4f045d61333230bd0f9db0e0d59cb1e81fc03aa6/src/LoggerWithoutCallSite.ts#L509
        const miniLog: TObjetDonnees = { channelType, channelId };
        for (const k of logFields)
            miniLog[k] = entry[k];

        // remove webpack path
        if (miniLog.filePath !== undefined) {

            const appPrefix = '/webpack:/' + app.pkg.name + '/src/';
            const appPrefixIndex = miniLog.filePath.indexOf(appPrefix);

            const corePrefix = '/webpack:/' + app.pkg.name + '/node_modules/5htp-core/src/';
            const corePrefixIndex = miniLog.filePath.indexOf(corePrefix);

            if (appPrefixIndex !== -1)
                miniLog.filePath = '@/' + miniLog.filePath.substring(appPrefixIndex + appPrefix.length);
            else if (corePrefixIndex !== -1)
                miniLog.filePath = '@' + miniLog.filePath.substring(corePrefixIndex + corePrefix.length);

        }

        this.logs.push(miniLog as TLog);
    }

    public client(client: TGuestLogs) {
        this.clients.push(client);
    }

    public request(request: TRequestLogs) {

        if (request.id === 'admin')
            return;

        this.requests.push( request );
    }

    /*----------------------------------
    - READ
    ----------------------------------*/

    public getClients() {
        return $.sql`
            SELECT * FROM logs.Clients
            ORDER BY activity DESC
            LIMIT 100
        `.all();
    }

    public async getClient(clientId: string) {
        return (
            this.clients.find(c => c.id === clientId)
            ||
            await $.sql`
                SELECT * FROM logs.Clients
                WHERE id = ${clientId}
            `.first()
        )
    }

    public getRequests(clientId?: string) {
        return $.sql`
            SELECT * FROM logs.Requests
            ORDER BY date DESC
            LIMIT 100
        `.all();
    }

    public async getRequest(requestId: string) {
        return (
            this.requests.find(r => r.id === requestId)
            ||
            await $.sql`
                SELECT * FROM logs.Requests
                WHERE id = ${requestId}
            `.first()
        )
    }

    public getQueries( channelType: ChannelInfos["channelType"], channelId?: string ) {

        const filters: Partial<TQueryLogs> = { channelType };
        if (channelId !== undefined)
            filters.channelId = channelId;

        return $.sql`
            SELECT * FROM logs.Queries
            WHERE :${filters} 
            ORDER BY date DESC
            LIMIT 100
        `.all();
    }

    public async getLogs( channelType: ChannelInfos["channelType"], channelId?: string ) {

        const filters: Partial<TQueryLogs> = { channelType };
        if (channelId !== undefined)
            filters.channelId = channelId;

        const fromBuffer = this.logs.filter(
            e => e.channelId === channelId && e.channelType === channelType
        ).reverse();
        
        return this.printHtml(fromBuffer);
    }
 
    public printHtml(logs: TLog[], full: boolean = false): string {

        let html = logs.map( log => logToHTML( log, this )).join('\n');

        if (full) {
            const consoleCss = `background: #000; padding: 20px; font-family: 'Fira Mono', 'monospace', 'Monaco'; font-size: 12px; line-height: 20px;`
            html = '<div style="' + consoleCss + '">' + html + '</div>';
        }

        return html;
    }

    public printSql = (requete: string) => highlight(
        formatSql(requete, { indent: ' '.repeat(4) }),
        { language: 'sql', ignoreIllegals: true }
    )

}

/*----------------------------------
- REGISTER SERVICE
----------------------------------*/
app.register('console', Console);
declare global {
    namespace Core {
        interface Services {
            console: Console;
        }
    }
}